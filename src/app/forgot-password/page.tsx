import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Notice } from "@/components/notice";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a link to reset your SpendFlow password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center text-sm text-[#65716d]">Loading…</main>}>
      <ForgotPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ForgotPasswordContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const params = await searchParams;
  return (
    <AuthShell
      title="Locked out? It happens."
      tagline="We'll email you a link to choose a new password."
      footnote="SpendFlow keeps your personal finances private."
    >
      <h2 className="display text-3xl">Reset your password</h2>
      <p className="mt-2 text-sm text-[#65716d]">Enter the email address you signed up with.</p>
      <div className="mt-6">
        <Notice message={params.error} />
      </div>
      <ForgotPasswordForm enabled={Boolean(getSupabaseConfig())} />
    </AuthShell>
  );
}
