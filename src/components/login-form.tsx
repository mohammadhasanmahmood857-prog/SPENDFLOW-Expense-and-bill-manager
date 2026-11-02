"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { resendVerificationEmail, signIn, type ResendVerificationState } from "@/app/actions";
import { Button } from "@/components/ui/button";

const initialResendState: ResendVerificationState = { status: "idle", message: "" };
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
  const [resendState, resendAction, isPending] = useActionState(
    resendVerificationEmail,
    initialResendState,
  );
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (secondsRemaining === 0) return;
    const timer = window.setTimeout(
      () => setSecondsRemaining((remaining) => Math.max(0, remaining - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [secondsRemaining]);

  function handleResendSubmit(event: FormEvent<HTMLFormElement>) {
    if (!enabled || !email.trim() || isPending) {
      event.preventDefault();
      return;
    }
    if (secondsRemaining > 0) {
      event.preventDefault();
      return;
    }
    setSecondsRemaining(resendCooldownMs / 1000);
  }

  return (
    <>
      {unverified && (
        <p className="mb-4 text-sm leading-5 text-[var(--danger)]" role="alert">
          This email address is not verified yet. Check your inbox or request a new confirmation email.
        </p>
      )}
      <form action={signIn} className="grid gap-4">
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
            required
          />
        </label>
        <label className="label">
          Password
          <input className="field" name="password" type="password" autoComplete="current-password" required />
        </label>
        <Button type="submit" className="mt-2 w-full" disabled={!enabled}>Log in</Button>
      </form>
      {unverified && (
        <form action={resendAction} onSubmit={handleResendSubmit} className="mt-4 grid gap-2">
          <input type="hidden" name="email" value={email} />
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
            disabled={!enabled || !email.trim() || isPending || secondsRemaining > 0}
          >
            {isPending
              ? "Sending confirmation email…"
              : secondsRemaining > 0
                ? `Resend available in ${secondsRemaining}s`
                : "Resend verification email"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-[#788480]">
        New to SpendFlow?{" "}
        <Link href={{ pathname: "/signup", query: { next } }} className="font-semibold text-[#265be8] hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
