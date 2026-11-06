"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type State = { status: "checking" } | { status: "error"; message: string };

// Also shown for any expired email link forwarded from the home page, so it doesn't assume a reset.
const expiredMessage = "This email link has expired or was already used. Links work once; if you were resetting your password, request a new link and use the newest email.";

// Reads the recovery session Supabase put in the URL fragment, clears it from the address bar, and
// asks the server to turn it into the usual session cookies. Success opens the new-password form.
export function RecoveryHandler() {
  const [state, setState] = useState<State>({ status: "checking" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
    const fail = (message = expiredMessage) => setState({ status: "error", message });

    if (params.get("error") || params.get("error_code")) return fail();
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (params.get("type") !== "recovery" || !accessToken || !refreshToken) {
      return fail("This page only works from the reset link in your email. Request a new link if you need one.");
    }

    let active = true;
    fetch("/auth/recovery/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, refreshToken }),
      cache: "no-store",
    })
      .then((response) => {
        if (!active) return;
        if (response.ok) window.location.replace("/reset-password");
        else fail();
      })
      .catch(() => active && fail("We couldn't open your reset link. Check your connection and try the link again."));
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "checking") {
    return <p className="mt-4 text-sm text-[#65716d]" role="status">Checking your reset link…</p>;
  }
  return (
    <>
      <p className="mt-4 text-sm leading-6 text-[var(--danger)]" role="alert">{state.message}</p>
      <Link href="/forgot-password" className="button mt-6 w-full">Request a new reset link</Link>
    </>
  );
}
