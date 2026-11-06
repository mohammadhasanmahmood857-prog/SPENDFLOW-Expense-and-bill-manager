import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { canChangePasswordFrom, PASSWORD_CHANGE_WINDOW_SECONDS } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your SpendFlow account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center text-sm text-[#65716d]">Loading…</main>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

async function ResetPasswordContent() {
  await connection();
  // The reset link signs the user in through /auth/confirm. Only a session that link created in the last
  // few minutes may set a new password; an ordinary signed-in session gets the "request a link" message.
  const supabase = getSupabaseConfig() ? await createClient() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const claims = user && supabase ? (await supabase.auth.getClaims()).data?.claims : null;
  const allowed = Boolean(user && canChangePasswordFrom(claims?.amr));

  return (
    <AuthShell
      title="A fresh start."
      tagline="Choose a new password and you're back in."
      footnote="SpendFlow keeps your personal finances private."
    >
      <h2 className="display text-3xl">Choose a new password</h2>
      {user && allowed ? (
        <>
          <p className="mt-2 mb-6 break-words text-sm text-[#65716d]">For {user.email}</p>
          <ResetPasswordForm />
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-[#65716d]">
            {user
              ? `For your security, a new password can only be set within ${PASSWORD_CHANGE_WINDOW_SECONDS / 60} minutes of opening a reset link. Send yourself a new one.`
              : "This reset link has expired, was already used, or was opened in a different browser from the one you requested it in."}
          </p>
          <Link href="/forgot-password" className="button mt-6 w-full">Send a new reset link</Link>
        </>
      )}
    </AuthShell>
  );
}
