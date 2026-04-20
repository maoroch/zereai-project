// Popup announcement для Zere AI
(function() {
    'use strict';
    
    // Проверяем, показывали ли popup ранее
    const POPUP_SHOWN_KEY = 'zereAI_popup_shown';
    
    // Если уже показывали, не показываем снова (опционально можно закомментировать эту проверку)
    if (localStorage.getItem(POPUP_SHOWN_KEY)) {
        return;
    }
    
    // Создаем HTML структуру
    const popupHTML = `
        <div id="zerePopupOverlay" class="zere-popup-overlay">
            <div class="zere-popup-container">
                <button class="zere-popup-close" aria-label="Закрыть">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
                
                <div class="zere-popup-content">
                    <div class="zere-popup-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="url(#gradient)" stroke-width="2"/>
                            <path d="M12 8v4l3 3" stroke="url(#gradient)" stroke-width="2" stroke-linecap="round"/>
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:#00ff88"/>
                                    <stop offset="100%" style="stop-color:#00ccff"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    
                    <h2 class="zere-popup-title">
                        🎉 Встречайте Zere AI!
                    </h2>
                    
                    <p class="zere-popup-subtitle">
                        Новый интеллектуальный ассистент для студентов METU
                    </p>
                    
                    <div class="zere-popup-description">
                        <p>Мы рады представить <strong>Zere AI</strong> — вашего персонального помощника, созданного специально для университета METU.</p>
                        
                        <div class="zere-popup-features">
                            <div class="zere-feature">
                                <span class="zere-feature-icon">💡</span>
                                <span>Мгновенные ответы на академические вопросы</span>
                            </div>
                            <div class="zere-feature">
                                <span class="zere-feature-icon">📚</span>
                                <span>Помощь с учебными материалами</span>
                            </div>
                            <div class="zere-feature">
                                <span class="zere-feature-icon">🎯</span>
                                <span>Поддержка 24/7</span>
                            </div>
                            <div class="zere-feature">
                                <span class="zere-feature-icon">🚀</span>
                                <span>Быстрая и точная информация</span>
                            </div>
                        </div>
                        
                        <p class="zere-popup-cta-text">
                            Начните диалог прямо сейчас и откройте новые возможности обучения!
                        </p>
                    </div>
                    
                    <button class="zere-popup-btn">
                        Начать использовать
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                        </svg>
                    </button>
                    
                    <p class="zere-popup-footer">
                        Разработано для студентов METU
                    </p>
                </div>
            </div>
        </div>
    `;
    
    // CSS стили
    const popupCSS = `
        .zere-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            animation: zerePopupFadeIn 0.3s ease-out;
            opacity: 0;
            animation-fill-mode: forwards;
        }
        
        @keyframes zerePopupFadeIn {
            to {
                opacity: 1;
            }
        }
        
        .zere-popup-container {
            background: linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%);
            border: 1px solid #2a2a2a;
            border-radius: 24px;
            max-width: 560px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            animation: zerePopupSlideUp 0.4s ease-out;
            transform: translateY(30px);
            opacity: 0;
            animation-fill-mode: forwards;
            animation-delay: 0.1s;
        }
        
        @keyframes zerePopupSlideUp {
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .zere-popup-container::-webkit-scrollbar {
            width: 6px;
        }
        
        .zere-popup-container::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .zere-popup-container::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 3px;
        }
        
        .zere-popup-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #fff;
            transition: all 0.2s ease;
            z-index: 10;
        }
        
        .zere-popup-close:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: scale(1.05);
        }
        
        .zere-popup-close:active {
            transform: scale(0.95);
        }
        
        .zere-popup-content {
            padding: 48px 32px 32px;
            text-align: center;
        }
        
        .zere-popup-icon {
            margin: 0 auto 24px;
            animation: zerePopupPulse 2s ease-in-out infinite;
        }
        
        @keyframes zerePopupPulse {
            0%, 100% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.05);
                opacity: 0.9;
            }
        }
        
        .zere-popup-title {
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 12px;
            background: linear-gradient(135deg, #00ff88, #00ccff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.2;
        }
        
        .zere-popup-subtitle {
            font-size: 18px;
            color: #aaa;
            margin: 0 0 32px;
            font-weight: 500;
        }
        
        .zere-popup-description {
            text-align: left;
            margin-bottom: 32px;
        }
        
        .zere-popup-description p {
            color: #ccc;
            font-size: 15px;
            line-height: 1.6;
            margin: 0 0 24px;
        }
        
        .zere-popup-description strong {
            color: #fff;
            font-weight: 600;
        }
        
        .zere-popup-features {
            display: grid;
            gap: 12px;
            margin: 24px 0;
        }
        
        .zere-feature {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            color: #ddd;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .zere-feature:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(0, 255, 136, 0.2);
            transform: translateX(4px);
        }
        
        .zere-feature-icon {
            font-size: 24px;
            flex-shrink: 0;
        }
        
        .zere-popup-cta-text {
            color: #aaa;
            font-size: 14px;
            margin: 24px 0 0;
        }
        
        .zere-popup-btn {
            width: 100%;
            padding: 16px 32px;
            background: linear-gradient(135deg, #00ff88, #00ccff);
            color: #000;
            border: none;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
        }
        
        .zere-popup-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 24px rgba(0, 255, 136, 0.4);
        }
        
        .zere-popup-btn:active {
            transform: translateY(0);
        }
        
        .zere-popup-footer {
            margin-top: 24px;
            color: #666;
            font-size: 13px;
        }
        
        /* Мобильная адаптация */
        @media (max-width: 600px) {
            .zere-popup-overlay {
                padding: 16px;
            }
            
            .zere-popup-container {
                border-radius: 20px;
                max-height: 85vh;
            }
            
            .zere-popup-content {
                padding: 40px 24px 24px;
            }
            
            .zere-popup-title {
                font-size: 26px;
            }
            
            .zere-popup-subtitle {
                font-size: 16px;
                margin-bottom: 24px;
            }
            
            .zere-popup-description p {
                font-size: 14px;
            }
            
            .zere-feature {
                font-size: 13px;
                padding: 10px 14px;
            }
            
            .zere-feature-icon {
                font-size: 20px;
            }
            
            .zere-popup-btn {
                padding: 14px 24px;
                font-size: 15px;
            }
            
            .zere-popup-close {
                width: 36px;
                height: 36px;
            }
        }
        
        @media (max-width: 400px) {
            .zere-popup-title {
                font-size: 22px;
            }
            
            .zere-popup-subtitle {
                font-size: 14px;
            }
            
            .zere-popup-content {
                padding: 36px 20px 20px;
            }
        }
    `;
    
    // Вставляем CSS в head
    const styleElement = document.createElement('style');
    styleElement.textContent = popupCSS;
    document.head.appendChild(styleElement);
    
    // Вставляем HTML в body
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    
    // Получаем элементы
    const overlay = document.getElementById('zerePopupOverlay');
    const closeBtn = overlay.querySelector('.zere-popup-close');
    const ctaBtn = overlay.querySelector('.zere-popup-btn');
    
    // Функция закрытия popup
    function closePopup() {
        overlay.style.animation = 'zerePopupFadeIn 0.2s ease-out reverse';
        setTimeout(() => {
            overlay.remove();
        }, 200);
        
        // Сохраняем в localStorage, что popup был показан
        localStorage.setItem(POPUP_SHOWN_KEY, 'true');
    }
    
    // Обработчики событий
    closeBtn.addEventListener('click', closePopup);
    ctaBtn.addEventListener('click', closePopup);
    
    // Закрытие по клику на overlay (вне popup)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closePopup();
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay) {
            closePopup();
        }
    });
    
    // Предотвращаем прокрутку body при открытом popup
    document.body.style.overflow = 'hidden';
    
    // Восстанавливаем прокрутку при закрытии
    overlay.addEventListener('click', () => {
        if (!document.getElementById('zerePopupOverlay')) {
            document.body.style.overflow = '';
        }
    });
    
    console.log('✅ Zere AI Popup загружен');
})();