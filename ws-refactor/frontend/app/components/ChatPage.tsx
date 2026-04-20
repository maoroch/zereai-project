"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import MobileMenu from "./MobileMenu";
import ChatWindow from "./ChatWindow";
import AnnouncementModal from "./AnnouncementModal";
import Notification, { NotificationType } from "./Notification";
import { useChatHistory } from "../../hooks/useChatHistory";
import { useWebSocket, WsIncoming } from "../../hooks/useWebSocket";
import type { Message } from "../../types/index";

// Status shown below the input while the bot is working
type BotStatus = "idle" | "searching" | "generating";

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
  const [botStatus, setBotStatus] = useState<BotStatus>("idle");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: NotificationType;
  } | null>(null);

  // We stream tokens into a ref so we can append without stale closures,
  // then flush into messages state when done.
  const streamingIdRef = useRef<string | null>(null);

  // Show announcement on first visit
  useEffect(() => {
    if (!localStorage.getItem("zere-announcement-shown")) {
      setTimeout(() => setModalOpen(true), 1000);
      localStorage.setItem("zere-announcement-shown", "true");
    }
  }, []);

  const notify = (message: string, type: NotificationType = "success") =>
    setNotification({ message, type });

  // ── WebSocket event handler ─────────────────────────────────────────────────

  const handleWsMessage = useCallback(
    (msg: WsIncoming) => {
      switch (msg.type) {
        case "searching":
          setBotStatus("searching");
          break;

        case "search_done":
          setBotStatus("generating");
          // Create a placeholder bot message that will receive tokens
          {
            const id = String(Date.now());
            streamingIdRef.current = id;
            setMessages((prev) => [
              ...prev,
              { id, role: "bot", text: "", time: Date.now() },
            ]);
          }
          break;

        case "token":
          // Append token to the streaming message
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current
                ? { ...m, text: m.text + msg.token }
                : m
            )
          );
          break;

        case "done":
          setBotStatus("idle");
          // Persist the completed bot message in local history
          setMessages((prev) => {
            const botMsg = prev.find((m) => m.id === streamingIdRef.current);
            if (botMsg?.text) saveMessage("bot", botMsg.text);
            streamingIdRef.current = null;
            return prev;
          });
          notify("Ответ получен");
          break;

        case "error":
          setBotStatus("idle");
          streamingIdRef.current = null;
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              role: "bot",
              text: `⚠️ ${msg.message}`,
              time: Date.now(),
            },
          ]);
          notify(msg.message, "error");
          break;

        default:
          break;
      }
    },
    [saveMessage]
  );

  // ── WebSocket connection ────────────────────────────────────────────────────

  const WS_URL =
    (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080") + "/ws";

  const { status: wsStatus, sendQuestion } = useWebSocket({
    url: WS_URL,
    sessionId: currentChatId,
    onMessage: handleWsMessage,
  });

  // ── Send message ────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text: string) => {
      if (botStatus !== "idle" || wsStatus !== "connected") return;

      const userMsg: Message = {
        id: String(Date.now()),
        role: "user",
        text,
        time: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      saveMessage("user", text);

      sendQuestion(text);
    },
    [botStatus, wsStatus, saveMessage, sendQuestion]
  );

  // ── Sidebar actions ─────────────────────────────────────────────────────────

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
    const allHistory = JSON.parse(localStorage.getItem("chatHistory") || "{}");
    const chat = allHistory[currentChatId];
    if (!chat) { notify("Нет данных для экспорта", "error"); return; }

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

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLoading = botStatus !== "idle";
  const emptyGroups = { today: [], yesterday: [], older: [] };
  const safeGroups = mounted ? groupedChats : emptyGroups;

  return (
    <>
      <div className="background-animation" id="backgroundAnimation" />
      <div className="progress-bar" style={{ width: isLoading ? "70%" : "0" }} />

      <Notification
        message={notification?.message ?? null}
        type={notification?.type}
        onDismiss={() => setNotification(null)}
      />

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        groupedChats={safeGroups}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        onDeleteChat={handleDeleteChat}
      />

      <AnnouncementModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="container">
        <Sidebar
          groupedChats={safeGroups}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
          onClearAll={handleClearAll}
          onExport={handleExport}
        />

        <div className="header">
          <div className="logo flex justify-center items-center">
            <img src="/assets/logo.svg" alt="Zere AI" width={80} />
          </div>
          <button
            className="menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Открыть меню"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>

          <div className="header-actions">
            {/* WS connection indicator */}
            <span
              className="ws-indicator"
              title={wsStatus === "connected" ? "Соединение активно" : "Нет соединения"}
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: wsStatus === "connected" ? "#22c55e" : wsStatus === "connecting" ? "#f59e0b" : "#ef4444",
                marginRight: 8,
              }}
            />
            <button className="header-btn" onClick={() => setModalOpen(true)}>
              О проекте
            </button>
          </div>
        </div>

        <div className="chat-container">
          <ChatWindow
            messages={messages}
            onSend={handleSend}
            isLoading={isLoading}
            botStatus={botStatus}
            wsStatus={wsStatus}
          />
        </div>
      </div>
    </>
  );
}
