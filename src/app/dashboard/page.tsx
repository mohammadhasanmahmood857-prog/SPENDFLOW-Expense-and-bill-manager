import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { FinanceCharts } from "@/components/finance-charts";
import { PageHeading } from "@/components/page-heading";
import { PageLoading } from "@/components/page-loading";
import { budgetStatus, formatMoney, monthBounds, sumMoney } from "@/lib/finance";
import { formatPakistanDate, pakistanDateParts } from "@/lib/dates";
import { createClient, getCurrentUser, getProfile } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/transaction-data";
import { connection } from "next/server";

function amountValue(value: number | string | null) {
  return Number(value || 0);
}

// Splits "Rs 12,345.00" into label and number so a line can only break between them, never mid-number.
function MoneyFigure({ amount, currency }: { amount: number; currency: string }) {
  const [label, ...rest] = formatMoney(amount, currency).split(/\s/);
  if (!rest.length) return <span className="whitespace-nowrap">{label}</span>;
  return <><span className="whitespace-nowrap">{label}</span> <span className="whitespace-nowrap">{rest.join(" ")}</span></>;
}

const levelText ={ ok: "", warning: "text-[var(--warning-ink)]", reached: "text-[var(--danger)]", over: "text-[var(--danger)]" } as const;

// Dividers between the four totals: stacked on phones, a 2×2 grid on tablets, one row on wide screens.
const statDividers = [
  "",
  "border-t sm:border-t-0 sm:border-l",
  "border-t xl:border-t-0 xl:border-l",
  "border-t sm:border-l xl:border-t-0",
];

