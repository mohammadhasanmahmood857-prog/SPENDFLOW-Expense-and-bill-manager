import { Suspense } from "react";
import { connection } from "next/server";
import { saveSettings } from "@/app/actions";
import { Notice } from "@/components/notice";
import { PageHeading } from "@/components/page-heading";
import { PageLoading } from "@/components/page-loading";
import { getCurrentUser, getProfile } from "@/lib/supabase/server";

type SearchParams = Promise<{ error?: string; success?: string }>;

const commonCurrencies = [
  ["PKR", "Pakistani rupee (PKR)"],
  ["USD", "US dollar (USD)"],
  ["GBP", "British pound (GBP)"],
  ["EUR", "Euro (EUR)"],
  ["AED", "UAE dirham (AED)"],
  ["INR", "Indian rupee (INR)"],
] as const;

export default function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<PageLoading />}><SettingsContent searchParams={searchParams} /></Suspense>;
}

async function SettingsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) throw new Error("Your session expired. Please sign in again.");
  const { data: profile, error } = await getProfile(user.id);
  if (error) throw new Error(`Could not load preferences: ${error.message}`);
  const displayName = profile?.display_name || String(user.user_metadata.display_name || "");
  const currency = profile?.currency || "PKR";
  const options = commonCurrencies.some(([code]) => code === currency)
    ? commonCurrencies
    : [...commonCurrencies, [currency, `${currency} (custom)`] as const];
  return (
    <div className="page-enter">
      <PageHeading title="Settings" description="A few preferences to make SpendFlow feel like yours." />
      <Notice message={params.error} />
      <Notice message={params.success} type="success" />
      <section className="panel max-w-[760px] p-5 sm:p-7">
        <h2 className="text-sm font-bold">Profile and preferences</h2>
        <p className="mt-1 text-sm leading-5 text-[var(--muted)]">Your financial records remain private to this account.</p>
        <form action={saveSettings} className="mt-6 grid max-w-[520px] gap-5">
          <label className="label">Display name<input className="field" name="display_name" defaultValue={displayName} maxLength={80} required /></label>
          <label className="label">Display currency<select className="field" name="currency" defaultValue={currency}>{options.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <div className="rounded-xl bg-[var(--surface-muted)] p-4">
            <p className="text-xs font-semibold">Signed in as</p>
            <p className="mt-1 break-all text-sm text-[var(--muted)]">{user.email}</p>
            <p className="mt-3 text-sm leading-5 text-[var(--muted)]">Currency changes how amounts are displayed; existing transaction amounts are not converted.</p>
          </div>
          <button className="button w-fit" type="submit">Save settings</button>
        </form>
      </section>
    </div>
  );
}
