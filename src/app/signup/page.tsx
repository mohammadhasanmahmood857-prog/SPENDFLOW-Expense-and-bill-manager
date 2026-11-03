import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { signUp } from "@/app/actions";
import { AuthPageRedirect } from "@/components/auth-page-redirect";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a free SpendFlow account to track spending, budgets, and bills in one place.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center text-sm text-[#65716d]">Loading your sign-up form…</main>}>
      <SignupContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignupContent({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  await connection();
  const params = await searchParams;
  const next = safeNextPath(params.next);
  return (
    <AuthPageRedirect enabled={Boolean(getSupabaseConfig())} next={next}>
      <AuthShell
        title="Your money. Your pace."
        tagline="No perfect plan required. Just a clear place to begin."
        footnote="Private by default, protected by your account."
      >
        <h2 className="display text-3xl">Make it yours</h2>
        <p className="mt-2 text-sm text-[#65716d]">Create your private SpendFlow account.</p>
        <div className="mt-6">
          <Notice message={params.error} />
          {!getSupabaseConfig() && <Notice message="Authentication is not connected yet. Add your Supabase URL and anon key to .env.local, then restart the app." />}
        </div>
        <form action={signUp} className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="label">Your name<input className="field" name="display_name" type="text" autoComplete="name" maxLength={80} required /></label>
          <label className="label">Email address<input className="field" name="email" type="email" autoComplete="email" required /></label>
          <label className="label">Password<span className="text-[11px] font-normal text-[#65716d]">At least 8 characters</span><input className="field" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
          <SubmitButton className="mt-2 w-full" disabled={!getSupabaseConfig()} pendingLabel="Creating account…">Create account</SubmitButton>
        </form>
        <p className="mt-6 text-center text-sm text-[#65716d]">Already have an account? <Link href={{ pathname: "/login", query: { next } }} className="inline-block py-2 font-semibold text-[#265be8] hover:underline">Log in</Link></p>
      </AuthShell>
    </AuthPageRedirect>
  );
}
