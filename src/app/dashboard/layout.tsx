import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { PageLoading } from "@/components/page-loading";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <DashboardSession>{children}</DashboardSession>
    </Suspense>
  );
}

async function DashboardSession({ children }: { children: ReactNode }) {
  await connection();
  if (!getSupabaseConfig()) {
    return (
      <main className="grid min-h-screen place-items-center p-5">
        <section className="panel w-full max-w-lg p-7">
          <p className="eyebrow mb-3">One setup step</p>
          <h1 className="display text-3xl">Connect your private workspace.</h1>
          <p className="mt-3 text-sm leading-6 text-[#65716d]">
            Add your Supabase project URL and anon key to <code>.env.local</code>, then run the SQL migration in <code>supabase/migrations</code>.
          </p>
        </section>
      </main>
    );
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("display_name,currency").eq("id", user.id).maybeSingle();
  if (profileError) throw new Error(`Could not load profile: ${profileError.message}`);
  return (
    <div className="dashboard-shell min-h-screen">
      <Sidebar name={profile?.display_name || ""} email={user.email || ""} />
      <main className="min-h-screen lg:pl-[248px]">
        <div className="mx-auto max-w-[1400px] px-4 pb-14 pt-[72px] sm:px-7 lg:px-10 lg:pt-10">
          {children}
        </div>
      </main>
    </div>
  );
}
