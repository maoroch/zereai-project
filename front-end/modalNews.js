// modalNews.js - Модальное окно с документацией Zere AI

class AnnouncementModal {
    constructor() {
        this.modal = null;
        this.init();
    }

    init() {
        this.createModal();
        this.attachStyles();
        this.attachEventListeners();
        
        // Показываем модальное окно при первом посещении
        if (!localStorage.getItem('zere-announcement-shown')) {
            setTimeout(() => this.show(), 1000);
            localStorage.setItem('zere-announcement-shown', 'true');
        }
    }

    createModal() {
        const modalHTML = `
            <div id="announcementModal" class="announcement-modal">
                <div class="announcement-overlay"></div>
                <div class="announcement-content">
                    <button class="announcement-close" onclick="announcementModal.hide()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    
                    <div class="announcement-banner">
                        <img src="assets/banner.webp" 
                             alt="Zere AI Banner" 
                             class="announcement-banner-img">
                    </div>
                    
                    <div class="announcement-body">
                        <div class="announcement-header">
                            <div class="announcement-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                    <path d="M2 17l10 5 10-5"></path>
                                    <path d="M2 12l10 5 10-5"></path>
                                </svg>
                            </div>
                            <h2 class="announcement-title">Добро пожаловать в Zere AI!</h2>
                            <p class="announcement-subtitle">Ваш умный университетский ассистент</p>
                        </div>
                        
                        <div class="announcement-description">
                            <h3>🎓 О проекте</h3>
                            <p>
                                Zere AI — это интеллектуальный помощник, созданный специально для студентов. 
                                Наша цель — облегчить вашу университетскую жизнь, предоставляя быстрые и точные 
                                ответы на любые вопросы.
                            </p>
                            
                            <h3>✨ Возможности</h3>
                            <ul>
                                <li><strong>Помощь с учебой:</strong> Объяснения сложных концепций, помощь с домашними заданиями</li>
                                <li><strong>Исследования:</strong> Поиск информации, анализ источников, подготовка материалов</li>
                                <li><strong>Организация:</strong> Планирование расписания, напоминания о дедлайнах</li>
                                <li><strong>24/7 доступность:</strong> Помощь в любое время дня и ночи</li>
                            </ul>
                            
                            <h3>🚀 Как начать?</h3>
                            <p>
                                Просто задайте любой вопрос в поле ввода ниже. Zere AI поможет вам с учебными 
                                материалами, объяснит сложные темы, поможет с исследованиями и многим другим!
                            </p>
                            
                            <div class="announcement-features">
                                <div class="feature-card">
                                    <div class="feature-icon">💬</div>
                                    <div class="feature-text">Естественный диалог</div>
                                </div>
                                <div class="feature-card">
                                    <div class="feature-icon">🧠</div>
                                    <div class="feature-text">Умные ответы</div>
                                </div>
                                <div class="feature-card">
                                    <div class="feature-icon">📚</div>
                                    <div class="feature-text">База знаний</div>
                                </div>
                                <div class="feature-card">
                                    <div class="feature-icon">⚡</div>
                                    <div class="feature-text">Быстрая работа</div>
                                </div>
                            </div>
                        </div>
                        
                        <button class="announcement-start-btn" onclick="announcementModal.hide()">
                            Начать работу
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('announcementModal');
    }

    attachStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .announcement-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }

            .announcement-modal.show {
                display: flex;
            }

            .announcement-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
            }

            .announcement-content {
                position: relative;
                background: #111;
                border-radius: 24px;
                max-width: 700px;
                width: 90%;
                max-height: 90vh;
                overflow: hidden;
                border: 1px solid #333;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.4s ease;
            }

            .announcement-close {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid #333;
                color: #fff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                z-index: 10;
            }

            .announcement-close:hover {
                background: #ff4444;
                border-color: #ff4444;
                transform: rotate(90deg);
            }

            .announcement-banner {
                width: 100%;
                height: 200px;
                overflow: hidden;
                position: relative;
            }

            .announcement-banner::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 100px;
                background: linear-gradient(to bottom, transparent, #111);
            }

            .announcement-banner-img {
                width: 100%;
                height: 110%;
                object-fit: cover;
                object-position: center;
            }

            .announcement-body {
                padding: 32px;
                overflow-y: auto;
                max-height: calc(90vh - 200px);
            }

            .announcement-body::-webkit-scrollbar {
                width: 6px;
            }

            .announcement-body::-webkit-scrollbar-track {
                background: transparent;
            }

            .announcement-body::-webkit-scrollbar-thumb {
                background: #333;
                border-radius: 3px;
            }

            .announcement-header {
                text-align: center;
                margin-bottom: 32px;
            }

            .announcement-icon {
                width: 60px;
                height: 60px;
                margin: 0 auto 16px;
                background: linear-gradient(135deg, #00ff88, #00ccff);
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #000;
            }

            .announcement-title {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
                background: linear-gradient(135deg, #00ff88, #00ccff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .announcement-subtitle {
                color: #888;
                font-size: 16px;
            }

            .announcement-description h3 {
                font-size: 18px;
                font-weight: 600;
                margin: 24px 0 12px;
                color: #fff;
            }

            .announcement-description p {
                color: #aaa;
                line-height: 1.6;
                margin-bottom: 16px;
            }

            .announcement-description ul {
                list-style: none;
                padding: 0;
                margin: 16px 0;
            }

            .announcement-description ul li {
                color: #aaa;
                padding: 8px 0;
                padding-left: 24px;
                position: relative;
                line-height: 1.6;
            }

            .announcement-description ul li::before {
                content: '→';
                position: absolute;
                left: 0;
                color: #00ff88;
                font-weight: bold;
            }

            .announcement-description ul li strong {
                color: #00ff88;
            }

            .announcement-features {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin: 24px 0;
            }

            .feature-card {
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 12px;
                padding: 16px;
                text-align: center;
                transition: all 0.2s ease;
            }

            .feature-card:hover {
                border-color: #00ff88;
                transform: translateY(-2px);
            }

            .feature-icon {
                font-size: 32px;
                margin-bottom: 8px;
            }

            .feature-text {
                font-size: 14px;
                color: #aaa;
                font-weight: 500;
            }

            .announcement-start-btn {
                width: 100%;
                background: linear-gradient(135deg, #00ff88, #00ccff);
                border: none;
                border-radius: 12px;
                padding: 16px 24px;
                color: #000;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 24px;
            }

            .announcement-start-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0, 255, 136, 0.3);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @media (max-width: 768px) {
                .announcement-content {
                    width: 95%;
                    max-height: 95vh;
                    border-radius: 16px;
                }

                .announcement-banner {
                    height: 150px;
                }

                .announcement-body {
                    padding: 24px 20px;
                    max-height: calc(95vh - 150px);
                }

                .announcement-title {
                    font-size: 24px;
                }

                .announcement-features {
                    grid-template-columns: 1fr;
                }

                .announcement-close {
                    width: 36px;
                    height: 36px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    attachEventListeners() {
        const overlay = this.modal.querySelector('.announcement-overlay');
        overlay.addEventListener('click', () => this.hide());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.hide();
            }
        });
    }

    show() {
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hide() {
        this.modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Инициализация модального окна
document.addEventListener('DOMContentLoaded', () => {
    window.announcementModal = new AnnouncementModal();
});