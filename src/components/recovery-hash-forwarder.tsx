"use client";

import { useEffect } from "react";

// If Supabase falls back to the Site URL (for example when /auth/recovery isn't on the allowed
// redirect list), a reset link lands on the home page with the session in the fragment. Forward it.
export function RecoveryHashForwarder() {
  useEffect(() => {
    const hash = window.location.hash;
    if (/[#&]type=recovery(&|$)/.test(hash) || /[#&]error_code=/.test(hash)) {
      window.location.replace(`/auth/recovery${hash}`);
    }
  }, []);
  return null;
}
