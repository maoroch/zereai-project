"use client";

import type { Chat } from "@/types";

interface SidebarProps {
  groupedChats: {
    today: Chat[];
    yesterday: Chat[];
    older: Chat[];
  };
  currentChatId: string;
  onNewChat: () => void;
  onLoadChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClearAll: () => void;
  onExport: () => void;
}

function ChatGroup({
  title,
  chats,
  currentChatId,
  onLoad,
  onDelete,
}: {
  title: string;
  chats: Chat[];
  currentChatId: string;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
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
            onClick={() => onLoad(chat.id)}
          >
            <span>{chat.title}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span className="history-item-time">{time}</span>
              <button
                className="delete-history-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chat.id);
                }}
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

export default function Sidebar({
  groupedChats,
  currentChatId,
  onNewChat,
  onLoadChat,
  onDeleteChat,
  onClearAll,
  onExport,
}: SidebarProps) {
  const hasChats =
    groupedChats.today.length + groupedChats.yesterday.length + groupedChats.older.length > 0;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Zere AI</div>
        <div style={{ color: "#666", fontSize: 14 }}>Университетский ассистент</div>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        + Новый чат
      </button>

      <div className="chat-history">
        {!hasChats ? (
          <div className="empty-history">Нет сохранённых чатов</div>
        ) : (
          <>
            <ChatGroup
              title="Сегодня"
              chats={groupedChats.today}
              currentChatId={currentChatId}
              onLoad={onLoadChat}
              onDelete={onDeleteChat}
            />
            <ChatGroup
              title="Вчера"
              chats={groupedChats.yesterday}
              currentChatId={currentChatId}
              onLoad={onLoadChat}
              onDelete={onDeleteChat}
            />
            <ChatGroup
              title="Ранее"
              chats={groupedChats.older}
              currentChatId={currentChatId}
              onLoad={onLoadChat}
              onDelete={onDeleteChat}
            />
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">U</div>
          <div className="user-name">Студент</div>
        </div>
      </div>
    </div>
  );
}
