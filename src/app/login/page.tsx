import { Suspense } from "react";
import { connection } from "next/server";
import { AuthPageRedirect } from "@/components/auth-page-redirect";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { LoginForm } from "@/components/login-form";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; next?: string; unverified?: string }>;
}) {
  return (
    <Suspense fallback={<AuthLoading label="Loading your sign-in form…" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; next?: string; unverified?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const next = safeNextPath(params.next);
  return (
    <AuthPageRedirect enabled={Boolean(getSupabaseConfig())} next={next}>
      <AuthShell
        title="Small habits. A clearer picture."
        tagline="Pick up where you left off. Your spending and plans stay yours."
        footnote="SpendFlow keeps your personal finances private."
      >
        <h2 className="display text-3xl">Welcome back</h2>
        <p className="mt-2 text-sm text-[#788480]">Sign in to see your money in focus.</p>
        <div className="mt-6">
          <Notice message={params.error} />
          <Notice message={params.notice} type="notice" />
          {!getSupabaseConfig() && <Notice message="Authentication is not connected yet. Add your Supabase URL and anon key to .env.local, then restart the app." />}
        </div>
        <LoginForm
          enabled={Boolean(getSupabaseConfig())}
          next={next}
          unverified={params.unverified === "1"}
        />
      </AuthShell>
    </AuthPageRedirect>
  );
}

function AuthLoading({ label }: { label: string }) {
  return <main className="grid min-h-screen place-items-center text-sm text-[#788480]">{label}</main>;
}
