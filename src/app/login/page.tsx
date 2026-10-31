import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { signIn } from "@/app/actions";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/auth";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; next?: string }> }) {
  return (
    <Suspense fallback={<AuthLoading label="Loading your sign-in form…" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({
  searchParams,
}: { searchParams: Promise<{ error?: string; notice?: string; next?: string }> }) {
  await connection();
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (getSupabaseConfig()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect(next);
  }
  return (
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
          <form action={signIn} className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <label className="label">Email address<input className="field" name="email" type="email" autoComplete="email" required /></label>
            <label className="label">Password<input className="field" name="password" type="password" autoComplete="current-password" required /></label>
            <Button type="submit" className="mt-2 w-full" disabled={!getSupabaseConfig()}>Log in</Button>
          </form>
          <p className="mt-6 text-center text-sm text-[#788480]">New to SpendFlow? <Link href={{ pathname: "/signup", query: { next } }} className="font-semibold text-[#265be8] hover:underline">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}

function AuthLoading({ label }: { label: string }) {
  return <main className="grid min-h-screen place-items-center text-sm text-[#788480]">{label}</main>;
}
