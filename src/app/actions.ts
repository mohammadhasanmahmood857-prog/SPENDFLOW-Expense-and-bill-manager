"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CATEGORIES, nextDueDate } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import type { Recurrence, TransactionType } from "@/lib/database.types";

const transactionSchema = z.object({
  amount: z.coerce.number().positive().max(999999999),
  type: z.enum(["income", "expense"]),
  category: z.enum(CATEGORIES),
  description: z.string().trim().max(160),
  transaction_date: z.string().date(),
});
const budgetSchema = z.object({
  category: z.enum(CATEGORIES),
  amount: z.coerce.number().positive().max(999999999),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
});
const billSchema = z.object({
  name: z.string().trim().min(1).max(100),
  amount: z.coerce.number().positive().max(999999999),
  due_date: z.string().date(),
  recurrence: z.enum(["once", "weekly", "monthly", "yearly"]),
});

function messageUrl(path: string, message: string, type = "error") {
  return `${path}?${type}=${encodeURIComponent(message)}`;
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

async function getReceipt(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, formData: FormData) {
  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) return null;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error("Choose a JPG, PNG, WebP, or PDF file under 5 MB.");
  }
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Receipt upload failed: ${error.message}`);
  return path;
}

export async function signIn(formData: FormData) {
  const email = z.string().email().safeParse(formData.get("email"));
  const password = z.string().min(1).safeParse(formData.get("password"));
  if (!email.success || !password.success) redirect(messageUrl("/login", "Enter a valid email and password."));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });
  if (error) redirect(messageUrl("/login", error.message));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("display_name"));
  const email = z.string().email().safeParse(formData.get("email"));
  const password = z.string().min(8).safeParse(formData.get("password"));
  if (!name.success || !email.success || !password.success) {
    redirect(messageUrl("/signup", "Use a name, valid email, and password with at least 8 characters."));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { data: { display_name: name.data } },
  });
  if (error) redirect(messageUrl("/signup", error.message));
  if (!data.session) {
    redirect(messageUrl("/login", "Check your inbox to confirm your email, then sign in.", "notice"));
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) redirect(messageUrl("/dashboard/settings", `Could not sign out: ${error.message}`));
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function saveTransaction(formData: FormData) {
  const parsed = transactionSchema.safeParse({
    amount: formData.get("amount"),
    type: formData.get("type"),
    category: formData.get("category"),
    description: formData.get("description") || "",
    transaction_date: formData.get("transaction_date"),
  });
  if (!parsed.success) redirect(messageUrl("/dashboard/transactions", "Check the amount, category, type, and date."));
  const { supabase, user } = await getUser();
  const id = formData.get("id");
  let receiptPath: string | null = null;
  try {
    receiptPath = await getReceipt(supabase, user.id, formData);
  } catch (error) {
    redirect(messageUrl("/dashboard/transactions", error instanceof Error ? error.message : "Receipt upload failed."));
  }
  const values = {
    ...parsed.data,
    amount: parsed.data.amount,
    type: parsed.data.type as TransactionType,
    user_id: user.id,
  };
  const result = typeof id === "string" && id
    ? await supabase.from("transactions").update({
        ...values,
        ...(receiptPath ? { receipt_path: receiptPath } : {}),
      }).eq("id", id).eq("user_id", user.id)
    : await supabase.from("transactions").insert({
        ...values,
        receipt_path: receiptPath,
      });
  if (result.error) {
    if (receiptPath) await supabase.storage.from("receipts").remove([receiptPath]);
    redirect(messageUrl("/dashboard/transactions", `Transaction could not be saved: ${result.error.message}`));
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions");
  redirect(messageUrl("/dashboard/transactions", "Transaction saved.", "success"));
}

export async function deleteTransaction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect(messageUrl("/dashboard/transactions", "Choose a valid transaction."));
  const { supabase, user } = await getUser();
  const { data: transaction, error: findError } = await supabase.from("transactions")
    .select("receipt_path").eq("id", id.data).eq("user_id", user.id).maybeSingle();
  if (findError) redirect(messageUrl("/dashboard/transactions", `Could not load transaction: ${findError.message}`));
  if (!transaction) redirect(messageUrl("/dashboard/transactions", "That transaction was not found."));
  const { error } = await supabase.from("transactions").delete().eq("id", id.data).eq("user_id", user.id);
  if (error) redirect(messageUrl("/dashboard/transactions", `Could not delete transaction: ${error.message}`));
  if (transaction.receipt_path) {
    const { error: storageError } = await supabase.storage.from("receipts").remove([transaction.receipt_path]);
    if (storageError) console.error("Transaction deleted, but receipt cleanup failed:", storageError.message);
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions");
  redirect(messageUrl("/dashboard/transactions", "Transaction deleted.", "success"));
}

export async function saveBudget(formData: FormData) {
  const parsed = budgetSchema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    month: formData.get("month"),
    year: formData.get("year"),
  });
  if (!parsed.success) redirect(messageUrl("/dashboard/budgets", "Enter a valid category, month, year, and amount."));
  const { supabase, user } = await getUser();
  const { error } = await supabase.from("budgets").upsert(
    { ...parsed.data, user_id: user.id },
    { onConflict: "user_id,category,month,year" },
  );
  if (error) redirect(messageUrl("/dashboard/budgets", `Budget could not be saved: ${error.message}`));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/budgets");
  redirect(messageUrl("/dashboard/budgets", "Budget saved.", "success"));
}

export async function deleteBudget(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect(messageUrl("/dashboard/budgets", "Choose a valid budget."));
  const { supabase, user } = await getUser();
  const { error } = await supabase.from("budgets").delete().eq("id", id.data).eq("user_id", user.id);
  if (error) redirect(messageUrl("/dashboard/budgets", `Could not delete budget: ${error.message}`));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/budgets");
  redirect(messageUrl("/dashboard/budgets", "Budget deleted.", "success"));
}

export async function saveBill(formData: FormData) {
  const parsed = billSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    due_date: formData.get("due_date"),
    recurrence: formData.get("recurrence"),
  });
  if (!parsed.success) redirect(messageUrl("/dashboard/bills", "Enter a name, valid due date, amount, and recurrence."));
  const { supabase, user } = await getUser();
  const id = formData.get("id");
  const values = { ...parsed.data, user_id: user.id };
  const result = typeof id === "string" && id
    ? await supabase.from("bills").update(values).eq("id", id).eq("user_id", user.id)
    : await supabase.from("bills").insert(values);
  if (result.error) redirect(messageUrl("/dashboard/bills", `Bill could not be saved: ${result.error.message}`));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  redirect(messageUrl("/dashboard/bills", "Bill saved.", "success"));
}

export async function markBillPaid(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect(messageUrl("/dashboard/bills", "Choose a valid bill."));
  const { supabase, user } = await getUser();
  const { data: bill, error: findError } = await supabase.from("bills")
    .select("due_date,recurrence").eq("id", id.data).eq("user_id", user.id).maybeSingle();
  if (findError) redirect(messageUrl("/dashboard/bills", `Could not load bill: ${findError.message}`));
  if (!bill) redirect(messageUrl("/dashboard/bills", "That bill was not found."));
  let dueDate = bill.due_date;
  if (bill.recurrence !== "once") {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    do {
      dueDate = nextDueDate(dueDate, bill.recurrence as Recurrence);
    } while (dueDate <= todayString);
  }
  const { error } = await supabase.from("bills").update({
    due_date: dueDate,
    last_paid_at: new Date().toISOString(),
  }).eq("id", id.data).eq("user_id", user.id);
  if (error) redirect(messageUrl("/dashboard/bills", `Could not mark bill paid: ${error.message}`));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  redirect(messageUrl("/dashboard/bills", "Bill marked as paid.", "success"));
}

export async function deleteBill(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect(messageUrl("/dashboard/bills", "Choose a valid bill."));
  const { supabase, user } = await getUser();
  const { error } = await supabase.from("bills").delete().eq("id", id.data).eq("user_id", user.id);
  if (error) redirect(messageUrl("/dashboard/bills", `Could not delete bill: ${error.message}`));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  redirect(messageUrl("/dashboard/bills", "Bill deleted.", "success"));
}

export async function saveSettings(formData: FormData) {
  const parsed = z.object({
    display_name: z.string().trim().min(1).max(80),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }).safeParse({
    display_name: formData.get("display_name"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) redirect(messageUrl("/dashboard/settings", "Enter a name and a valid three-letter currency code."));
  const { supabase, user } = await getUser();
  const { error: authError } = await supabase.auth.updateUser({
    data: { display_name: parsed.data.display_name },
  });
  if (authError) redirect(messageUrl("/dashboard/settings", `Profile could not be updated: ${authError.message}`));
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: parsed.data.display_name,
    currency: parsed.data.currency,
  });
  if (error) redirect(messageUrl("/dashboard/settings", `Preferences could not be saved: ${error.message}`));
  revalidatePath("/dashboard", "layout");
  redirect(messageUrl("/dashboard/settings", "Settings saved.", "success"));
}
