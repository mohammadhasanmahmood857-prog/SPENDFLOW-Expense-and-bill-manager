import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: string | number | null) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  await connection();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response("Authentication required.", { status: 401 });
  const records: Array<{
    transaction_date: string;
    type: string;
    category: string;
    description: string;
    amount: number;
  }> = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("transactions")
      .select("transaction_date,type,category,description,amount")
      .eq("user_id", user.id).order("transaction_date", { ascending: false })
      .range(offset, offset + 999);
    if (error) {
      console.error("Transaction CSV export failed:", error.message);
      return new Response("Could not export transactions.", { status: 500 });
    }
    records.push(...data);
    if (data.length < 1000) break;
  }
  const rows = [
    ["Date", "Type", "Category", "Description", "Amount"].map(csvCell).join(","),
    ...records.map((item) => [
      item.transaction_date,
      item.type,
      item.category,
      item.description,
      item.amount,
    ].map(csvCell).join(",")),
  ];
  return new Response(`\uFEFF${rows.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="spendflow-transactions.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
