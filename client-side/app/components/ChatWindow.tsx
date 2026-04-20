"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import type { Message } from "@/types";

interface ChatWindowProps {
  messages: Message[];
  onSend: (text: string) => Promise<void>;
  isLoading: boolean;
}

function TypingIndicator() {
  return (
    <div className="message bot-message">
      <div className="message-content">
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, onSend, isLoading }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const showStartScreen = messages.length === 0 && !isLoading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await onSend(text);
  }, [input, isLoading, onSend]);

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="messages" id="messages">
        {showStartScreen && (
          <div className="start-screen">
            <img
              src="/assets/start-intro2.webp"
              loading="lazy"
              alt="Zere AI"
              className="start-image"
            />
            <h1 className="start-text">
              Привет! Я,{" "}
              <span className="title-intro">Zere AI</span>
            </h1>
            <p className="start-text-sub">
              Ваш университетский ассистент.
              <br />
              Задайте мне вопрос, и я помогу вам!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}-message`}>
            <div className="message-content">{msg.text}</div>
          </div>
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            id="question"
            placeholder="Задать вопрос..."
            autoComplete="off"
            rows={1}
            value={input}
            onChange={handleInput}
            onKeyPress={handleKeyPress}
          />
          <button id="askBtn" onClick={handleSend} disabled={!input.trim() || isLoading}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
        <div className="input-hint">
          Нажмите Enter для отправки, Shift+Enter для новой строки
        </div>
      </div>
    </>
  );
}
