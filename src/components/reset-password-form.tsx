"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword, type UpdatePasswordState } from "@/app/actions";
import { Button } from "@/components/ui/button";

const initialState: UpdatePasswordState = { message: "", expired: false };

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState(updatePassword, initialState);

  return (
    <>
      {state.message && (
        <p className="mb-4 text-sm leading-5 text-[var(--danger)]" role="alert">
          {state.message}{" "}
          {state.expired && (
            <Link href="/forgot-password" className="font-semibold text-[#265be8] hover:underline">
              Send a new link
            </Link>
          )}
        </p>
      )}
      <form action={action} className="grid gap-4">
        <label className="label">
          New password
          <span id="new-password-rule" className="text-[11px] font-normal text-[#788480]">At least 8 characters</span>
          <input
            className="field"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            aria-describedby="new-password-rule"
            readOnly={isPending}
            required
          />
        </label>
        <label className="label">
          Confirm new password
          <input
            className="field"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            readOnly={isPending}
            required
          />
        </label>
        <Button type="submit" className="mt-2 w-full" disabled={isPending}>
          {isPending ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </>
  );
}
