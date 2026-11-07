"use client";

import { useEffect } from "react";

// Rendered on every page (root layout). If a reset link ever lands anywhere other than
// /auth/recovery (for example the Site URL fallback, /login or /forgot-password), the recovery
// session or error in the URL fragment is forwarded there, so the email form never replaces the
// new-password screen.
export function RecoveryHashForwarder() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/auth/recovery")) return;
    const hash = window.location.hash;
    if (/[#&]type=recovery(&|$)/.test(hash) || /[#&]error_code=/.test(hash)) {
      window.location.replace(`/auth/recovery${hash}`);
    }
  }, []);
  return null;
}
