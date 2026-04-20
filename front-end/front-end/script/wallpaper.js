class WallpaperManager {
    constructor() {
        this.wallpaperMode = false;
        this.selectedWallpaper = null;
        this.uploadedFile = null;
        this.init();
    }

    init() {
        this.createWallpaperSection();
        this.createWallpaperModal();
        this.bindEvents();
        this.loadWallpaper(); // Переносим после создания элементов
    }

    createWallpaperSection() {
        // Добавляем пункт в меню
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) {
            console.error('Nav menu not found');
            return;
        }

        const wallpaperItem = document.createElement('li');
        wallpaperItem.className = 'nav-item';
        wallpaperItem.setAttribute('data-section', 'wallpaper');
        wallpaperItem.innerHTML = '🎨 Обои';
        navMenu.appendChild(wallpaperItem);

        // Создаем секцию для управления обоями
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('Main content not found');
            return;
        }

        const wallpaperSection = document.createElement('section');
        wallpaperSection.className = 'section';
        wallpaperSection.id = 'wallpaper';
        wallpaperSection.innerHTML = `
            <div class="content-header">
                <h1 class="content-title">Управление обоями</h1>
                <p class="content-subtitle">Настройте фон рабочего стола</p>
            </div>
            
            <div class="action-bar">
                <button class="btn" id="openWallpaperModalBtn">Выбрать обои</button>
                <button class="btn btn-secondary" id="resetWallpaperBtn">Сбросить обои</button>
                <button class="btn btn-secondary" id="toggleWallpaperModeBtn">Режим выбора: ВЫКЛ</button>
            </div>

            <div class="wallpaper-preview">
                <h3 style="margin-bottom: 16px; class="content-subtitle">Предпросмотр</h3>
                <div class="preview-container" id="wallpaperPreview">
                    <div class="preview-placeholder">
                        <span>Обои не выбраны</span>
                    </div>
                </div>
            </div>

            <div class="docs-container" style="margin-top: 32px;">
                <div class="doc-card">
                    <div class="doc-header">
                        <div class="doc-icon">💡</div>
                        <div class="doc-title">Как это работает</div>
                    </div>
                    <div class="doc-content">
                        <p><strong>Режим выбора обоев:</strong></p>
                        <ul class="feature-list">
                            <li>Включите режим выбора для просмотра как обои будут выглядеть</li>
                            <li>В этом режиме блоки интерфейса становятся полупрозрачными</li>
                            <li>Выберите подходящие обои и сохраните настройки</li>
                        </ul>
                        
                        <div class="tip-box">
                            <div class="tip-title">🔄 Автосохранение</div>
                            Обои сохраняются в памяти браузера и автоматически восстанавливаются при следующем посещении
                        </div>
                    </div>
                </div>
            </div>
        `;
        mainContent.appendChild(wallpaperSection);
    }

    createWallpaperModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'wallpaperModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Выбор обоев</h2>
                    <button class="close-btn" id="closeWallpaperModal">×</button>
                </div>
                
                <div class="wallpaper-options">
                    <div class="form-group">
                        <label class="form-label">Загрузить свои обои</label>
                        <input type="file" class="input-field" id="wallpaperUpload" accept="image/*">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Или выберите из готовых вариантов</label>
                        <div class="wallpaper-presets" id="wallpaperPresets">
                            <div class="wallpaper-preset" data-wallpaper="gradient1">
                                <div class="preset-preview" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
                                <span class="preset-name">Фиолетовый градиент</span>
                            </div>
                            <div class="wallpaper-preset" data-wallpaper="gradient2">
                                <div class="preset-preview" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"></div>
                                <span class="preset-name">Розовый градиент</span>
                            </div>
                            <div class="wallpaper-preset" data-wallpaper="gradient3">
                                <div class="preset-preview" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);"></div>
                                <span class="preset-name">Синий градиент</span>
                            </div>
                            <div class="wallpaper-preset" data-wallpaper="gradient4">
                                <div class="preset-preview" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);"></div>
                                <span class="preset-name">Зеленый градиент</span>
                            </div>
                            <div class="wallpaper-preset" data-wallpaper="solidDark">
                                <div class="preset-preview" style="background: #0a0a0a; border: 2px solid #2a2a2a;"></div>
                                <span class="preset-name">Темная тема</span>
                            </div>
                            <div class="wallpaper-preset" data-wallpaper="solidLight">
                                <div class="preset-preview" style="background: #f5f5f5; border: 2px solid #ddd;"></div>
                                <span class="preset-name">Светлая тема</span>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <button class="btn" id="saveWallpaperBtn" style="flex: 1;">Применить обои</button>
                        <button class="btn btn-secondary" id="cancelWallpaperBtn">Отмена</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    bindEvents() {
        // Навигация
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-section="wallpaper"]')) {
                this.showSection('wallpaper');
            }
        });

        // Кнопки управления - используем делегирование событий
        document.addEventListener('click', (e) => {
            if (e.target.id === 'openWallpaperModalBtn' || e.target.closest('#openWallpaperModalBtn')) {
                this.openWallpaperModal();
            }
            if (e.target.id === 'resetWallpaperBtn' || e.target.closest('#resetWallpaperBtn')) {
                this.resetWallpaper();
            }
            if (e.target.id === 'toggleWallpaperModeBtn' || e.target.closest('#toggleWallpaperModeBtn')) {
                this.toggleWallpaperMode();
            }
            if (e.target.id === 'closeWallpaperModal' || e.target.closest('#closeWallpaperModal')) {
                this.closeWallpaperModal();
            }
            if (e.target.id === 'cancelWallpaperBtn' || e.target.closest('#cancelWallpaperBtn')) {
                this.closeWallpaperModal();
            }
            if (e.target.id === 'saveWallpaperBtn' || e.target.closest('#saveWallpaperBtn')) {
                this.saveWallpaper();
            }
            if (e.target.closest('.wallpaper-preset')) {
                const preset = e.target.closest('.wallpaper-preset');
                this.selectPreset(preset);
            }
        });

        // Загрузка файла
        document.addEventListener('change', (e) => {
            if (e.target.id === 'wallpaperUpload') {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Клик вне модального окна
        document.addEventListener('click', (e) => {
            if (e.target.id === 'wallpaperModal') {
                this.closeWallpaperModal();
            }
        });
    }

    showSection(sectionId) {
        // Скрываем все секции
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Показываем нужную секцию
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Обновляем активный пункт меню
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const targetNavItem = document.querySelector(`[data-section="${sectionId}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
        }
    }

    openWallpaperModal() {
        const modal = document.getElementById('wallpaperModal');
        if (modal) {
            modal.classList.add('show');
        }
        this.deselectAllPresets();
    }

    closeWallpaperModal() {
        const modal = document.getElementById('wallpaperModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.selectedWallpaper = null;
        this.uploadedFile = null;
        const uploadInput = document.getElementById('wallpaperUpload');
        if (uploadInput) {
            uploadInput.value = '';
        }
    }

    selectPreset(presetElement) {
        this.deselectAllPresets();
        presetElement.classList.add('selected');
        this.selectedWallpaper = presetElement.getAttribute('data-wallpaper');
        this.uploadedFile = null;
    }

    deselectAllPresets() {
        document.querySelectorAll('.wallpaper-preset').forEach(preset => {
            preset.classList.remove('selected');
        });
    }

    async handleFileUpload(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите файл изображения');
            return;
        }

        this.deselectAllPresets();
        this.selectedWallpaper = null;
        this.uploadedFile = file;

        // Показываем превью
        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewWallpaper(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    async saveWallpaper() {
        let wallpaperData = null;

        if (this.uploadedFile) {
            // Конвертируем файл в base64
            wallpaperData = await this.fileToBase64(this.uploadedFile);
            this.applyWallpaper(wallpaperData, 'custom');
        } else if (this.selectedWallpaper) {
            // Сохраняем выбранный пресет
            this.applyWallpaper(this.selectedWallpaper, 'preset');
        } else {
            alert('Пожалуйста, выберите обои или загрузите файл');
            return;
        }

        this.closeWallpaperModal();
        this.updatePreview();
    }

    applyWallpaper(wallpaper, type) {
        const wallpaperConfig = {
            type: type,
            data: wallpaper,
            timestamp: Date.now()
        };

        // Сохраняем в localStorage
        localStorage.setItem('adminWallpaper', JSON.stringify(wallpaperConfig));
        
        // Применяем обои
        this.setWallpaper(wallpaperConfig);
    }

    setWallpaper(config) {
        const body = document.body;
        const html = document.documentElement;
        
        // Удаляем предыдущие обои
        body.style.backgroundImage = '';
        body.style.backgroundColor = '';
        body.classList.remove('custom-wallpaper');

        // Применяем обои ко всей странице
        if (config.type === 'custom') {
            // Пользовательские обои
            body.style.backgroundImage = `url(${config.data})`;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
            body.style.backgroundAttachment = 'fixed';
            body.style.backgroundRepeat = 'no-repeat';
            
            // Также применяем к html для полного покрытия
            html.style.backgroundImage = `url(${config.data})`;
            html.style.backgroundSize = 'cover';
            html.style.backgroundPosition = 'center';
            html.style.backgroundAttachment = 'fixed';
            html.style.backgroundRepeat = 'no-repeat';
            
            body.classList.add('custom-wallpaper');
        } else if (config.type === 'preset') {
            // Пресеты - применяем только к body
            switch (config.data) {
                case 'gradient1':
                    body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    html.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    break;
                case 'gradient2':
                    body.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                    html.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                    break;
                case 'gradient3':
                    body.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
                    html.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
                    break;
                case 'gradient4':
                    body.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
                    html.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
                    break;
                case 'solidDark':
                    body.style.background = '#0a0a0a';
                    html.style.background = '#0a0a0a';
                    break;
                case 'solidLight':
                    body.style.background = '#f5f5f5';
                    html.style.background = '#f5f5f5';
                    break;
            }
            
            body.style.backgroundSize = 'cover';
            html.style.backgroundSize = 'cover';
            body.classList.add('custom-wallpaper');
        }
    }

    loadWallpaper() {
        const saved = localStorage.getItem('adminWallpaper');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.setWallpaper(config);
                // Задержка для гарантии что DOM создан
                setTimeout(() => {
                    this.updatePreview();
                }, 100);
            } catch (e) {
                console.error('Error loading wallpaper:', e);
            }
        }
    }

    resetWallpaper() {
        localStorage.removeItem('adminWallpaper');
        document.body.style.backgroundImage = '';
        document.body.style.backgroundColor = '';
        document.body.classList.remove('custom-wallpaper');
        
        const html = document.documentElement;
        html.style.backgroundImage = '';
        html.style.backgroundColor = '';
        
        this.updatePreview();
        
        // Сбрасываем режим выбора если активен
        if (this.wallpaperMode) {
            this.toggleWallpaperMode();
        }
    }

    toggleWallpaperMode() {
        this.wallpaperMode = !this.wallpaperMode;
        const btn = document.getElementById('toggleWallpaperModeBtn');
        
        if (!btn) return;
        
        if (this.wallpaperMode) {
            document.body.classList.add('wallpaper-mode');
            btn.textContent = 'Режим выбора: ВКЛ';
            btn.style.background = 'linear-gradient(135deg, #00ff88, #00ccff)';
            btn.style.color = '#000';
        } else {
            document.body.classList.remove('wallpaper-mode');
            btn.textContent = 'Режим выбора: ВЫКЛ';
            btn.style.background = '';
            btn.style.color = '';
        }
    }

    updatePreview() {
        const preview = document.getElementById('wallpaperPreview');
        if (!preview) {
            console.warn('Wallpaper preview element not found');
            return;
        }
        
        const saved = localStorage.getItem('adminWallpaper');
        
        if (!saved) {
            preview.innerHTML = '<div class="preview-placeholder"><span>Обои не выбраны</span></div>';
            return;
        }

        try {
            const config = JSON.parse(saved);
            if (config.type === 'custom') {
                preview.innerHTML = `
                    <div class="preview-custom" style="background-image: url(${config.data})"></div>
                    <div class="preview-info">Пользовательские обои</div>
                `;
            } else {
                let previewStyle = '';
                let name = '';
                
                switch (config.data) {
                    case 'gradient1':
                        previewStyle = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                        name = 'Фиолетовый градиент';
                        break;
                    case 'gradient2':
                        previewStyle = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                        name = 'Розовый градиент';
                        break;
                    case 'gradient3':
                        previewStyle = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
                        name = 'Синий градиент';
                        break;
                    case 'gradient4':
                        previewStyle = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
                        name = 'Зеленый градиент';
                        break;
                    case 'solidDark':
                        previewStyle = '#0a0a0a';
                        name = 'Темная тема';
                        break;
                    case 'solidLight':
                        previewStyle = '#f5f5f5';
                        name = 'Светлая тема';
                        break;
                }
                
                preview.innerHTML = `
                    <div class="preview-preset" style="background: ${previewStyle}"></div>
                    <div class="preview-info">${name}</div>
                `;
            }
        } catch (e) {
            preview.innerHTML = '<div class="preview-placeholder"><span>Ошибка загрузки</span></div>';
        }
    }

    previewWallpaper(dataUrl) {
        const preview = document.getElementById('wallpaperPreview');
        if (!preview) return;
        
        preview.innerHTML = `
            <div class="preview-custom" style="background-image: url(${dataUrl})"></div>
            <div class="preview-info">Загруженные обои</div>
        `;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

// Инициализация когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    new WallpaperManager();
});