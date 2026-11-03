import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center text-sm text-[#788480]">Loading…</main>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

async function ResetPasswordContent() {
  await connection();
  // The reset link signs the user in through /auth/confirm; without that session there is nothing to update.
  const user = getSupabaseConfig()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  return (
    <AuthShell
      title="A fresh start."
      tagline="Choose a new password and you're back in."
      footnote="SpendFlow keeps your personal finances private."
    >
      <h2 className="display text-3xl">Choose a new password</h2>
      {user ? (
        <>
          <p className="mt-2 mb-6 break-words text-sm text-[#788480]">For {user.email}</p>
          <ResetPasswordForm />
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-[#788480]">
            This reset link has expired, was already used, or was opened in a different browser from the one
            you requested it in.
          </p>
          <Link href="/forgot-password" className="button mt-6 w-full">Send a new reset link</Link>
        </>
      )}
    </AuthShell>
  );
}
