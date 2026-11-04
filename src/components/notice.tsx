"use client";

import { useEffect, useState } from "react";

export function Notice({ message, type = "error" }: { message?: string; type?: "error" | "success" | "notice" }) {
  const key = `${type}:${message || ""}`;
  const [dismissedKey, setDismissedKey] = useState("");
  useEffect(() => {
    // Errors stay until dismissed so nobody misses them (WCAG 2.2.1); confirmations fade after 5 s.
    if (!message || type === "error") return;
    const timer = window.setTimeout(() => setDismissedKey(key), 5000);
    return () => window.clearTimeout(timer);
  }, [key, message, type]);
  if (!message || dismissedKey === key) return null;
  const style = type === "error"
    ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]"
    : type === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]"
      : "border-[var(--blue-light)] bg-[var(--info-bg)] text-[var(--blue-ink)]";
  // Below the 56px phone header so it never covers the menu button; top-right on desktop.
  // z-45 keeps it under the open navigation drawer (z-50) and edit sheets (z-70).
  return (
    <div role={type === "error" ? "alert" : "status"} className={`fixed inset-x-4 top-[68px] z-[45] flex items-start gap-2 rounded-md border py-1 pl-4 pr-1 text-sm shadow-lg sm:left-auto sm:max-w-[32rem] lg:top-4 ${style}`}>
      <p className="min-w-0 flex-1 break-words py-2">{message}</p>
      <button type="button" aria-label="Dismiss message" className="grid size-10 shrink-0 place-items-center rounded-md text-lg leading-none hover:bg-black/5" onClick={() => setDismissedKey(key)}>×</button>
    </div>
  );
}
