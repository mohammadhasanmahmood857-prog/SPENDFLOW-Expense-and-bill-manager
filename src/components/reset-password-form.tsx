"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword, type UpdatePasswordState } from "@/app/actions";
import { PasswordFields } from "@/components/password-fields";
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
        <PasswordFields label="New password" confirmLabel="Confirm password" readOnly={isPending} />
        <Button type="submit" className="mt-2 w-full" disabled={isPending}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </>
  );
}
