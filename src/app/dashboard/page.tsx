import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Plus } from "lucide-react";
import { FinanceCharts } from "@/components/finance-charts";
import { PageHeading } from "@/components/page-heading";
import { formatMoney, monthBounds } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";

function amountValue(value: number | string | null) {
  return Number(value || 0);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Your session expired. Please sign in again.");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const current = monthBounds(year, month);
  const sixMonthsAgo = new Date(year, month - 6, 1);
  const historyStart = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;
  const today = `${year}-${String(month).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const upcomingLimit = new Date(year, now.getMonth(), now.getDate() + 30);
  const limitDate = `${upcomingLimit.getFullYear()}-${String(upcomingLimit.getMonth() + 1).padStart(2, "0")}-${String(upcomingLimit.getDate()).padStart(2, "0")}`;

  const [profileResult, transactionResult, budgetResult, billResult] = await Promise.all([
    supabase.from("profiles").select("display_name,currency").eq("id", user.id).maybeSingle(),
    supabase.from("transactions").select("id,amount,type,category,description,transaction_date")
      .eq("user_id", user.id).gte("transaction_date", historyStart).lte("transaction_date", current.end)
      .order("transaction_date", { ascending: false }),
    supabase.from("budgets").select("id,category,amount").eq("user_id", user.id).eq("month", month).eq("year", year),
    supabase.from("bills").select("id,name,amount,due_date,recurrence,last_paid_at")
      .eq("user_id", user.id).order("due_date", { ascending: true }),
  ]);
  if (profileResult.error) throw new Error(`Could not load preferences: ${profileResult.error.message}`);
  if (transactionResult.error) throw new Error(`Could not load transactions: ${transactionResult.error.message}`);
  if (budgetResult.error) throw new Error(`Could not load budgets: ${budgetResult.error.message}`);
  if (billResult.error) throw new Error(`Could not load bills: ${billResult.error.message}`);
  const currency = profileResult.data?.currency || "PKR";
  const transactions = transactionResult.data || [];
  const thisMonth = transactions.filter((item) => item.transaction_date >= current.start);
  const income = thisMonth.filter((item) => item.type === "income").reduce((sum, item) => sum + amountValue(item.amount), 0);
  const expenses = thisMonth.filter((item) => item.type === "expense").reduce((sum, item) => sum + amountValue(item.amount), 0);
  const budgetTotal = (budgetResult.data || []).reduce((sum, item) => sum + amountValue(item.amount), 0);
  const utilization = budgetTotal ? Math.round((expenses / budgetTotal) * 100) : null;
  const categoryTotals = new Map<string, number>();
  thisMonth.filter((item) => item.type === "expense").forEach((item) => {
    categoryTotals.set(item.category, (categoryTotals.get(item.category) || 0) + amountValue(item.amount));
  });
  const categoryPoints = [...categoryTotals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const monthlyPoints = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 6 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const values = transactions.filter((item) => item.transaction_date.startsWith(key));
    return {
      month: date.toLocaleString("en", { month: "short" }),
      income: values.filter((item) => item.type === "income").reduce((sum, item) => sum + amountValue(item.amount), 0),
      expenses: values.filter((item) => item.type === "expense").reduce((sum, item) => sum + amountValue(item.amount), 0),
    };
  });
  const budgets = (budgetResult.data || []).map((budget) => ({
    ...budget,
    spent: categoryTotals.get(budget.category) || 0,
  })).sort((a, b) => b.spent / Number(b.amount) - a.spent / Number(a.amount)).slice(0, 4);
  const bills = (billResult.data || []).filter((bill) => bill.due_date <= limitDate).slice(0, 4);
  const overdueCount = bills.filter((bill) => bill.due_date < today).length;
  const largestCategory = categoryPoints[0];
  const greetingName = profileResult.data?.display_name || user.email?.split("@")[0] || "there";

  return (
    <div className="page-enter">
      <PageHeading title={`Good ${now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening"}, ${greetingName}.`}
        description={now.toLocaleString("en", { month: "long", year: "numeric" })}
        action={<Link href="/dashboard/transactions" className="button"><Plus size={16} />Add a transaction</Link>} />
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Income this month", amount: income, icon: ArrowDownLeft, color: "text-[#1c8b69]", note: "Money recorded as received" },
          { label: "Spent this month", amount: expenses, icon: ArrowUpRight, color: "text-[#c95348]", note: "Expenses recorded so far" },
          { label: "Remaining balance", amount: income - expenses, icon: ArrowRight, color: "text-[#265be8]", note: "Income minus expenses" },
        ].map((item) => (
          <article key={item.label} className="panel p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#788480]">{item.label}</span><item.icon size={16} className={item.color} /></div>
            <p className="display mt-4 text-[29px] leading-none">{formatMoney(item.amount, currency)}</p>
            <p className="mt-3 text-[11px] text-[#788480]">{item.note}</p>
          </article>
        ))}
        <article className="panel bg-[#172321] p-5 text-white">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#bac7c2]">Monthly budget</span><span className="size-2 rounded-full bg-[#f4c84a]" /></div>
          <p className="display mt-4 text-[29px] leading-none">{budgetTotal ? formatMoney(budgetTotal, currency) : "Not set yet"}</p>
          <p className="mt-3 text-[11px] text-[#bac7c2]">{utilization === null ? "Add a budget to track your limits" : `${utilization}% used · ${formatMoney(budgetTotal - expenses, currency)} left`}</p>
        </article>
      </section>
      {utilization !== null && utilization >= 80 && (
        <div className={`mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${utilization >= 100 ? "bg-[#fff0ee] text-[#a9433a]" : "bg-[#fff6d8] text-[#775a0d]"}`} role="status">
          <span className="size-2 shrink-0 rounded-full bg-current" />
          {utilization >= 100 ? "You have reached or exceeded your total monthly budgets." : `You have used ${utilization}% of your total monthly budget.`}
          <Link className="ml-auto shrink-0 font-semibold underline underline-offset-2" href="/dashboard/budgets">Review budgets</Link>
        </div>
      )}
      <FinanceCharts categories={categoryPoints} months={monthlyPoints} currency={currency} />
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between px-5 pb-2 pt-5 sm:px-6">
            <div><h2 className="text-sm font-bold">Recent transactions</h2><p className="mt-1 text-xs text-[#788480]">Your latest recorded activity</p></div>
            <Link href="/dashboard/transactions" className="flex items-center gap-1 text-xs font-semibold text-[#265be8]">All transactions <ArrowRight size={13} /></Link>
          </div>
          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center"><p className="text-sm font-semibold">Your first transaction starts the picture.</p><p className="mt-2 text-xs text-[#788480]">Add income or an expense to see it here.</p><Link className="button button-secondary button-small mt-4" href="/dashboard/transactions"><Plus size={14} />Add transaction</Link></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{transactions.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td><span className="block font-semibold">{item.description || item.category}</span><span className="mt-1 block text-[11px] text-[#788480]">{item.type === "income" ? "Income" : "Expense"}</span></td>
                    <td>{item.category}</td><td className="whitespace-nowrap text-[#788480]">{new Date(`${item.transaction_date}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
                    <td className={`whitespace-nowrap text-right font-semibold ${item.type === "income" ? "text-[#1c8b69]" : ""}`}>{item.type === "income" ? "+" : "−"}{formatMoney(amountValue(item.amount), currency)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
        <div className="grid content-start gap-5">
          <section className="panel p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between"><div><h2 className="text-sm font-bold">Budget check-in</h2><p className="mt-1 text-xs text-[#788480]">How this month is shaping up</p></div><Link href="/dashboard/budgets" aria-label="Manage budgets" className="icon-button !size-8"><ArrowRight size={15} /></Link></div>
            {budgets.length === 0 ? <div className="rounded-xl bg-[#f7f8f6] p-5 text-sm leading-6 text-[#788480]">Set a category budget to see how spending compares with your plan.<Link href="/dashboard/budgets" className="mt-2 block font-semibold text-[#265be8]">Create a budget</Link></div> : (
              <div className="grid gap-5">{budgets.map((item) => {
                const percent = Math.round(item.spent / Number(item.amount) * 100);
                return <div key={item.id}>
                  <div className="mb-2 flex justify-between gap-3 text-xs"><span className="font-semibold">{item.category}</span><span className={percent >= 100 ? "font-semibold text-[#c95348]" : "text-[#788480]"}>{formatMoney(item.spent, currency)} <span className="text-[#a4afaa]">/ {formatMoney(Number(item.amount), currency)}</span></span></div>
                  <div className="progress-track"><div className={`progress-value ${percent >= 100 ? "over" : percent >= 80 ? "warning" : ""}`} style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                  {percent >= 80 && <p className={`mt-1.5 text-[10px] ${percent >= 100 ? "text-[#c95348]" : "text-[#927020]"}`}>{percent >= 100 ? "Budget exceeded" : `${percent}% used — approaching your limit`}</p>}
                </div>;
              })}</div>
            )}
          </section>
          <section className="panel p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between"><div><h2 className="text-sm font-bold">Bills coming up</h2><p className="mt-1 text-xs text-[#788480]">Due within the next 30 days</p></div><Link href="/dashboard/bills" aria-label="View all bills" className="icon-button !size-8"><ArrowRight size={15} /></Link></div>
            {overdueCount > 0 && <p className="mb-3 rounded-lg bg-[#fff0ee] px-3 py-2 text-xs font-semibold text-[#a9433a]">{overdueCount} overdue {overdueCount === 1 ? "bill" : "bills"} need your attention.</p>}
            {bills.length === 0 ? <p className="rounded-xl bg-[#f7f8f6] p-4 text-xs leading-5 text-[#788480]">No bills are due soon. Add recurring payments to keep track of them here.</p> : (
              <div className="grid gap-1">{bills.map((bill) => <div key={bill.id} className="flex items-center gap-3 border-t border-[#edf0ee] py-3 first:border-0">
                <span className={`size-2 shrink-0 rounded-full ${bill.due_date < today ? "bg-[#c95348]" : "bg-[#f4c84a]"}`} />
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{bill.name}</span><span className="text-[11px] text-[#788480]">{bill.due_date < today ? "Overdue" : `Due ${new Date(`${bill.due_date}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })}`}</span></span>
                <span className="text-xs font-semibold">{formatMoney(amountValue(bill.amount), currency)}</span>
              </div>)}</div>
            )}
          </section>
          {largestCategory && <p className="rounded-xl bg-[#edf2ff] px-4 py-3 text-xs leading-5 text-[#526aa0]">Your largest recorded spending category this month is <strong className="text-[#24459a]">{largestCategory.name}</strong> at {formatMoney(largestCategory.value, currency)}.</p>}
        </div>
      </div>
    </div>
  );
}
