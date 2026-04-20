"use client";

import { useState, useCallback, useEffect } from "react";
import type { Chat, ChatHistory, Message } from "@/types";

const STORAGE_KEY = "chatHistory";

function generateId(): string {
  return "chat_" + Date.now();
}

function loadFromStorage(): ChatHistory {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveToStorage(history: ChatHistory): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function useChatHistory() {
  // Start with empty state on both server and client to avoid hydration mismatch
  const [history, setHistory] = useState<ChatHistory>({});
  const [currentChatId, setCurrentChatId] = useState<string>("chat_init");
  const [mounted, setMounted] = useState(false);

  // Load from localStorage only after mount (client-only)
  useEffect(() => {
    const loaded = loadFromStorage();
    setHistory(loaded);
    setCurrentChatId(generateId());
    setMounted(true);
  }, []);

  const saveMessage = useCallback(
    (role: "user" | "bot", text: string) => {
      setHistory((prev) => {
        const updated = { ...prev };
        if (!updated[currentChatId]) {
          updated[currentChatId] = {
            id: currentChatId,
            title: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
        const msg: Message = { id: String(Date.now()), role, text, time: Date.now() };
        updated[currentChatId] = {
          ...updated[currentChatId],
          messages: [...updated[currentChatId].messages, msg],
          updatedAt: Date.now(),
        };
        if (role === "user" && updated[currentChatId].messages.length === 1) {
          updated[currentChatId].title =
            text.substring(0, 50) + (text.length > 50 ? "..." : "");
        }
        saveToStorage(updated);
        return updated;
      });
    },
    [currentChatId]
  );

  const loadChat = useCallback((chatId: string): Message[] => {
    const h = loadFromStorage();
    setHistory(h);
    setCurrentChatId(chatId);
    return h[chatId]?.messages ?? [];
  }, []);

  const deleteChat = useCallback(
    (chatId: string): string | null => {
      const updated = loadFromStorage();
      delete updated[chatId];
      saveToStorage(updated);
      setHistory(updated);
      if (chatId === currentChatId) {
        const newId = generateId();
        setCurrentChatId(newId);
        return newId;
      }
      return null;
    },
    [currentChatId]
  );

  const newChat = useCallback((): string => {
    const id = generateId();
    setCurrentChatId(id);
    return id;
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory({});
    const id = generateId();
    setCurrentChatId(id);
  }, []);

  const sortedChats = Object.values(history).sort((a, b) => b.updatedAt - a.updatedAt);

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const groupedChats = {
    today: sortedChats.filter((c) => new Date(c.updatedAt).toDateString() === today),
    yesterday: sortedChats.filter((c) => new Date(c.updatedAt).toDateString() === yesterday),
    older: sortedChats.filter((c) => {
      const d = new Date(c.updatedAt).toDateString();
      return d !== today && d !== yesterday;
    }),
  };

  return {
    history,
    currentChatId,
    groupedChats,
    mounted,
    saveMessage,
    loadChat,
    deleteChat,
    newChat,
    clearAll,
  };
}