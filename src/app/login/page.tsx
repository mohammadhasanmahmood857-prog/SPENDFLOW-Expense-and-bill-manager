import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { AuthPageRedirect } from "@/components/auth-page-redirect";
import { Brand } from "@/components/brand";
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
      <main className="grid min-h-screen bg-white md:grid-cols-[minmax(320px, .85fr)_1.15fr]">
        <section className="flex flex-col justify-between bg-[#172321] p-7 text-white sm:p-10 md:p-12">
          <Link href="/" aria-label="SpendFlow home"><Brand /></Link>
          <div className="my-12 max-w-[460px]">
            <h1 className="display mt-5 text-4xl leading-tight sm:text-5xl">Small habits. A clearer picture.</h1>
            <p className="mt-5 max-w-[370px] text-sm leading-6 text-[#b8c5c0]">Pick up where you left off. Your spending and plans stay yours.</p>
          </div>
          <p className="text-xs text-[#9cafaa]">SpendFlow keeps your personal finances private.</p>
        </section>
        <section className="grid place-items-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-[390px]">
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
          </div>
        </section>
      </main>
    </AuthPageRedirect>
  );
}

function AuthLoading({ label }: { label: string }) {
  return <main className="grid min-h-screen place-items-center text-sm text-[#788480]">{label}</main>;
}
