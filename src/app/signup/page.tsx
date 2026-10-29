import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/app/actions";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/notice";
import { getSupabaseConfig } from "@/lib/supabase/config";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  if (getSupabaseConfig()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }
  return (
    <main className="grid min-h-screen bg-white md:grid-cols-[minmax(320px, .85fr)_1.15fr]">
      <section className="flex flex-col justify-between bg-[#172321] p-7 text-white sm:p-10 md:p-12">
        <Link href="/" aria-label="SpendFlow home"><Brand /></Link>
        <div className="my-12 max-w-[460px]">
          <p className="eyebrow text-[#9cafaa]">Start with what matters</p>
          <h1 className="display mt-5 text-4xl leading-tight sm:text-5xl">Your money. Your pace.</h1>
          <p className="mt-5 max-w-[370px] text-sm leading-6 text-[#b8c5c0]">No perfect plan required. Just a clear place to begin.</p>
        </div>
        <p className="text-xs text-[#9cafaa]">Private by default, protected by your account.</p>
      </section>
      <section className="grid place-items-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[390px]">
          <h2 className="display text-3xl">Make it yours</h2>
          <p className="mt-2 text-sm text-[#788480]">Create your private SpendFlow account.</p>
          <div className="mt-6">
            <Notice message={params.error} />
            {!getSupabaseConfig() && <Notice message="Authentication is not connected yet. Add your Supabase URL and anon key to .env.local, then restart the app." />}
          </div>
          <form action={signUp} className="grid gap-4">
            <label className="label">Your name<input className="field" name="display_name" type="text" autoComplete="name" maxLength={80} required /></label>
            <label className="label">Email address<input className="field" name="email" type="email" autoComplete="email" required /></label>
            <label className="label">Password<span className="text-[11px] font-normal text-[#788480]">At least 8 characters</span><input className="field" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
            <button type="submit" className="button mt-2 w-full" disabled={!getSupabaseConfig()}>Create account</button>
          </form>
          <p className="mt-6 text-center text-sm text-[#788480]">Already have an account? <Link href="/login" className="font-semibold text-[#265be8] hover:underline">Log in</Link></p>
        </div>
      </section>
    </main>
  );
}
