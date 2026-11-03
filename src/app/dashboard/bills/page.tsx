import { CalendarClock, Plus } from "lucide-react";
import { Suspense } from "react";
import { connection } from "next/server";
import { deleteBill, markBillPaid, saveBill } from "@/app/actions";
import { Notice } from "@/components/notice";
import { PageHeading } from "@/components/page-heading";
import { PageLoading } from "@/components/page-loading";
import { CloseDetailsButton } from "@/components/close-details-button";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CATEGORIES, daysUntil, formatMoney } from "@/lib/finance";
import { formatPakistanDate, formatPakistanTimestampDate, pakistanDateParts } from "@/lib/dates";
import type { Recurrence } from "@/lib/database.types";
import { createClient, getCurrentUser, getProfile } from "@/lib/supabase/server";

type SearchParams = Promise<{ error?: string; success?: string }>;
const recurrenceLabels: Record<Recurrence, string> = {
  once: "One time",
  weekly: "Every week",
  monthly: "Every month",
  yearly: "Every year",
};

export default function BillsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<PageLoading />}><BillsContent searchParams={searchParams} /></Suspense>;
}

async function BillsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("Your session expired. Please sign in again.");
  const [billResult, profileResult] = await Promise.all([
    supabase.from("bills").select("*").eq("user_id", user.id).order("due_date"),
    getProfile(user.id),
  ]);
  if (billResult.error) throw new Error(`Could not load bills: ${billResult.error.message}`);
  if (profileResult.error) throw new Error(`Could not load preferences: ${profileResult.error.message}`);
  const bills = billResult.data || [];
  const currency = profileResult.data?.currency || "PKR";
  const unpaid = bills.filter((bill) => !(bill.recurrence === "once" && bill.last_paid_at));
  const overdue = unpaid.filter((bill) => daysUntil(bill.due_date) < 0);
  const upcoming = unpaid.filter((bill) => daysUntil(bill.due_date) >= 0);
  const todayDate = pakistanDateParts().date;
  const recurrenceOptions = Object.entries(recurrenceLabels) as [Recurrence, string][];
  return (
    <div className="page-enter">
      <PageHeading title="Bills" description="Keep recurring payments and due dates from slipping by."
        action={<a href="#add-bill" className="button button-primary-blue"><Plus size={15} />Add a bill</a>} />
      <Notice message={params.error} />
      <Notice message={params.success} type="success" />
      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <article className="panel p-5"><p className="text-sm font-medium text-[var(--muted)]">Bills to keep track of</p><p className="display mt-3 text-2xl">{bills.length}</p></article>
        <article className={`panel p-5 ${overdue.length ? "border-[var(--danger-border)] bg-[var(--danger-surface)]" : ""}`}><p className="text-sm font-medium text-[var(--muted)]">Overdue</p><p className={`display mt-3 text-2xl ${overdue.length ? "text-[var(--danger)]" : ""}`}>{overdue.length}</p></article>
        <article className="panel p-5"><p className="text-sm font-medium text-[var(--muted)]">Due within 30 days</p><p className="display mt-3 text-2xl">{upcoming.filter((bill) => daysUntil(bill.due_date) <= 30).length}</p></article>
      </section>
      <section className="panel mb-5 scroll-mt-[72px] p-4 sm:p-5 lg:scroll-mt-6" id="add-bill">
        <div className="mb-4"><h2 className="text-sm font-bold">Add a bill</h2><p className="mt-1 text-sm text-[var(--muted)]">Bill payments are recorded automatically when you mark them paid.</p></div>
        <form action={saveBill} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
          <label className="label">Bill name<input className="field" name="name" maxLength={100} placeholder="Internet, rent, electricity…" required /></label>
          <label className="label">Amount<input className="field" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required /></label>
          <label className="label">Category<select className="field" name="category" defaultValue="Home">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="label">Next due date<input className="field" name="due_date" type="date" defaultValue={todayDate} required /></label>
          <label className="label">Repeats<select className="field" name="recurrence" defaultValue="monthly">{recurrenceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button className="button" type="submit">Save bill</button>
        </form>
      </section>
      {overdue.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--danger)]"><CalendarClock size={16} />Needs attention <span className="badge badge-red">{overdue.length}</span></h2>
          <div className="grid gap-3 md:grid-cols-2">
            {overdue.map((bill) => <BillCard key={bill.id} bill={bill} currency={currency} paidToday={bill.last_paid_at ? formatPakistanTimestampDate(bill.last_paid_at) === todayDate : false} />)}
          </div>
        </section>
      )}
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Upcoming and paid</h2><span className="text-xs text-[var(--muted)]">{upcoming.length} upcoming</span></div>
        {bills.length === 0 ? (
          <div className="panel px-5 py-12 text-center"><p className="text-sm font-semibold">Your bills will have a home here.</p><p className="mt-2 text-sm text-[var(--muted)]">Add a bill above to keep its due date in sight.</p><a href="#add-bill" className="mt-4 inline-flex text-sm font-semibold underline underline-offset-2">Add your first bill</a></div>
        ) : upcoming.length === 0 && overdue.length === 0 ? (
          <div className="panel px-5 py-10 text-center text-sm text-[var(--muted)]">All one-time bills are paid. You are all caught up.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {bills.filter((bill) => !overdue.some((item) => item.id === bill.id)).map((bill) => (
              <BillCard key={bill.id} bill={bill} currency={currency} paidToday={bill.last_paid_at ? formatPakistanTimestampDate(bill.last_paid_at) === todayDate : false} paid={bill.recurrence === "once" && Boolean(bill.last_paid_at)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BillCard({
  bill, currency, paidToday, paid = false,
}: {
  bill: { id: string; name: string; amount: number; category: string; due_date: string; recurrence: Recurrence; last_paid_at: string | null };
  currency: string; paidToday: boolean; paid?: boolean;
}) {
  const remaining = daysUntil(bill.due_date);
  return (
    <article className={`panel p-4 sm:p-5 ${remaining < 0 && !paid ? "border-[var(--danger-border)]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold">{bill.name}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">{recurrenceLabels[bill.recurrence]} · Due {formatPakistanDate(bill.due_date)}</p>
        </div>
        <p className="whitespace-nowrap text-sm font-bold">{formatMoney(Number(bill.amount), currency)}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {paid ? <span className="badge badge-green">Paid</span>
          : paidToday ? <span className="badge badge-green">Marked paid today</span>
            : remaining < 0 ? <span className="badge badge-red">{Math.abs(remaining)} days overdue</span>
              : remaining === 0 ? <span className="badge badge-yellow">Due today</span>
                : <span className="badge badge-blue">Due in {remaining} days</span>}
        <div className="flex gap-2">
          {!paid && !paidToday && (remaining < 0 && bill.recurrence !== "once"
            ? <ConfirmActionForm action={markBillPaid} message={`Record a payment for every missed due date of "${bill.name}" up to today?`}><input type="hidden" name="id" value={bill.id} /><input type="hidden" name="expected_due_date" value={bill.due_date} /><button className="button button-small" type="submit">Mark paid</button></ConfirmActionForm>
            : <form action={markBillPaid}><input type="hidden" name="id" value={bill.id} /><input type="hidden" name="expected_due_date" value={bill.due_date} /><button className="button button-small" type="submit">Mark paid</button></form>)}
          <details className="relative">
            <summary className="button button-small button-secondary cursor-pointer list-none">Edit</summary>
            <div className="edit-sheet">
              <form action={saveBill} className="grid gap-3">
                <input type="hidden" name="id" value={bill.id} />
                <label className="label">Name<input className="field" name="name" defaultValue={bill.name} maxLength={100} required /></label>
                <label className="label">Amount<input className="field" name="amount" type="number" min="0.01" step="0.01" defaultValue={bill.amount} required /></label>
                <label className="label">Category<select className="field" name="category" defaultValue={bill.category}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="label">Due date<input className="field" name="due_date" type="date" defaultValue={bill.due_date} required /></label>
                <label className="label">Repeats<select className="field" name="recurrence" defaultValue={bill.recurrence}>{Object.entries(recurrenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <button className="button" type="submit">Save changes</button>
              </form>
              <ConfirmActionForm action={deleteBill} message={`Delete "${bill.name}"? This will keep any transaction already recorded for it.`} className="mt-2"><input type="hidden" name="id" value={bill.id} /><button className="button button-danger w-full" type="submit">Delete bill</button></ConfirmActionForm>
              <CloseDetailsButton />
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}
