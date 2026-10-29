import { Suspense } from "react";
import { connection } from "next/server";
import { deleteBudget, saveBudget } from "@/app/actions";
import { Notice } from "@/components/notice";
import { PageHeading } from "@/components/page-heading";
import { PageLoading } from "@/components/page-loading";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CATEGORIES, formatMoney, monthBounds } from "@/lib/finance";
import { pakistanDateParts } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/transaction-data";

type SearchParams = Promise<{ month?: string; year?: string; error?: string; success?: string }>;

export default function BudgetsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<PageLoading />}><BudgetsContent searchParams={searchParams} /></Suspense>;
}

async function BudgetsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const now = pakistanDateParts();
  const month = /^\d{1,2}$/.test(params.month || "") ? Math.min(12, Math.max(1, Number(params.month))) : now.month;
  const year = /^\d{4}$/.test(params.year || "") ? Math.min(2200, Math.max(2000, Number(params.year))) : now.year;
  const bounds = monthBounds(year, month);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Your session expired. Please sign in again.");
  const [profileResult, budgetResult, expenses] = await Promise.all([
    supabase.from("profiles").select("currency").eq("id", user.id).maybeSingle(),
    supabase.from("budgets").select("*").eq("user_id", user.id).eq("month", month).eq("year", year).order("category"),
    listTransactions(supabase, user.id, { type: "expense", from: bounds.start, to: bounds.end }),
  ]);
  if (profileResult.error) throw new Error(`Could not load preferences: ${profileResult.error.message}`);
  if (budgetResult.error) throw new Error(`Could not load budgets: ${budgetResult.error.message}`);
  const currency = profileResult.data?.currency || "PKR";
  const spentByCategory = new Map<string, number>();
  expenses.forEach((item) => spentByCategory.set(item.category, (spentByCategory.get(item.category) || 0) + Number(item.amount)));
  const budgets = budgetResult.data || [];
  const totalBudget = budgets.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalSpent = budgets.reduce((sum, item) => sum + (spentByCategory.get(item.category) || 0), 0);
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en", { month: "long", timeZone: "UTC" });
  return (
    <div className="page-enter">
      <PageHeading title="Budgets" description="Give each category a limit that feels right for you." />
      <Notice message={params.error} />
      <Notice message={params.success} type="success" />
      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <article className="panel p-5"><p className="text-sm font-medium text-[var(--muted)]">Planned for {monthName}</p><p className="display mt-3 text-2xl">{formatMoney(totalBudget, currency)}</p></article>
        <article className="panel p-5"><p className="text-sm font-medium text-[var(--muted)]">Spent in budgeted categories</p><p className="display mt-3 text-2xl">{formatMoney(totalSpent, currency)}</p></article>
        <article className="panel p-5"><p className="text-sm font-medium text-[var(--muted)]">Left across these budgets</p><p className="display mt-3 text-2xl">{formatMoney(totalBudget - totalSpent, currency)}</p></article>
      </section>
      <section className="panel mb-5 p-4 sm:p-5">
        <div className="mb-4"><h2 className="text-sm font-bold">Set a category limit</h2><p className="mt-1 text-sm text-[var(--muted)]">Saving the same category and month updates its existing budget.</p></div>
        <form action={saveBudget} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr_auto] lg:items-end">
          <label className="label">Category<select className="field" name="category" required>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="label">Monthly amount<input className="field" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required /></label>
          <label className="label">Month<select className="field" name="month" defaultValue={month}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(Date.UTC(2024, index, 1)).toLocaleString("en", { month: "long", timeZone: "UTC" })}</option>)}</select></label>
          <label className="label">Year<input className="field" name="year" type="number" min="2000" max="2200" defaultValue={year} required /></label>
          <button className="button" type="submit">Save budget</button>
        </form>
      </section>
      <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
        <label className="label">View month<select name="month" className="field min-w-[150px]" defaultValue={month}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(Date.UTC(2024, index, 1)).toLocaleString("en", { month: "long", timeZone: "UTC" })}</option>)}</select></label>
        <label className="label">Year<input className="field w-28" name="year" type="number" min="2000" max="2200" defaultValue={year} /></label>
        <button className="button button-secondary" type="submit">View budgets</button>
      </form>
      <section className="panel p-5 sm:p-6">
        <div className="mb-5"><h2 className="text-sm font-bold">{monthName} {year} budgets</h2><p className="mt-1 text-sm text-[var(--muted)]">Warnings appear when a category reaches 80% of its limit.</p></div>
        {budgets.length === 0 ? (
          <div className="rounded-xl bg-[var(--surface-muted)] px-5 py-12 text-center"><p className="text-sm font-semibold">No budgets for {monthName} yet.</p><p className="mt-2 text-xs text-[var(--muted)]">Choose a category and set a monthly limit above.</p></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {budgets.map((budget) => {
              const spent = spentByCategory.get(budget.category) || 0;
              const percentage = Math.round(spent / Number(budget.amount) * 100);
              return (
                <article key={budget.id} className="rounded-lg border border-[var(--line)] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold">{budget.category}</h3><p className="mt-1 text-xs text-[var(--muted)]">{formatMoney(spent, currency)} of {formatMoney(Number(budget.amount), currency)}</p></div><span className={`badge ${percentage >= 100 ? "badge-red" : percentage >= 80 ? "badge-yellow" : "badge-blue"}`}>{percentage}%</span></div>
                  <div className="progress-track mt-4 h-2"><div className={`progress-value ${percentage >= 100 ? "over" : percentage >= 80 ? "warning" : ""}`} style={{ width: `${Math.min(percentage, 100)}%` }} /></div>
                  <p className={`mt-2 text-sm ${percentage >= 100 ? "text-[var(--danger)]" : percentage >= 80 ? "text-[var(--warning-ink)]" : "text-[var(--muted)]"}`}>{percentage >= 100 ? `Over by ${formatMoney(spent - Number(budget.amount), currency)}` : percentage >= 80 ? "Getting close to your limit" : `${formatMoney(Number(budget.amount) - spent, currency)} remaining`}</p>
                  <details className="mt-4 border-t border-[var(--line)] pt-3">
                    <summary className="cursor-pointer text-sm font-medium underline underline-offset-2">Edit budget</summary>
                    <form action={saveBudget} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <input type="hidden" name="category" value={budget.category} /><input type="hidden" name="month" value={month} /><input type="hidden" name="year" value={year} />
                      <label className="label">Amount<input className="field" name="amount" type="number" min="0.01" step="0.01" defaultValue={budget.amount} required /></label>
                      <button className="button button-small" type="submit">Save</button>
                    </form>
                    <ConfirmActionForm action={deleteBudget} message={`Remove the ${budget.category} budget for ${monthName} ${year}?`} className="mt-2"><input type="hidden" name="id" value={budget.id} /><button className="text-sm font-semibold text-[var(--danger)] hover:underline" type="submit">Remove this budget</button></ConfirmActionForm>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
