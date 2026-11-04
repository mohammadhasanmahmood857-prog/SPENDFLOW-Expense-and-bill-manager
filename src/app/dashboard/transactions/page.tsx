import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowDownToLine, Plus, Search, SlidersHorizontal } from "lucide-react";
import { deleteTransaction, saveTransaction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { PageHeading } from "@/components/page-heading";
import { PageLoading } from "@/components/page-loading";
import { CloseDetailsButton } from "@/components/close-details-button";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { SubmitButton } from "@/components/submit-button";
import { TransactionEntryForm } from "@/components/transaction-entry-form";
import { CATEGORIES, formatMoney } from "@/lib/finance";
import { formatPakistanDate, pakistanDateParts } from "@/lib/dates";
import { createClient, getCurrentUser, getProfile } from "@/lib/supabase/server";

type SearchParams = Promise<{
  q?: string; type?: string; category?: string; from?: string; to?: string;
  sort?: string; page?: string; error?: string; success?: string;
}>;

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}

export default function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<PageLoading />}><TransactionsContent searchParams={searchParams} /></Suspense>;
}

async function TransactionsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("Your session expired. Please sign in again.");
  const profileRequest = getProfile(user.id);
  const type = params.type === "income" || params.type === "expense" ? params.type : undefined;
  const category = CATEGORIES.includes(params.category as typeof CATEGORIES[number]) ? params.category : undefined;
  const from = validDate(params.from);
  const to = validDate(params.to);
  const search = (params.q || "").slice(0, 100);
  const safeSearch = search.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  const pageSize = 25;
  let page = /^\d+$/.test(params.page || "") ? Math.min(100_000, Math.max(1, Number(params.page))) : 1;
  let query = supabase.from("transactions").select("*", { count: "exact" }).eq("user_id", user.id);
  if (type) query = query.eq("type", type);
  if (category) query = query.eq("category", category);
  if (from) query = query.gte("transaction_date", from);
  if (to) query = query.lte("transaction_date", to);
  if (safeSearch) query = query.or(`description.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`);
  query = params.sort === "amount-asc"
    ? query.order("amount", { ascending: true })
    : params.sort === "amount-desc"
      ? query.order("amount", { ascending: false })
      : query.order("transaction_date", { ascending: params.sort === "date-asc" });
  query = query.order("id", { ascending: true });
  const firstPage = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (firstPage.error) throw new Error(`Could not load transactions: ${firstPage.error.message}`);
  const count = firstPage.count;
  let data = firstPage.data;
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
  if (page > totalPages && (count || 0) > 0) {
    page = totalPages;
    const result = await query.range((page - 1) * pageSize, page * pageSize - 1);
    if (result.error) throw new Error(`Could not load transactions: ${result.error.message}`);
    data = result.data;
  }
  const transactions = data || [];
  const filtered = Boolean(type || category || from || to || safeSearch);
  // One storage request for every receipt on the page instead of one per receipt.
  const receiptPaths = transactions.flatMap((item) => item.receipt_path ? [item.receipt_path] : []);
  const urlByPath = new Map<string, string>();
  if (receiptPaths.length) {
    const { data: signed, error: signedError } = await supabase.storage.from("receipts").createSignedUrls(receiptPaths, 300);
    if (signedError) console.error("Could not create receipt links:", signedError.message);
    for (const item of signed || []) {
      if (item.path && item.signedUrl && !item.error) urlByPath.set(item.path, item.signedUrl);
      else if (item.error) console.error(`Could not create receipt link for ${item.path}:`, item.error);
    }
  }
  const receiptUrls = new Map(transactions.map((item) => [item.id, item.receipt_path ? urlByPath.get(item.receipt_path) ?? null : null]));
  const { data: profile, error: profileError } = await profileRequest;
  if (profileError) throw new Error(`Could not load preferences: ${profileError.message}`);
  const currency = profile?.currency || "PKR";
  const defaultDate = pakistanDateParts().date;
  const pageQuery = (nextPage: number) => {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && ["q", "type", "category", "from", "to", "sort"].includes(key)) queryParams.set(key, value);
    }
    queryParams.set("page", String(nextPage));
    return `/dashboard/transactions?${queryParams.toString()}`;
  };
  return (
    <div className="page-enter">
      <PageHeading title="Transactions" description="Browse income and spending by date, category, or amount."
        action={<a href="/api/transactions/export" className="button button-secondary"><ArrowDownToLine size={15} />Export CSV</a>} />
      <Notice message={params.error} />
      <Notice message={params.success} type="success" />
      <details className="panel mb-5 group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden sm:px-5">
          <span className="flex items-center gap-3"><Plus size={17} className="text-[var(--ink-soft)]" /><span><b className="block text-sm">Add a transaction</b><span className="mt-1 block text-xs text-[var(--muted)]">Record income or an expense</span></span></span>
          <span className="button button-small button-primary-blue group-open:bg-[var(--surface-muted)] group-open:text-[var(--ink)]">New entry</span>
        </summary>
        <TransactionEntryForm defaultDate={defaultDate} />
      </details>
      <form className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,1fr)_auto] lg:items-end" method="get">
        <label className="label">Search<input className="field" name="q" defaultValue={params.q} placeholder="Search descriptions" /></label>
        <label className="label">Type<select className="field" name="type" defaultValue={type || ""}><option value="">All types</option><option value="expense">Expense</option><option value="income">Income</option></select></label>
        <label className="label">Category<select className="field" name="category" defaultValue={category || ""}><option value="">All categories</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label">From<input className="field" type="date" name="from" defaultValue={from} /></label>
        <label className="label">To<input className="field" type="date" name="to" defaultValue={to} /></label>
        <label className="label">Sort<select className="field" name="sort" defaultValue={params.sort || "date-desc"}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Highest amount</option><option value="amount-asc">Lowest amount</option></select></label>
        <button className="button button-secondary w-full" type="submit"><SlidersHorizontal size={14} />Filter</button>
      </form>
      <section className="panel">
        <div className="flex items-center justify-between gap-3 px-5 py-4"><div><h2 className="text-sm font-bold">Transaction history</h2><p className="mt-1 text-xs text-[var(--muted)]">{count || 0} {(count || 0) === 1 ? "record" : "records"} · page {page} of {totalPages}</p></div><Search size={16} className="text-[var(--muted)]" /></div>
        {transactions.length === 0 ? (
          <div className="border-t border-[var(--line)] px-5 py-12 text-center"><p className="text-sm font-semibold">{filtered ? "No transactions match these filters." : "Your transaction history starts here."}</p><p className="mt-2 text-sm text-[var(--muted)]">{filtered ? "Try changing the search or filters." : "Add your first income or expense above."}</p></div>
        ) : (
          <div className="table-wrap">
            {/* Columns that don't fit move under the description instead of scrolling sideways, so Edit
                stays on screen: amount and date below sm, category below lg, receipt below xl. */}
            <table className="data-table">
              <thead><tr><th>Transaction</th><th className="hidden lg:table-cell">Category</th><th className="hidden sm:table-cell">Date</th><th className="hidden xl:table-cell">Receipt</th><th className="hidden text-right sm:table-cell">Amount</th><th className="text-right">Manage</th></tr></thead>
              <tbody>{transactions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="block break-words font-semibold">{item.description || item.category}</span>
                    <span className="mt-1 block text-xs capitalize text-[var(--muted)]">{item.type}<span className="normal-case lg:hidden"> · {item.category}</span><span className="normal-case sm:hidden"> · {formatPakistanDate(item.transaction_date)}</span></span>
                    <span className="mt-1 block whitespace-nowrap font-medium sm:hidden">{item.type === "income" ? "+" : "−"}{formatMoney(Number(item.amount), currency)}</span>
                    {receiptUrls.get(item.id) && <a href={receiptUrls.get(item.id)!} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-xs font-medium text-[var(--ink-soft)] underline underline-offset-2 xl:hidden">View receipt</a>}
                  </td>
                  <td className="hidden lg:table-cell"><span className="badge badge-blue">{item.category}</span></td>
                  <td className="hidden whitespace-nowrap text-[var(--ink-soft)] sm:table-cell">{formatPakistanDate(item.transaction_date)}</td>
                  <td className="hidden xl:table-cell">{receiptUrls.get(item.id) ? <a href={receiptUrls.get(item.id)!} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-sm font-medium text-[var(--ink-soft)] underline underline-offset-2">View receipt</a> : <span className="text-sm text-[var(--muted)]">—</span>}</td>
                  <td className="hidden whitespace-nowrap text-right font-medium sm:table-cell">{item.type === "income" ? "+" : "−"}{formatMoney(Number(item.amount), currency)}</td>
                  <td className="text-right">
                    <details className="relative inline-block text-left" name="edit-menu">
                      <summary className="button button-small button-secondary cursor-pointer list-none" aria-label={`Edit ${item.description || item.category}`}>Edit</summary>
                      <div className="edit-sheet">
                        <p className="mb-3 break-words text-sm font-bold">Edit: {item.description || item.category}</p>
                        <form action={saveTransaction} className="grid gap-3">
                          <input type="hidden" name="id" value={item.id} />
                          <label className="label">Amount<input className="field" name="amount" type="number" min="0.01" step="0.01" defaultValue={item.amount} required /></label>
                          <label className="label">Type<select className="field" name="type" defaultValue={item.type}><option value="expense">Expense</option><option value="income">Income</option></select></label>
                          <label className="label">Category<select className="field" name="category" defaultValue={item.category}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
                          <label className="label">Date<input className="field" name="transaction_date" type="date" defaultValue={item.transaction_date} required /></label>
                          <label className="label">Description<input className="field" name="description" maxLength={160} defaultValue={item.description} /></label>
                          <SubmitButton className="w-full" pendingLabel="Saving…">Save changes</SubmitButton>
                        </form>
                        <ConfirmActionForm action={deleteTransaction} message="Delete this transaction? This cannot be undone." className="mt-2"><input type="hidden" name="id" value={item.id} /><button className="button button-danger w-full" type="submit">Delete transaction</button></ConfirmActionForm>
                        <CloseDetailsButton />
                      </div>
                    </details>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-4">
          <Link aria-disabled={page <= 1} className={`button button-secondary button-small ${page <= 1 ? "pointer-events-none opacity-50" : ""}`} href={pageQuery(Math.max(1, page - 1))}>Previous</Link>
          <span className="text-xs text-[var(--muted)]">Page {page} of {totalPages}</span>
          <Link aria-disabled={page >= totalPages} className={`button button-secondary button-small ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`} href={pageQuery(Math.min(totalPages, page + 1))}>Next</Link>
        </div>}
      </section>
    </div>
  );
}
