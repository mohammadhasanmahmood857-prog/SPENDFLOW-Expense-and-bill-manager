import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Transaction, TransactionType } from "@/lib/database.types";

type TransactionRange = {
  from?: string;
  to?: string;
  type?: TransactionType;
};

export async function listTransactions(
  supabase: SupabaseClient<Database, "public">,
  userId: string,
  range: TransactionRange = {},
) {
  // Only the columns the summaries use; skipping receipt OCR text keeps the payload small.
  const transactions: Pick<Transaction, "id" | "type" | "amount" | "category" | "description" | "transaction_date">[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from("transactions").select("id,type,amount,category,description,transaction_date").eq("user_id", userId);
    if (range.type) query = query.eq("type", range.type);
    if (range.from) query = query.gte("transaction_date", range.from);
    if (range.to) query = query.lte("transaction_date", range.to);
    const { data, error } = await query.order("transaction_date", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw new Error(`Could not load transactions: ${error.message}`);
    transactions.push(...data);
    if (data.length < 1000) break;
  }
  return transactions;
}
