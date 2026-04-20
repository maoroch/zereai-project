"use client";

import { useEffect } from "react";

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnnouncementModal({ isOpen, onClose }: AnnouncementModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="announcement-modal show">
      <div className="announcement-overlay" onClick={onClose} />
      <div className="announcement-content">
        <button className="announcement-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="announcement-banner">
          <img src="/assets/banner.webp" alt="Zere AI Banner" className="announcement-banner-img" />
        </div>

        <div className="announcement-body">
          <div className="announcement-header">
            <div className="announcement-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="announcement-title">Добро пожаловать в Zere AI!</h2>
            <p className="announcement-subtitle">Ваш умный университетский ассистент</p>
          </div>

          <div className="announcement-description">
            <h3>🎓 О проекте</h3>
            <p>
              Zere AI — это интеллектуальный помощник, созданный специально для студентов.
              Наша цель — облегчить вашу университетскую жизнь, предоставляя быстрые и точные
              ответы на любые вопросы.
            </p>

            <h3>✨ Возможности</h3>
            <ul>
              <li><strong>Помощь с учёбой:</strong> Объяснения сложных концепций, помощь с домашними заданиями</li>
              <li><strong>Организация:</strong> Планирование расписания, напоминания о дедлайнах</li>
              <li><strong>24/7 доступность:</strong> Помощь в любое время дня и ночи</li>
            </ul>

            <h3>🚀 Как начать?</h3>
            <p>
              Просто задайте любой вопрос в поле ввода ниже. Zere AI поможет вам с учебными
              материалами, объяснит сложные темы, поможет с исследованиями и многим другим!
            </p>

            <div className="announcement-features">
              {[
                { icon: "💬", text: "Естественный диалог" },
                { icon: "🧠", text: "Умные ответы" },
                { icon: "📚", text: "База знаний" },
                { icon: "⚡", text: "Быстрая работа" },
              ].map((f) => (
                <div key={f.text} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <div className="feature-text">{f.text}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="announcement-start-btn" onClick={onClose}>
            Начать работу
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
