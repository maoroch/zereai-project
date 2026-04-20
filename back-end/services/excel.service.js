import XLSX from 'xlsx';
import fs from 'fs';
import { IIN_PATTERNS, EXCEL_COLUMNS, EXPORT_CACHE_TTL } from '../config/constants.js';
import { bulkInsertGroups, exportGroups } from './crm.service.js';
import logger from '../utils/logger.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeHeaders(headers) {
  return headers.map((header) => {
    if (!header) return null;
    const lower = header.toLowerCase().trim();
    const isIin = IIN_PATTERNS.some((p) => lower.includes(p));
    if (isIin) {
      logger.info(`IIN column detected and ignored: "${header}"`);
      return null;
    }
    return header;
  });
}

function getCell(row, index) {
  if (!row || index === -1 || index >= row.length) return null;
  const value = row[index];
  if (value === undefined || value === null || value === '') return null;
  const str = String(value).trim();
  return str === '' ? null : str;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function processExcelUpload(filePath) {
  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch {
    throw new Error('Invalid Excel file');
  } finally {
    safeDelete(filePath);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheets found in Excel file');

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

  if (!rows || rows.length <= 2) throw new Error('No data found in Excel file');

  // Locate header row
  let headerRowIndex = -1;
  let rawHeaders = [];
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (row?.includes(EXCEL_COLUMNS.GROUP) && row?.includes(EXCEL_COLUMNS.STUDENT_NAME)) {
      headerRowIndex = i;
      rawHeaders = row.map((h) => (h ? String(h).trim() : ''));
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      `Could not find required columns: "${EXCEL_COLUMNS.GROUP}" and "${EXCEL_COLUMNS.STUDENT_NAME}"`
    );
  }

  const headers = sanitizeHeaders(rawHeaders);

  const idx = {
    group:    headers.findIndex((h) => h === EXCEL_COLUMNS.GROUP),
    student:  headers.findIndex((h) => h === EXCEL_COLUMNS.STUDENT_NAME),
    payment:  headers.findIndex((h) => h === EXCEL_COLUMNS.PAYMENT),
    phone:    headers.findIndex((h) => h === EXCEL_COLUMNS.PHONE),
    phoneAlt: headers.findIndex((h) => h === EXCEL_COLUMNS.PHONE_ALT),
  };

  const dataRows = rows.slice(headerRowIndex + 1);
  const groupsMap = {};
  let processedStudents = 0;
  let skippedRows = 0;
  let lastValidGroup = null;

  for (const row of dataRows) {
    if (!row || row.length === 0) { skippedRows++; continue; }

    let groupName   = getCell(row, idx.group);
    const studentName = getCell(row, idx.student);
    const paymentStatus = getCell(row, idx.payment);
    const phone = getCell(row, idx.phone) ?? getCell(row, idx.phoneAlt);

    if (!groupName && studentName && lastValidGroup) groupName = lastValidGroup;
    if (groupName) lastValidGroup = groupName;
    if (!studentName || !groupName) { skippedRows++; continue; }

    if (!groupsMap[groupName]) groupsMap[groupName] = [];

    const status = paymentStatus?.toLowerCase() ?? '';
    const paid = status.includes('бесплатно') || status.includes('free');

    groupsMap[groupName].push({
      name: studentName,
      paid,
      phone: phone || '',
      createdAt: new Date().toISOString(),
    });
    processedStudents++;
  }

  if (Object.keys(groupsMap).length === 0) {
    throw new Error('No valid student data found. Check column names in the Excel file.');
  }

  const insertData = Object.entries(groupsMap).map(([group, students]) => ({ group, students }));
  await bulkInsertGroups(insertData);

  return {
    inserted: insertData.length,
    groups: Object.keys(groupsMap),
    totalStudents: processedStudents,
    skippedRows,
    security: { iinColumnsFiltered: true },
  };
}

function safeDelete(filePath) {
  try { fs.unlinkSync(filePath); } catch { /* best effort */ }
}

// ── Export ────────────────────────────────────────────────────────────────────

const exportCache = new Map();

export async function buildExcelExport() {
  const cacheKey = 'export_groups';
  const cached = exportCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < EXPORT_CACHE_TTL) {
    return cached;
  }

  const groups = await exportGroups();
  if (!groups || groups.length === 0) throw new Error('No data available for export');

  const rows = [['№', 'Группа', 'ФИО студента', 'Статус оплаты', 'Телефон', 'Добавлен']];
  let counter = 1;

  for (const { group, students } of groups) {
    if (!students?.length) {
      rows.push([counter++, group, '', 'Нет студентов', '', '']);
      continue;
    }
    for (const s of students) {
      rows.push([
        counter++,
        group,
        s.name || '',
        s.paid ? 'Оплачено' : 'Не оплачено',
        s.phone || '',
        s.createdAt ? new Date(s.createdAt).toLocaleString('ru-RU') : '',
      ]);
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Студенты');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const fileName = `Группы_студентов_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const entry = { buffer, fileName, timestamp: Date.now() };
  exportCache.set(cacheKey, entry);
  return entry;
}
