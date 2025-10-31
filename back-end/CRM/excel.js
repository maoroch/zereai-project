import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { supabase } from '../services/supabaseService.js';
import fs from 'fs';

const router = express.Router();

// 🔄 Улучшенная конфигурация multer с обработкой конкурентных загрузок
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.match(/\.(xlsx|xls)$/)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // только один файл одновременно
  }
});

// 🔄 Мидлвара для ограничения конкурентных запросов
const requestQueue = new Map();
const MAX_CONCURRENT_UPLOADS = 2;

async function acquireLock(requestId) {
  return new Promise((resolve) => {
    const checkQueue = () => {
      const activeUploads = Array.from(requestQueue.values()).filter(
        req => req.status === 'processing'
      ).length;
      
      if (activeUploads < MAX_CONCURRENT_UPLOADS) {
        requestQueue.set(requestId, { status: 'processing', startTime: Date.now() });
        resolve(true);
      } else {
        console.log(`📊 Upload queue: ${activeUploads}/${MAX_CONCURRENT_UPLOADS} active, waiting...`);
        setTimeout(checkQueue, 1000);
      }
    };
    checkQueue();
  });
}

function releaseLock(requestId) {
  requestQueue.delete(requestId);
}

// 🔄 Утилита для повторных попыток операций с БД
async function retryDatabaseOperation(operation, operationName, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      console.warn(`⚠️ ${operationName} failed on attempt ${attempt}:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`${operationName} failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Экспоненциальная задержка
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ⚠️ Колонку ИИН игнорируем полностью, не сохраняем, не обрабатываем
function sanitizeHeaders(headers) {
  const iinPatterns = [
    'иин', 'iin', 'инн', 'индивидуальный', 'identification',
    '№иин', '№iin', 'иин№', 'iin№'
  ];
  
  const sanitizedHeaders = headers.map(header => {
    if (!header) return header;
    
    const headerLower = header.toLowerCase().trim();
    
    // Проверяем, содержит ли заголовок ИИН
    const isIinColumn = iinPatterns.some(pattern => headerLower.includes(pattern));
    
    if (isIinColumn) {
      console.log(`🚫 IIN column detected and ignored: "${header}"`);
      return null; // Помечаем колонку как игнорируемую
    }
    
    return header;
  });
  
  return sanitizedHeaders;
}

// 🔄 Улучшенный обработчик загрузки файлов
router.post('/upload-groups', upload.single('file'), async (req, res) => {
  const requestId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`📨 File upload received [${requestId}]:`, {
    originalname: req.file?.originalname,
    size: req.file?.size,
    client: req.ip
  });

  try {
    // 🔒 Проверяем лимит одновременных загрузок
    await acquireLock(requestId);

    if (!req.file) {
      releaseLock(requestId);
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded',
        requestId 
      });
    }

    // 🔄 Проверяем существование файла с повторными попытками
    if (!fs.existsSync(req.file.path)) {
      releaseLock(requestId);
      return res.status(400).json({ 
        success: false, 
        error: 'Uploaded file not found',
        requestId 
      });
    }

    let workbook;
    try {
      workbook = await retryDatabaseOperation(
        () => XLSX.readFile(req.file.path),
        'Excel file reading'
      );
    } catch (excelError) {
      console.error('Excel read error:', excelError);
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn('Could not delete temporary file:', unlinkError);
      }
      releaseLock(requestId);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid Excel file',
        requestId 
      });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn('Could not delete temporary file:', unlinkError);
      }
      releaseLock(requestId);
      return res.status(400).json({ 
        success: false, 
        error: 'No sheets found in Excel file',
        requestId 
      });
    }

    const sheet = workbook.Sheets[sheetName];

    const dataArray = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
    console.log(`📊 Found ${dataArray.length} rows in Excel file [${requestId}]`);

    if (!dataArray || dataArray.length <= 2) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn('Could not delete temporary file:', unlinkError);
      }
      releaseLock(requestId);
      return res.status(400).json({ 
        success: false, 
        error: 'No data found in Excel file',
        requestId 
      });
    }

    // Ищем строку с заголовками
    let headerRowIndex = -1;
    let headers = [];

    for (let i = 0; i < Math.min(5, dataArray.length); i++) {
      const row = dataArray[i];
      if (row && row.includes('Группа') && row.includes('ФИО студента')) {
        headerRowIndex = i;
        headers = row.map(h => h ? String(h).trim() : '');
        console.log(`📝 Found headers at row ${i + 1} [${requestId}]:`, headers.slice(0, 5), '...');
        break;
      }
    }

    if (headerRowIndex === -1) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn('Could not delete temporary file:', unlinkError);
      }
      releaseLock(requestId);
      return res.status(400).json({
        success: false,
        error: 'Could not find required columns: "Группа" and "ФИО студента"',
        hint: 'Please ensure your Excel file has columns named "Группа" and "ФИО студента"',
        requestId
      });
    }

    // 🔒 САНИТИЗАЦИЯ ЗАГОЛОВКОВ - ИГНОРИРУЕМ КОЛОНКИ С ИИН
    const sanitizedHeaders = sanitizeHeaders(headers);
    console.log(`🔒 Sanitized headers [${requestId}]:`, sanitizedHeaders.filter(h => h !== null).slice(0, 5), '...');

    // Определяем индексы колонок (только разрешенные колонки)
    const groupIndex = sanitizedHeaders.findIndex(h => h === 'Группа');
    const studentIndex = sanitizedHeaders.findIndex(h => h === 'ФИО студента');
    const paymentIndex = sanitizedHeaders.findIndex(h => h === 'Форма оплаты');
    const phoneIndex = sanitizedHeaders.findIndex(h => h === 'Моб. Телефон');
    const alternativePhoneIndex = sanitizedHeaders.findIndex(h => h === 'Телефон');

    console.log('🔍 Safe column indexes:', {
      groupIndex,
      studentIndex,
      paymentIndex,
      phoneIndex,
      alternativePhoneIndex,
      requestId
    });

    const rows = dataArray.slice(headerRowIndex + 1);
    console.log(`🔄 Processing ${rows.length} data rows [${requestId}]`);

    const groupsMap = {};
    let processedStudents = 0;
    let skippedRows = 0;
    let lastValidGroup = null;

    const getColumnValue = (row, columnIndex) => {
      if (!row || columnIndex === -1 || row.length <= columnIndex) return null;
      const value = row[columnIndex];
      if (value === undefined || value === null || value === '') return null;
      const stringValue = String(value).trim();
      return stringValue === '' ? null : stringValue;
    };

    // 🔄 Обработка строк с прогрессом
    rows.forEach((row, index) => {
      if (index % 500 === 0) {
        console.log(`📈 Processing progress: ${index}/${rows.length} rows [${requestId}]`);
      }

      if (!row || row.length === 0) {
        skippedRows++;
        return;
      }

      let groupName = getColumnValue(row, groupIndex);
      const studentName = getColumnValue(row, studentIndex);
      const paymentStatus = getColumnValue(row, paymentIndex);

      let phone = getColumnValue(row, phoneIndex);
      if (!phone) {
        phone = getColumnValue(row, alternativePhoneIndex);
      }

      if (!groupName && studentName && lastValidGroup) {
        groupName = lastValidGroup;
      }

      if (groupName) {
        lastValidGroup = groupName;
      }

      if (!studentName) {
        skippedRows++;
        return;
      }

      if (!groupName) {
        skippedRows++;
        return;
      }

      if (!groupsMap[groupName]) {
        groupsMap[groupName] = [];
      }

      // 🔧 ЛОГИКА ОПРЕДЕЛЕНИЯ ОПЛАТЫ
      let paid = false; // по умолчанию "не оплачено"

      if (paymentStatus) {
        const status = paymentStatus.toLowerCase();
        
        // Бесплатники - сразу "оплачено"
        if (status.includes('бесплатно') || status.includes('free')) {
          paid = true;
        }
        // Платники - всегда "не оплачено"
        else {
          paid = false;
        }
      }

      groupsMap[groupName].push({
        name: studentName,
        paid, // false = не оплачено, true = оплачено
        phone: phone || '',
        createdAt: new Date().toISOString()
      });

      processedStudents++;
    });

    console.log(`✅ Processed ${processedStudents} students into ${Object.keys(groupsMap).length} groups [${requestId}]`);
    console.log(`❌ Skipped ${skippedRows} rows due to missing data [${requestId}]`);

    if (Object.keys(groupsMap).length === 0) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn('Could not delete temporary file:', unlinkError);
      }
      releaseLock(requestId);
      return res.status(400).json({
        success: false,
        error: 'No valid student data found. Please check that your Excel file has data below the headers.',
        requestId
      });
    }

    const insertData = Object.entries(groupsMap).map(([group, students]) => ({
      group,
      students
    }));

    console.log(`💾 Inserting ${insertData.length} groups into Supabase [${requestId}]...`);

    // 🔄 Вставка в БД с повторными попытками
    const { data, error } = await retryDatabaseOperation(
      () => supabase.from('groups').insert(insertData),
      'Supabase insert'
    );

    // === УДАЛЕНИЕ ФАЙЛА ===
    try {
      fs.unlinkSync(req.file.path);
      console.log(`🗑️ Temporary file deleted [${requestId}]`);
    } catch (unlinkError) {
      console.warn(`Could not delete temporary file [${requestId}]:`, unlinkError);
    }

    // === ОШИБКА БД ===
    if (error) {
      console.error(`❌ Supabase insert error [${requestId}]:`, error.message);
      releaseLock(requestId);
      return res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`,
        requestId
      });
    }

    // === УСПЕШНЫЙ ОТВЕТ ===
    console.log(`🎉 Inserted ${insertData.length} groups into Supabase [${requestId}]`);

    releaseLock(requestId);
    
    return res.status(200)
      .set('Content-Type', 'application/json; charset=utf-8')
      .json({
        success: true,
        inserted: insertData.length,
        groups: Object.keys(groupsMap),
        totalStudents: processedStudents,
        skippedRows: skippedRows,
        requestId: requestId,
        timestamp: new Date().toISOString(),
        security: {
          iinColumnsFiltered: true,
          message: 'IIN columns were automatically filtered out for security'
        }
      });

  } catch (err) {
    console.error(`💥 /upload-groups error [${requestId}]:`, err);
    
    // Очистка ресурсов при ошибке
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`🗑️ Temporary file deleted after error [${requestId}]`);
      } catch (unlinkError) {
        console.warn(`Could not delete temporary file after error [${requestId}]:`, unlinkError);
      }
    }
    
    if (requestQueue.has(requestId)) {
      releaseLock(requestId);
    }

    return res.status(500).json({
      success: false,
      error: `Server error: ${err.message}`,
      requestId: requestId
    });
  }
});

// 🔄 Улучшенный экспорт с кэшированием
const exportCache = new Map();
const CACHE_TTL = 30000; // 30 секунд

router.get('/export-groups', async (req, res) => {
  const cacheKey = 'export_groups';
  
  try {
    console.log('📤 Запрос на экспорт групп в Excel');

    // Проверяем кэш
    const cached = exportCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('⚡ Serving from cache');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cached.fileName)}"`);
      return res.send(cached.buffer);
    }

    const { data: groups, error } = await retryDatabaseOperation(
      () => supabase.from('groups').select('group, students').order('group'),
      'Supabase groups fetch'
    );

    if (error) {
      console.error('❌ Supabase fetch error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    if (!groups || groups.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Нет данных для экспорта' 
      });
    }

    const rows = [];
    rows.push(['№', 'Группа', 'ФИО студента', 'Статус оплаты', 'Телефон', 'Добавлен']);

    let counter = 1;
    for (const { group, students } of groups) {
      if (!students || students.length === 0) {
        rows.push([counter++, group, '', 'Нет студентов', '', '']);
        continue;
      }

      for (const student of students) {
        rows.push([
          counter++,
          group,
          student.name || '',
          student.paid ? 'Оплачено' : 'Не оплачено',
          student.phone || '',
          student.createdAt ? new Date(student.createdAt).toLocaleString('ru-RU') : ''
        ]);
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    const colWidths = [
      { wch: 5 },  // №
      { wch: 20 }, // Группа
      { wch: 30 }, // ФИО
      { wch: 15 }, // Статус
      { wch: 18 }, // Телефон
      { wch: 20 }  // Добавлен
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Студенты');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `Группы_студентов_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Сохраняем в кэш
    exportCache.set(cacheKey, {
      buffer: excelBuffer,
      fileName: fileName,
      timestamp: Date.now()
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=30');
    
    console.log(`✅ Экспорт успешен: ${groups.length} групп, ${rows.length - 1} строк`);
    return res.send(excelBuffer);

  } catch (err) {
    console.error('💥 Export error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Ошибка при экспорте: ' + err.message 
    });
  }
});

// 🔄 Эндпоинт для проверки статуса загрузки
router.get('/upload-status/:requestId', (req, res) => {
  const { requestId } = req.params;
  const request = requestQueue.get(requestId);
  
  if (!request) {
    return res.status(404).json({
      success: false,
      error: 'Request not found'
    });
  }
  
  res.json({
    success: true,
    status: request.status,
    duration: Date.now() - request.startTime
  });
});

// 🔄 Эндпоинт для статистики сервера
router.get('/stats', (req, res) => {
  const activeUploads = Array.from(requestQueue.values()).filter(
    req => req.status === 'processing'
  ).length;
  
  res.json({
    success: true,
    activeUploads,
    queueSize: requestQueue.size,
    maxConcurrentUploads: MAX_CONCURRENT_UPLOADS,
    cacheSize: exportCache.size
  });
});

// Обработчик ошибок multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Only one file allowed.'
      });
    }
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  next();
});

export default router;