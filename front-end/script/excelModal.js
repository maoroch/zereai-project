// excelModal.js
// Модальное окно для импорта/экспорта Excel (стилизованное под админ-панель)

class ExcelModal {
  constructor() {
    this.modal = null;
    this.baseURL = 'http://localhost:3000';
    this.init();
  }

  init() {
    this.createModal();
    this.bindEvents();
  }

  createModal() {
    const modalHTML = `
      <div class="modal" id="excelModal" style="display: none;">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h2 class="modal-title">📊 Excel: Импорт / Экспорт</h2>
            <button class="close-btn" id="closeExcelModal">×</button>
          </div>

          <div class="modal-body" style="padding: 24px;">
            <!-- Импорт -->
            <div class="excel-section">
              <div class="excel-section-header">
                <div class="excel-icon upload">📤</div>
                <h3 class="excel-section-title">Загрузить Excel</h3>
              </div>
              <p class="excel-section-desc">Импортируйте группы и студентов из Excel файла</p>
              
              <form id="excelUploadForm" style="margin-top: 16px;">
                <div class="file-input-wrapper">
                  <input type="file" id="excelFileInput" accept=".xlsx,.xls" required class="file-input">
                  <label for="excelFileInput" class="file-input-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span class="file-input-text">Выберите файл Excel</span>
                  </label>
                </div>
                <button type="submit" class="btn excel-btn" style="width: 100%; margin-top: 12px;">
                  Загрузить файл
                </button>
              </form>
            </div>

            <div class="excel-divider"></div>

            <!-- Экспорт -->
            <div class="excel-section">
              <div class="excel-section-header">
                <div class="excel-icon download">📥</div>
                <h3 class="excel-section-title">Скачать Excel</h3>
              </div>
              <p class="excel-section-desc">Экспортируйте все группы в Excel файл</p>
              
              <button id="exportExcelBtn" class="btn excel-btn excel-btn-download" style="width: 100%; margin-top: 16px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Скачать все группы
              </button>
            </div>

            <!-- Результат -->
            <div id="excelResult" class="excel-result">
              <div class="excel-result-icon">ℹ️</div>
              <div class="excel-result-text">Готов к работе</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('excelModal');
    this.resultEl = document.getElementById('excelResult');
    this.injectStyles();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .excel-section {
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 20px;
        transition: all 0.2s;
      }

      .excel-section:hover {
        border-color: #3a3a3a;
      }

      .excel-section-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .excel-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .excel-icon.upload {
        background: rgba(0, 255, 136, 0.1);
      }

      .excel-icon.download {
        background: rgba(0, 204, 255, 0.1);
      }

      .excel-section-title {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
        margin: 0;
      }

      .excel-section-desc {
        color: #888;
        font-size: 13px;
        margin: 0;
        padding-left: 52px;
      }

      .excel-divider {
        height: 1px;
        background: #2a2a2a;
        margin: 24px 0;
      }

      .file-input-wrapper {
        position: relative;
      }

      .file-input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }

      .file-input-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 14px 20px;
        background: #1a1a1a;
        border: 2px dashed #2a2a2a;
        border-radius: 10px;
        color: #888;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
      }

      .file-input-label:hover {
        border-color: #00ff88;
        background: rgba(0, 255, 136, 0.05);
        color: #00ff88;
      }

      .file-input:focus + .file-input-label {
        border-color: #00ff88;
        box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.1);
      }

      .file-input-text {
        font-weight: 500;
      }

      .excel-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px 24px;
        font-size: 15px;
        font-weight: 600;
        transition: all 0.2s;
      }

      .excel-btn-download {
        background: linear-gradient(135deg, #00ccff, #0099cc) !important;
      }

      .excel-btn-download:hover {
        box-shadow: 0 4px 16px rgba(0, 204, 255, 0.3);
      }

      .excel-result {
        margin-top: 24px;
        padding: 16px 20px;
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 10px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-height: 60px;
        transition: all 0.3s;
      }

      .excel-result-icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .excel-result-text {
        color: #aaa;
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-line;
        flex: 1;
      }

      .excel-result.error {
        background: rgba(255, 68, 68, 0.1);
        border-color: rgba(255, 68, 68, 0.3);
      }

      .excel-result.error .excel-result-icon {
        filter: grayscale(1);
      }

      .excel-result.error .excel-result-text {
        color: #ff6b6b;
      }

      .excel-result.success {
        background: rgba(0, 255, 136, 0.1);
        border-color: rgba(0, 255, 136, 0.3);
      }

      .excel-result.success .excel-result-text {
        color: #00ff88;
      }

      .excel-result.loading {
        background: rgba(0, 204, 255, 0.1);
        border-color: rgba(0, 204, 255, 0.3);
      }

      .excel-result.loading .excel-result-text {
        color: #00ccff;
      }

      .excel-result.loading .excel-result-icon {
        animation: pulse 1.5s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @media (max-width: 768px) {
        .excel-section-desc {
          padding-left: 0;
          margin-top: 8px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    document.getElementById('closeExcelModal').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    document.getElementById('excelUploadForm').addEventListener('submit', (e) => this.handleUpload(e));
    document.getElementById('exportExcelBtn').addEventListener('click', () => this.handleExport());

    // Обновление текста при выборе файла
    const fileInput = document.getElementById('excelFileInput');
    fileInput.addEventListener('change', (e) => {
      const label = document.querySelector('.file-input-text');
      if (e.target.files.length > 0) {
        label.textContent = e.target.files[0].name;
      } else {
        label.textContent = 'Выберите файл Excel';
      }
    });
  }

  open() {
    this.modal.style.display = 'flex';
    this.showResult('Готов к работе', 'info', 'ℹ️');
  }

  close() {
    this.modal.style.display = 'none';
    const fileInput = document.getElementById('excelFileInput');
    fileInput.value = '';
    document.querySelector('.file-input-text').textContent = 'Выберите файл Excel';
  }

  async handleUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById('excelFileInput');
    if (!fileInput.files.length) {
      this.showResult('Пожалуйста, выберите файл для загрузки', 'error', '❌');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    this.showResult('Загрузка файла...', 'loading', '⏳');

    try {
      const response = await fetch(`${this.baseURL}/excelRouter/upload-groups`, {
        method: 'POST',
        body: formData
      });

      console.log('Upload response status:', response.status);

      // ВАЖНО: Сначала получаем текст ответа
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try { 
        data = JSON.parse(responseText); 
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text that failed to parse:', responseText);
        this.showResult(`Ошибка обработки ответа сервера:\n${responseText}`, 'error', '❌');
        return;
      }

      // ВАЖНО: Проверяем success флаг в ответе, а не только статус HTTP
      if (!response.ok || !data.success) {
        const errorMessage = data?.error || `HTTP ${response.status}: ${responseText}`;
        this.showResult(`Ошибка загрузки: ${errorMessage}`, 'error', '❌');
        return;
      }

      // УСПЕШНЫЙ ОТВЕТ
      this.showResult(
        `✅ Успешно загружено!\n\n📊 Групп: ${data.inserted}\n👥 Студентов: ${data.totalStudents}\n❌ Пропущено: ${data.skippedRows}\n\n📋 Группы:\n${data.groups.map(g => `  • ${g}`).join('\n')}`,
        'success',
        '✅'
      );

      // Очищаем поле файла
      fileInput.value = '';
      document.querySelector('.file-input-text').textContent = 'Выберите файл Excel';

      // 🔄 УЛУЧШЕННАЯ ОБРАБОТКА: Задержка перед обновлением данных
      setTimeout(() => {
        this.safeUpdateInterface();
      }, 2000);

    } catch (err) {
      console.error('Upload error:', err);
      this.showResult(
        `Ошибка подключения к серверу:\n${err.message}\n\nПроверьте:\n  • Сервер запущен на localhost:3000\n  • CORS настроен правильно`,
        'error',
        '❌'
      );
    }
  }

  // 🔄 Безопасное обновление интерфейса с повторными попытками
  async safeUpdateInterface() {
    console.log('🔄 Starting safe interface update...');
    
    try {
      // Обновляем статистику с повторными попытками
      if (typeof window.loadStats === 'function') {
        await this.retryOperation(() => window.loadStats(), 'loadStats', 3);
      }
      
      // Ждем 1 секунду перед обновлением групп
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Обновляем группы с повторными попытками
      if (typeof window.loadGroups === 'function') {
        await this.retryOperation(() => window.loadGroups(), 'loadGroups', 3);
      }
      
      console.log('✅ Interface update completed successfully');
    } catch (error) {
      console.warn('⚠️ Some interface updates failed, but upload was successful:', error);
    }
  }

  // 🔄 Утилита для повторных попыток
  async retryOperation(operation, operationName, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await operation();
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        return;
      } catch (error) {
        console.warn(`⚠️ ${operationName} failed on attempt ${attempt}:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`${operationName} failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Ждем перед следующей попыткой (экспоненциальная задержка)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async handleExport() {
    this.showResult('Формирование Excel файла...', 'loading', '⏳');

    try {
      const response = await fetch(`${this.baseURL}/excelRouter/export-groups`);

      console.log('Export response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch {}
        this.showResult(`Ошибка экспорта: ${data?.error || text}`, 'error', '❌');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Группы_студентов_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.showResult('✅ Excel файл успешно скачан!', 'success', '✅');

      // 🔄 Безопасное обновление после экспорта
      setTimeout(() => {
        if (typeof window.loadStats === 'function') {
          window.loadStats().catch(err => console.warn('Stats update failed after export:', err));
        }
      }, 1000);

    } catch (err) {
      console.error('Export error:', err);
      this.showResult(
        `Ошибка экспорта:\n${err.message}\n\nПроверьте:\n  • Сервер запущен на localhost:3000\n  • CORS настроен правильно`,
        'error',
        '❌'
      );
    }
  }

  showResult(message, type = 'info', icon = 'ℹ️') {
    const iconEl = this.resultEl.querySelector('.excel-result-icon');
    const textEl = this.resultEl.querySelector('.excel-result-text');
    
    iconEl.textContent = icon;
    textEl.textContent = message;
    
    this.resultEl.className = 'excel-result';
    this.resultEl.classList.add(type);
  }
}

// 🔄 Улучшенные функции загрузки данных с обработкой ошибок
async function enhancedLoadStats() {
  try {
    console.log('📊 Loading stats...');
    const response = await fetch('/crmCrud/stats');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    // Ваш код обновления статистики
    if (typeof window.updateStatsUI === 'function') {
      window.updateStatsUI(data);
    }
    
    console.log('✅ Stats loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Failed to load stats:', error);
    throw error;
  }
}

async function enhancedLoadGroups() {
  try {
    console.log('👥 Loading groups...');
    const response = await fetch('/crmCrud/groups');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    // Ваш код обновления групп
    if (typeof window.updateGroupsUI === 'function') {
      window.updateGroupsUI(data);
    }
    
    console.log('✅ Groups loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Failed to load groups:', error);
    throw error;
  }
}

// 🔄 Замена оригинальных функций на улучшенные
if (typeof window.loadStats === 'function') {
  window.originalLoadStats = window.loadStats;
  window.loadStats = enhancedLoadStats;
}

if (typeof window.loadGroups === 'function') {
  window.originalLoadGroups = window.loadGroups;
  window.loadGroups = enhancedLoadGroups;
}

async function checkServerConnection() {
  try {
    const response = await fetch('http://localhost:3000/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const isServerRunning = await checkServerConnection();
  
  if (!isServerRunning) {
    console.warn('⚠️ Сервер не запущен на localhost:3000');
  }

  window.excelModal = new ExcelModal();

  const excelBtn = document.getElementById('excelModalBtn');
  if (excelBtn) {
    excelBtn.addEventListener('click', () => {
      window.excelModal.open();
    });
  } else {
    console.warn('❌ Кнопка #excelModalBtn не найдена в DOM');
    
    const actionBar = document.querySelector('.action-bar');
    if (actionBar) {
      const excelButton = document.createElement('button');
      excelButton.id = 'excelModalBtn';
      excelButton.className = 'btn btn-secondary';
      excelButton.innerHTML = 'Excel Импорт/Экспорт';
      excelButton.addEventListener('click', () => {
        window.excelModal.open();
      });
      actionBar.appendChild(excelButton);
    }
  }
});