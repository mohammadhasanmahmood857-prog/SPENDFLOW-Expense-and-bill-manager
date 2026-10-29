"use client";

import { useEffect, useState } from "react";

export function Notice({ message, type = "error" }: { message?: string; type?: "error" | "success" | "notice" }) {
  const key = `${type}:${message || ""}`;
  const [dismissedKey, setDismissedKey] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setDismissedKey(key), type === "error" ? 8000 : 5000);
    return () => window.clearTimeout(timer);
  }, [key, message, type]);
  if (!message || dismissedKey === key) return null;
  const style = type === "error"
    ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]"
    : type === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]"
      : "border-[var(--blue-light)] bg-[var(--info-bg)] text-[var(--blue-ink)]";
  return <div role={type === "error" ? "alert" : "status"} className={`fixed right-4 top-4 z-[100] max-w-[min(92vw,32rem)] rounded-md border px-4 py-3 text-sm shadow-lg ${style}`}>{message}</div>;
}
