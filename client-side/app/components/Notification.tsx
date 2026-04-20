"use client";

import { useEffect } from "react";

export type NotificationType = "success" | "error";

interface NotificationProps {
  message: string | null;
  type?: NotificationType;
  onDismiss: () => void;
}

export default function Notification({ message, type = "success", onDismiss }: NotificationProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <div className={`notification ${message ? "show" : ""} ${type}`}>
      {message}
    </div>
  );
}
