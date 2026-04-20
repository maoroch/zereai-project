"use client";

import type { Chat } from "@/types";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  groupedChats: { today: Chat[]; yesterday: Chat[]; older: Chat[] };
  currentChatId: string;
  onNewChat: () => void;
  onLoadChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

function ChatGroup({
  title,
  chats,
  currentChatId,
  onLoad,
  onDelete,
  onClose,
}: {
  title: string;
  chats: Chat[];
  currentChatId: string;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  if (!chats.length) return null;
  return (
    <div className="history-section">
      <div className="history-title">{title}</div>
      {chats.map((chat) => {
        const time = new Date(chat.updatedAt).toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <div
            key={chat.id}
            className={`history-item ${chat.id === currentChatId ? "active" : ""}`}
            onClick={() => { onLoad(chat.id); onClose(); }}
          >
            <span>{chat.title}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span className="history-item-time">{time}</span>
              <button
                className="delete-history-btn"
                onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MobileMenu({
  isOpen,
  onClose,
  groupedChats,
  currentChatId,
  onNewChat,
  onLoadChat,
  onDeleteChat,
}: MobileMenuProps) {
  const hasChats =
    groupedChats.today.length + groupedChats.yesterday.length + groupedChats.older.length > 0;

  return (
    <>
      <div className={`menu-overlay ${isOpen ? "active" : ""}`} onClick={onClose} />
      <div className={`mobile-menu ${isOpen ? "active" : ""}`}>
        <div className="menu-header">
          <div className="menu-title">Zere AI</div>
          <button className="close-menu" onClick={onClose}>×</button>
        </div>

        <button className="new-chat-btn" onClick={() => { onNewChat(); onClose(); }}>
          + Новый чат
        </button>

        <div className="chat-history">
          {!hasChats ? (
            <div className="empty-history">Нет сохранённых чатов</div>
          ) : (
            <>
              <ChatGroup title="Сегодня" chats={groupedChats.today} currentChatId={currentChatId} onLoad={onLoadChat} onDelete={onDeleteChat} onClose={onClose} />
              <ChatGroup title="Вчера" chats={groupedChats.yesterday} currentChatId={currentChatId} onLoad={onLoadChat} onDelete={onDeleteChat} onClose={onClose} />
              <ChatGroup title="Ранее" chats={groupedChats.older} currentChatId={currentChatId} onLoad={onLoadChat} onDelete={onDeleteChat} onClose={onClose} />
            </>
          )}
        </div>

        <div className="menu-footer">
          <div className="user-info">
            <div className="user-avatar">U</div>
            <div className="user-name">Студент</div>
          </div>
        </div>
      </div>
    </>
  );
}
