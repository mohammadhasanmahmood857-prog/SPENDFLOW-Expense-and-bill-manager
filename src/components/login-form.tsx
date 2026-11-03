"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  resendVerificationEmail,
  signIn,
  type ResendVerificationState,
  type SignInState,
} from "@/app/actions";
import { Button } from "@/components/ui/button";

const initialResendState: ResendVerificationState = { status: "idle", message: "" };
const initialSignInState: SignInState = { message: "", unverified: false };
const resendCooldownMs = 60_000;

export function LoginForm({
  enabled,
  next,
  unverified,
}: {
  enabled: boolean;
  next: string;
  unverified: boolean;
}) {
  const [email, setEmail] = useState("");
  // Controlled so React's post-action form reset does not wipe the password after a failed attempt.
  const [password, setPassword] = useState("");
  const [signInState, signInAction, isSignInPending] = useActionState(signIn, initialSignInState);
  const [resendState, resendAction, isResendPending] = useActionState(
    resendVerificationEmail,
    initialResendState,
  );
  const [resendCooldowns, setResendCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(0);
  const normalizedEmail = email.trim().toLowerCase();
  const cooldownUntil = resendCooldowns[normalizedEmail] || 0;
  const secondsRemaining = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
    : 0;
  const showUnverified = unverified || signInState.unverified;

  useEffect(() => {
    if (secondsRemaining === 0) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [secondsRemaining]);

  function handleResendSubmit(event: FormEvent<HTMLFormElement>) {
    if (!enabled || !email.trim() || isResendPending) {
      event.preventDefault();
      return;
    }
    if (secondsRemaining > 0) {
      event.preventDefault();
      return;
    }
    const startedAt = Date.now();
    setNow(startedAt);
    setResendCooldowns((current) => ({
      ...current,
      [normalizedEmail]: startedAt + resendCooldownMs,
    }));
  }

  return (
    <>
      {signInState.message && (
        <p className="mb-4 text-sm leading-5 text-[var(--danger)]" role="alert">
          {signInState.message}
        </p>
      )}
      {unverified && !signInState.message && (
        <p className="mb-4 text-sm leading-5 text-[var(--danger)]" role="alert">
          This email address is not verified yet. Check your inbox or request a new confirmation email.
        </p>
      )}
      <form action={signInAction} className="grid gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="label">
          Email address
          <input
            className="field"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={isSignInPending}
            required
          />
        </label>
        <div className="grid gap-[7px]">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="label">Password</label>
            <Link href="/forgot-password" className="-my-2 inline-flex min-h-10 items-center text-[13px] font-semibold text-[#265be8] hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            className="field"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            readOnly={isSignInPending}
            required
          />
        </div>
        <Button type="submit" className="mt-2 w-full" disabled={!enabled || isSignInPending}>
          {isSignInPending ? "Signing in…" : "Log in"}
        </Button>
      </form>
      {showUnverified && (
        <form action={resendAction} onSubmit={handleResendSubmit} className="mt-4 grid gap-2">
          <input type="hidden" name="email" value={normalizedEmail} />
          <input type="hidden" name="next" value={next} />
          {resendState.message && (
            <p
              className={`text-sm leading-5 ${resendState.status === "success" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
              role={resendState.status === "success" ? "status" : "alert"}
            >
              {resendState.message}
            </p>
          )}
          <Button
            type="submit"
            variant="secondary"
            className="w-full"
            disabled={!enabled || !email.trim() || isResendPending || secondsRemaining > 0}
          >
            {isResendPending
              ? "Sending confirmation email…"
              : secondsRemaining > 0
                ? `Resend available in ${secondsRemaining}s`
                : "Resend verification email"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-[#788480]">
        New to SpendFlow?{" "}
        <Link href={{ pathname: "/signup", query: { next } }} className="inline-block py-2 font-semibold text-[#265be8] hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
