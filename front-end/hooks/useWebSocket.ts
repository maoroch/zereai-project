"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WsStatus = "connecting" | "connected" | "disconnected" | "error";

export type WsIncoming =
  | { type: "pong" }
  | { type: "searching" }
  | { type: "search_done"; count: number; titles?: string[] }
  | { type: "generating" }
  | { type: "token"; token: string }
  | { type: "done"; sessionId: string; messageCount: number }
  | { type: "history"; messages: SessionMessage[]; sessionId?: string }
  | { type: "history_cleared" }
  | { type: "error"; message: string };

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseWebSocketOptions {
  url: string;
  sessionId: string | null;
  onMessage: (msg: WsIncoming) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWebSocket({ url, sessionId, onMessage }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const [status, setStatus] = useState<WsStatus>("disconnected");

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      // Clear any pending reconnect
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsIncoming;
        onMessageRef.current(msg);
      } catch {
        console.error("[WS] Failed to parse message:", event.data);
      }
    };

    ws.onerror = () => setStatus("error");

    ws.onclose = () => {
      setStatus("disconnected");
      // Auto-reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  }, [url]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ ...payload, sessionId }));
    }
  }, [sessionId]);

  const sendQuestion = useCallback(
    (question: string) => send({ type: "question", question }),
    [send]
  );

  const requestHistory = useCallback(
    () => send({ type: "get_history" }),
    [send]
  );

  const clearServerHistory = useCallback(
    () => send({ type: "clear_history" }),
    [send]
  );

  return { status, sendQuestion, requestHistory, clearServerHistory };
}
