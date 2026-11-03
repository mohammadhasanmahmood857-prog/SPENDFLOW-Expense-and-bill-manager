"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestPasswordReset, type PasswordResetState } from "@/app/actions";
import { Button } from "@/components/ui/button";

const initialState: PasswordResetState = { status: "idle", message: "" };

export function ForgotPasswordForm({ enabled }: { enabled: boolean }) {
  // Controlled so React's post-action form reset keeps the address the user typed.
  const [email, setEmail] = useState("");
  const [state, action, isPending] = useActionState(requestPasswordReset, initialState);

  return (
    <>
      {state.message && (
        <p
          className={`mb-4 text-sm leading-5 ${state.status === "success" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
          role={state.status === "success" ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}
      <form action={action} className="grid gap-4">
        <label className="label">
          Email address
          <input
            className="field"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={isPending}
            required
          />
        </label>
        <Button type="submit" className="mt-2 w-full" disabled={!enabled || isPending}>
          {isPending ? "Sending reset link…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-[#65716d]">
        Remembered it?{" "}
        <Link href="/login" className="inline-block py-2 font-semibold text-[#265be8] hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
