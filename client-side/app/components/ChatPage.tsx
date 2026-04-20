"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "./Sidebar";
import MobileMenu from "./MobileMenu";
import ChatWindow from "./ChatWindow";
import AnnouncementModal from "./AnnouncementModal";
import Notification, { NotificationType } from "./Notification";
import { useChatHistory } from "../../hooks/useChatHistory";
import type { Message } from "../../types/index";

export default function ChatPage() {
  const {
    groupedChats,
    mounted,
    currentChatId,
    saveMessage,
    loadChat,
    deleteChat,
    newChat,
    clearAll,
  } = useChatHistory();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: NotificationType;
  } | null>(null);

  // Show announcement on first visit
  useEffect(() => {
    if (!localStorage.getItem("zere-announcement-shown")) {
      setTimeout(() => setModalOpen(true), 1000);
      localStorage.setItem("zere-announcement-shown", "true");
    }
  }, []);

  const notify = (message: string, type: NotificationType = "success") => {
    setNotification({ message, type });
  };

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: Message = {
        id: String(Date.now()),
        role: "user",
        text,
        time: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      saveMessage("user", text);
      setIsLoading(true);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const res = await fetch(`${API_URL}/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const answer = data.success ? data.answer : `Ошибка: ${data.error}`;
        const botMsg: Message = {
          id: String(Date.now() + 1),
          role: "bot",
          text: answer,
          time: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
        saveMessage("bot", answer);
        notify("Ответ получен");
      } catch {
        const errMsg: Message = {
          id: String(Date.now() + 1),
          role: "bot",
          text: "Нет связи с сервером",
          time: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        notify("Нет связи", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [saveMessage]
  );

  const handleNewChat = useCallback(() => {
    newChat();
    setMessages([]);
    notify("Новый чат создан");
  }, [newChat]);

  const handleLoadChat = useCallback(
    (id: string) => {
      const loaded = loadChat(id);
      setMessages(loaded);
      notify("Чат загружен");
    },
    [loadChat]
  );

  const handleDeleteChat = useCallback(
    (id: string) => {
      deleteChat(id);
      if (id === currentChatId) setMessages([]);
      notify("Чат удалён");
    },
    [deleteChat, currentChatId]
  );

  const handleClearAll = useCallback(() => {
    clearAll();
    setMessages([]);
    notify("История очищена");
  }, [clearAll]);

  const handleExport = useCallback(() => {
    // Export is done from sidebar/history context - simplified here
    const allHistory = JSON.parse(localStorage.getItem("chatHistory") || "{}");
    const chat = allHistory[currentChatId];
    if (!chat) {
      notify("Нет данных для экспорта", "error");
      return;
    }
    let text = `Чат: ${chat.title}\nДата: ${new Date(chat.createdAt).toLocaleString("ru-RU")}\n${"─".repeat(50)}\n\n`;
    chat.messages.forEach((m: Message) => {
      const sender = m.role === "user" ? "Вы" : "Zere AI";
      const time = new Date(m.time).toLocaleTimeString("ru-RU");
      text += `[${time}] ${sender}:\n${m.text}\n\n`;
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `zere-ai-${chat.title.substring(0, 20)}.txt`;
    link.click();
    notify("Чат экспортирован");
  }, [currentChatId]);

  const emptyGroups = { today: [], yesterday: [], older: [] };
  const safeGroups = mounted ? groupedChats : emptyGroups;

  return (
    <>
      {/* Background animation (mobile) */}
      <div className="background-animation" id="backgroundAnimation" />

      {/* Progress bar */}
      <div className="progress-bar" style={{ width: isLoading ? "70%" : "0" }} />

      {/* Notification */}
      <Notification
        message={notification?.message ?? null}
        type={notification?.type}
        onDismiss={() => setNotification(null)}
      />

      {/* Mobile menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        groupedChats={safeGroups}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Announcement modal */}
      <AnnouncementModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Main container */}
      <div className="container">
        {/* Desktop sidebar */}
        <Sidebar
          groupedChats={safeGroups}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
          onClearAll={handleClearAll}
          onExport={handleExport}
        />

        {/* Header */}
        <div className="header">
          <div className="logo flex justify-center items-center">
            <img src="/assets/logo.svg" alt="Zere AI" width={80} />
          </div>

          {/* Mobile menu toggle */}
          <button
            className="menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Открыть меню"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>

          {/* Desktop actions */}
          <div className="header-actions">
            <button className="header-btn" onClick={() => setModalOpen(true)}>
              О проекте
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="chat-container">
          <ChatWindow messages={messages} onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}