export default function DashboardPage() {
  return <Suspense fallback={<PageLoading />}><DashboardContent /></Suspense>;
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("Your session expired. Please sign in again.");
  const { year, month, day } = pakistanDateParts();
  const current = monthBounds(year, month);
  const sixMonthsAgo = new Date(Date.UTC(year, month - 6, 1));
  const historyStart = `${sixMonthsAgo.getUTCFullYear()}-${String(sixMonthsAgo.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const today = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const upcomingLimit = new Date(Date.UTC(year, month - 1, day + 30));
  const limitDate = `${upcomingLimit.getUTCFullYear()}-${String(upcomingLimit.getUTCMonth() + 1).padStart(2, "0")}-${String(upcomingLimit.getUTCDate()).padStart(2, "0")}`;

  const [profileResult, transactions, budgetResult, billResult] = await Promise.all([
    getProfile(user.id),
    listTransactions(supabase, user.id, { from: historyStart, to: current.end }),
    supabase.from("budgets").select("id,category,amount").eq("user_id", user.id).eq("month", month).eq("year", year),
    supabase.from("bills").select("id,name,amount,due_date,recurrence,last_paid_at")
      .eq("user_id", user.id).order("due_date", { ascending: true }),
  ]);
  if (profileResult.error) throw new Error(`Could not load preferences: ${profileResult.error.message}`);
  if (budgetResult.error) throw new Error(`Could not load budgets: ${budgetResult.error.message}`);
  if (billResult.error) throw new Error(`Could not load bills: ${billResult.error.message}`);
  const currency = profileResult.data?.currency || "PKR";
  const thisMonth = transactions.filter((item) => item.transaction_date >= current.start);
  const income = sumMoney(thisMonth.filter((item) => item.type === "income").map((item) => item.amount));
  const expenses = sumMoney(thisMonth.filter((item) => item.type === "expense").map((item) => item.amount));
  const categoryTotals = new Map<string, number>();
  thisMonth.filter((item) => item.type === "expense").forEach((item) => {
    categoryTotals.set(item.category, sumMoney([categoryTotals.get(item.category), item.amount]));
  });
  const budgetsData = budgetResult.data || [];
  const budgetTotal = sumMoney(budgetsData.map((item) => item.amount));
  const budgetedSpend = sumMoney(budgetsData.map((item) => categoryTotals.get(item.category)));
  const overall = budgetTotal ? budgetStatus(budgetedSpend, budgetTotal) : null;
  const categoryPoints = [...categoryTotals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const monthlyPoints = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 6 + index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const values = transactions.filter((item) => item.transaction_date.startsWith(key));
    return {
      month: date.toLocaleString("en", { month: "short", timeZone: "UTC" }),
      income: sumMoney(values.filter((item) => item.type === "income").map((item) => item.amount)),
      expenses: sumMoney(values.filter((item) => item.type === "expense").map((item) => item.amount)),
    };
  });
  const budgets = budgetsData.map((budget) => ({
    ...budget,
    spent: categoryTotals.get(budget.category) || 0,
  })).sort((a, b) => b.spent / Number(b.amount) - a.spent / Number(a.amount)).slice(0, 4);
  const unpaidBills = (billResult.data || []).filter((bill) => !(bill.recurrence === "once" && bill.last_paid_at));
  const overdueCount = unpaidBills.filter((bill) => bill.due_date < today).length;
  const bills = unpaidBills.filter((bill) => bill.due_date <= limitDate).slice(0, 4);
  const periodLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Asia/Karachi" }).format(new Date());
  const largestCategory = categoryPoints[0];
  return (
    <div className="page-enter">
      <PageHeading title="Overview"
        description={`Your finances in ${periodLabel}.`}
        action={<Link href="/dashboard/transactions" className="button button-primary-blue"><Plus size={16} />Add a transaction</Link>} />
      {/* One figure per row on phones so amounts are never cut off. */}
      <section className="panel mb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Income this month", amount: income, note: "Recorded income" },
          { label: "Spent this month", amount: expenses, note: "Recorded expenses" },
          { label: "Remaining balance", amount: sumMoney([income, -expenses]), note: "Income minus expenses" },
          { label: "Monthly budget", amount: budgetTotal, note: overall === null ? "No budget set yet" : overall.remaining < 0 ? `${overall.percent}% used · over by ${formatMoney(-overall.remaining, currency)}` : `${overall.percent}% used · ${formatMoney(overall.remaining, currency)} left` },
        ].map((item, index) => (
          <article key={item.label} className={`min-w-0 border-[var(--line)] px-4 py-4 [container-type:inline-size] sm:px-5 sm:py-5 xl:px-6 ${statDividers[index]}`}>
            <p className="text-xs font-medium text-[var(--muted)]">{item.label}</p>
            {/* Size follows the card's width (cqi), so a long total fits narrow four-column cards. */}
            <p className="mt-3 text-[clamp(1.125rem,9cqi,1.875rem)] font-semibold leading-tight tracking-[-.03em]"><MoneyFigure amount={item.amount} currency={currency} /></p>
            <p className="mt-2 text-xs text-[var(--muted)]">{item.note}</p>
          </article>
        ))}
      </section>
      {overall !== null && overall.level !== "ok" && (
        <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-lg px-4 py-3 text-sm ${overall.level === "warning" ? "bg-[var(--warning-bg)] text-[var(--warning-ink)]" : "bg-[var(--danger-bg)] text-[var(--danger)]"}`} role="status">
          <span className="size-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
          {overall.level === "over" ? `You are over your total monthly budget by ${formatMoney(-overall.remaining, currency)}.` : overall.level === "reached" ? "You have used your whole monthly budget." : `You have used ${overall.percent}% of your total monthly budget.`}
          <Link className="ml-auto shrink-0 font-semibold underline underline-offset-2" href="/dashboard/budgets">Review budgets</Link>
        </div>
      )}
      <FinanceCharts categories={categoryPoints} months={monthlyPoints} currency={currency} />
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5 sm:px-6">
            <div><h2 className="text-sm font-bold">Recent transactions</h2><p className="mt-1 text-xs text-[var(--muted)]">Your latest recorded activity</p></div>
            <Link href="/dashboard/transactions" className="flex min-h-10 shrink-0 items-center gap-1 text-xs font-semibold text-[var(--ink-soft)] hover:underline">All transactions <ArrowRight size={13} /></Link>
          </div>
          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center"><p className="text-sm font-semibold">Your first transaction starts the picture.</p><p className="mt-2 text-xs text-[var(--muted)]">Add income or an expense to see it here.</p><Link className="button button-secondary button-small mt-4" href="/dashboard/transactions"><Plus size={14} />Add transaction</Link></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Transaction</th><th className="hidden sm:table-cell">Category</th><th className="hidden sm:table-cell">Date</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{transactions.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td><span className="block break-words font-semibold">{item.description || item.category}</span><span className="mt-1 block text-xs text-[var(--muted)]">{item.type === "income" ? "Income" : "Expense"}<span className="sm:hidden"> · {item.category} · {formatPakistanDate(item.transaction_date)}</span></span></td>
                    <td className="hidden sm:table-cell">{item.category}</td><td className="hidden whitespace-nowrap text-[var(--muted)] sm:table-cell">{formatPakistanDate(item.transaction_date)}</td>
                    <td className="whitespace-nowrap text-right font-medium">{item.type === "income" ? "+" : "−"}{formatMoney(amountValue(item.amount), currency)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
        <div className="grid content-start gap-5">
          <section className="panel p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between"><div><h2 className="text-sm font-bold">Budget check-in</h2><p className="mt-1 text-xs text-[var(--muted)]">How this month is shaping up</p></div><Link href="/dashboard/budgets" aria-label="Manage budgets" className="icon-button shrink-0"><ArrowRight size={15} /></Link></div>
            {budgets.length === 0 ? <div className="rounded-xl bg-[var(--surface-muted)] p-5 text-sm leading-6 text-[var(--muted)]">Set a category budget to see how spending compares with your plan.<Link href="/dashboard/budgets" className="mt-2 block font-semibold text-[var(--ink)] underline underline-offset-2">Create a budget</Link></div> : (
              <div className="grid gap-5">{budgets.map((item) => {
                const status = budgetStatus(item.spent, Number(item.amount));
                return <div key={item.id}>
                  <div className="mb-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs"><span className="font-semibold">{item.category}</span><span className={status.level === "over" ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-soft)]"}>{formatMoney(item.spent, currency)} <span className="text-[var(--muted)]">/ {formatMoney(Number(item.amount), currency)}</span></span></div>
                  <div className="progress-track" role="progressbar" aria-label={`${item.category} budget used`} aria-valuenow={status.percent} aria-valuemin={0} aria-valuemax={100}><div className={`progress-value ${status.level === "over" || status.level === "reached" ? "over" : status.level === "warning" ? "warning" : ""}`} style={{ width: `${Math.min(status.percent, 100)}%` }} /></div>
                  {status.level !== "ok" && <p className={`mt-1.5 text-sm ${levelText[status.level]}`}>{status.level === "over" ? `Over by ${formatMoney(-status.remaining, currency)}` : status.level === "reached" ? "Limit reached" : `${status.percent}% used, approaching your limit`}</p>}
                </div>;
              })}</div>
            )}
          </section>
          <section className="panel p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between"><div><h2 className="text-sm font-bold">Bills coming up</h2><p className="mt-1 text-xs text-[var(--muted)]">Due within the next 30 days</p></div><Link href="/dashboard/bills" aria-label="View all bills" className="icon-button shrink-0"><ArrowRight size={15} /></Link></div>
            {overdueCount > 0 && <p className="mb-3 rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--danger)]">{overdueCount === 1 ? "1 overdue bill needs your attention." : `${overdueCount} overdue bills need your attention.`}</p>}
            {bills.length === 0 ? <p className="rounded-xl bg-[var(--surface-muted)] p-4 text-xs leading-5 text-[var(--muted)]">No bills are due soon. Add recurring payments to keep track of them here.</p> : (
              <div className="grid gap-1">{bills.map((bill) => <div key={bill.id} className="flex items-center gap-3 border-t border-[var(--line)] py-3 first:border-0">
                <span className={`size-2 shrink-0 rounded-full ${bill.due_date < today ? "bg-[var(--danger)]" : bill.due_date === today ? "bg-[var(--warning)]" : "bg-[var(--line-strong)]"}`} />
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{bill.name}</span><span className="text-xs text-[var(--muted)]">{bill.due_date < today ? "Overdue" : `Due ${formatPakistanDate(bill.due_date)}`}</span></span>
                <span className="text-xs font-medium">{formatMoney(amountValue(bill.amount), currency)}</span>
              </div>)}</div>
            )}
          </section>
          {largestCategory && <p className="rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm leading-5 text-[var(--ink-soft)]">Your largest recorded spending category this month is <strong>{largestCategory.name}</strong> at {formatMoney(largestCategory.value, currency)}.</p>}
        </div>
      </div>
    </div>
  );
}
