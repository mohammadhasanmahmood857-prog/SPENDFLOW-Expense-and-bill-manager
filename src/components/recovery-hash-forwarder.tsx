"use client";

import { useEffect } from "react";

// Link errors carry no "type", so they're only treated as reset-link errors where a reset link can
// land: the Site URL fallback and the password pages. An expired signup link ends on /login, which
// shows its own "resend verification" message, so it must not be forwarded to the reset screen.
const resetErrorPaths = new Set(["/", "/forgot-password", "/reset-password"]);

// Rendered on every page (root layout). If a reset link ever lands anywhere other than
// /auth/recovery (for example the Site URL fallback, /login or /forgot-password), the recovery
// session in the URL fragment is forwarded there, so the email form never replaces the
// new-password screen.
export function RecoveryHashForwarder() {
  useEffect(() => {
    const { pathname, hash } = window.location;
    if (pathname.startsWith("/auth/recovery")) return;
    const isRecoverySession = /[#&]type=recovery(&|$)/.test(hash);
    const isResetLinkError = /[#&]error_code=/.test(hash) && resetErrorPaths.has(pathname);
    if (isRecoverySession || isResetLinkError) {
      window.location.replace(`/auth/recovery${hash}`);
    }
  }, []);
  return null;
}
