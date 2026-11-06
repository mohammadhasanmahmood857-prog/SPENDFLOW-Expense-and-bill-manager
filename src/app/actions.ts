"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { CATEGORIES } from "@/lib/finance";
import {
  authErrorMessage as formatAuthError,
  canChangePasswordFrom,
  newPasswordProblem,
  safeNextPath,
  signInErrorMessage,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

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
  category: z.enum(CATEGORIES),
  due_date: z.string().date(),
  recurrence: z.enum(["once", "weekly", "monthly", "yearly"]),
});

function messageUrl(path: string, message: string, type = "error") {
  return `${path}?${type}=${encodeURIComponent(message)}`;
}

async function getConfirmationRedirect(next: string) {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    || `${requestHeaders.get("x-forwarded-proto") || "http"}://${forwardedHost}`;
  const emailRedirectTo = new URL("/auth/confirm", origin);
  emailRedirectTo.searchParams.set("next", next);
  return emailRedirectTo.toString();
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

export type SignInState = {
  message: string;
  unverified: boolean;
};

export async function signIn(_previousState: SignInState, formData: FormData): Promise<SignInState> {
  const email = z.string().email().safeParse(formData.get("email"));
  const password = z.string().min(1).safeParse(formData.get("password"));
  const next = safeNextPath(formData.get("next"));
  if (!email.success || !password.success) {
    return { message: "Enter a valid email and password.", unverified: false };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });
  if (error) return signInErrorMessage(error);
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(formData: FormData) {
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("display_name"));
  const email = z.string().email().safeParse(formData.get("email"));
  const password = formData.get("password");
  const next = safeNextPath(formData.get("next"));
  if (!name.success || !email.success) {
    redirect(`${messageUrl("/signup", "Enter your name and a valid email address.")}&next=${encodeURIComponent(next)}`);
  }
  const passwordProblem = newPasswordProblem(password, formData.get("confirm_password"));
  if (passwordProblem || typeof password !== "string") {
    redirect(`${messageUrl("/signup", passwordProblem || "Enter a password.")}&next=${encodeURIComponent(next)}`);
  }
  const supabase = await createClient();
  const emailRedirectTo = await getConfirmationRedirect(next);
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password,
    options: { data: { display_name: name.data }, emailRedirectTo },
  });
  if (error) redirect(`${messageUrl("/signup", formatAuthError(error, "We could not create your account right now."))}&next=${encodeURIComponent(next)}`);
  if (!data.session) {
    redirect(`${messageUrl("/login", "Check your inbox to confirm your email, then sign in.", "notice")}&next=${encodeURIComponent(next)}`);
  }
  revalidatePath("/", "layout");
  redirect(next);
}

export type ResendVerificationState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function resendVerificationEmail(
  _previousState: ResendVerificationState,
  formData: FormData,
): Promise<ResendVerificationState> {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) {
    return { status: "error", message: "Enter a valid email address first." };
  }
  if (!getSupabaseConfig()) {
    return { status: "error", message: "Email verification is not connected right now." };
  }

  try {
    const next = safeNextPath(formData.get("next"));
    const supabase = await createClient();
    const emailRedirectTo = await getConfirmationRedirect(next);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.data,
      options: { emailRedirectTo },
    });
    if (error) {
      return { status: "error", message: formatAuthError(error, "We could not resend the confirmation email.") };
    }
  } catch (error) {
    console.error("Could not resend Supabase verification email:", error);
    return { status: "error", message: "We could not resend the confirmation email. Please try again later." };
  }

  return {
    status: "success",
    message: "If an unverified account matches this email, a confirmation email has been sent.",
  };
}

export type PasswordResetState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function requestPasswordReset(
  _previousState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) {
    return { status: "error", message: "Enter a valid email address." };
  }
  if (!getSupabaseConfig()) {
    return { status: "error", message: "Password reset is not connected right now." };
  }

  try {
    const supabase = await createClient();
    const redirectTo = await getConfirmationRedirect("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo });
    if (error) {
      // Only rate limits are shown as-is; other details could hint at whether an account exists.
      const message = formatAuthError(error, "");
      if (message.startsWith("Too many")) return { status: "error", message };
      console.error("Could not send Supabase password reset email:", error.message);
      return { status: "error", message: "We could not send the reset email right now. Please try again later." };
    }
  } catch (error) {
    console.error("Could not send Supabase password reset email:", error);
    return { status: "error", message: "We could not send the reset email right now. Please try again later." };
  }

  return {
    status: "success",
    message: "If an account exists for this email, a reset link is on its way. Open it in this browser.",
  };
}

export type UpdatePasswordState = {
  message: string;
  expired: boolean;
};

export async function updatePassword(
  _previousState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = formData.get("password");
  const passwordProblem = newPasswordProblem(password, formData.get("confirm_password"));
  if (passwordProblem || typeof password !== "string") {
    return { message: passwordProblem || "Enter a new password.", expired: false };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { message: "Your reset link has expired. Request a new one.", expired: true };
  }
  // Only a session created by a reset link in the last few minutes may set a new password (see canChangePasswordFrom).
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!canChangePasswordFrom(claimsData?.claims?.amr)) {
    return { message: "For your security, open a new reset link and set your password within 15 minutes.", expired: true };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      message: formatAuthError(error, "We could not update your password. Please try again."),
      expired: false,
    };
  }
  // Anyone else holding a session for this account (another device, or whoever prompted the reset)
  // is signed out; this browser stays signed in. Not fatal: the password itself has already changed.
  const { error: revokeError } = await supabase.auth.signOut({ scope: "others" });
  if (revokeError) console.error("Password updated, but other sessions could not be signed out:", revokeError.message);
  revalidatePath("/", "layout");
  redirect(messageUrl("/dashboard/settings", "Your password has been updated.", "success"));
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) redirect(messageUrl("/dashboard/settings", `Could not sign out: ${error.message}`));
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function saveTransaction(formData: FormData) {
  const { supabase, user } = await getUser();
  const rawReceiptPath = formData.get("receipt_path");
  if (rawReceiptPath !== null && typeof rawReceiptPath !== "string") {
    redirect(messageUrl("/dashboard/transactions", "Choose a valid receipt file."));
  }
  const receiptPath = typeof rawReceiptPath === "string" && rawReceiptPath ? rawReceiptPath : null;
  const receiptName = receiptPath?.startsWith(`${user.id}/`) ? receiptPath.slice(user.id.length + 1) : "";
  if (receiptPath && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/i.test(receiptName)) {
    redirect(messageUrl("/dashboard/transactions", "Receipt path must belong to your account."));
  }
  // From here on receiptPath is a freshly uploaded file in this user's folder; drop it if the save fails.
  async function failWithReceiptCleanup(message: string): Promise<never> {
    if (receiptPath) {
      const { error: cleanupError } = await supabase.storage.from("receipts").remove([receiptPath]);
      if (cleanupError) console.error("Could not remove receipt after transaction save failed:", cleanupError.message);
    }
    redirect(messageUrl("/dashboard/transactions", message));
  }
  const parsed = transactionSchema.safeParse({
    amount: formData.get("amount"),
    type: formData.get("type"),
    category: formData.get("category"),
    description: formData.get("description") || "",
    transaction_date: formData.get("transaction_date"),
  });
  if (!parsed.success) return failWithReceiptCleanup("Check the amount, category, type, and date.");
  const id = formData.get("id");
  let previousReceiptPath: string | null = null;
  if (typeof id === "string" && id) {
    const parsedId = z.string().uuid().safeParse(id);
    if (!parsedId.success) return failWithReceiptCleanup("Choose a valid transaction.");
    const { data: existing, error } = await supabase.from("transactions")
      .select("receipt_path").eq("id", parsedId.data).eq("user_id", user.id).maybeSingle();
    if (error) return failWithReceiptCleanup(`Could not load transaction: ${error.message}`);
    if (!existing) return failWithReceiptCleanup("That transaction was not found.");
    previousReceiptPath = existing.receipt_path;
  }
  const values = {
    ...parsed.data,
    amount: parsed.data.amount,
    user_id: user.id,
  };
  let saveError: string | null = null;
  if (typeof id === "string" && id) {
    const { data, error } = await supabase.from("transactions").update({
        ...values,
        ...(receiptPath ? { receipt_path: receiptPath } : {}),
      }).eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    saveError = error?.message || (!data ? "That transaction was not found." : null);
  } else {
    const { error } = await supabase.from("transactions").insert({
        ...values,
        receipt_path: receiptPath,
      });
    saveError = error?.message || null;
  }
  if (saveError) return failWithReceiptCleanup(`Transaction could not be saved: ${saveError}`);
  if (previousReceiptPath && receiptPath) {
    const { error: cleanupError } = await supabase.storage.from("receipts").remove([previousReceiptPath]);
    if (cleanupError) {
      console.error("Transaction saved, but the replaced receipt could not be removed:", cleanupError.message);
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/transactions");
      redirect(messageUrl("/dashboard/transactions", `Transaction saved, but the replaced receipt could not be removed: ${cleanupError.message}`));
    }
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
  const { data: deleted, error } = await supabase.from("transactions").delete()
    .eq("id", id.data).eq("user_id", user.id).select("id").maybeSingle();
  if (error) redirect(messageUrl("/dashboard/transactions", `Could not delete transaction: ${error.message}`));
  if (!deleted) redirect(messageUrl("/dashboard/transactions", "That transaction was not found."));
  let receiptCleanupError: string | null = null;
  if (transaction.receipt_path) {
    const { error: storageError } = await supabase.storage.from("receipts").remove([transaction.receipt_path]);
    if (storageError) {
      console.error("Transaction deleted, but receipt cleanup failed:", storageError.message);
      receiptCleanupError = storageError.message;
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions");
  redirect(messageUrl("/dashboard/transactions",
    receiptCleanupError ? `Transaction deleted, but its receipt could not be removed: ${receiptCleanupError}` : "Transaction deleted.",
    receiptCleanupError ? "error" : "success",
  ));
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
  const { data: deleted, error } = await supabase.from("budgets").delete()
    .eq("id", id.data).eq("user_id", user.id).select("id").maybeSingle();
  if (error) redirect(messageUrl("/dashboard/budgets", `Could not delete budget: ${error.message}`));
  if (!deleted) redirect(messageUrl("/dashboard/budgets", "That budget was not found."));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/budgets");
  redirect(messageUrl("/dashboard/budgets", "Budget deleted.", "success"));
}

export async function saveBill(formData: FormData) {
  const parsed = billSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    due_date: formData.get("due_date"),
    recurrence: formData.get("recurrence"),
  });
  if (!parsed.success) redirect(messageUrl("/dashboard/bills", "Enter a name, valid due date, amount, and recurrence."));
  const { supabase, user } = await getUser();
  const id = formData.get("id");
  const [, anchorMonth, anchorDay] = parsed.data.due_date.split("-").map(Number);
  const values = {
    ...parsed.data,
    anchor_day: anchorDay,
    anchor_month: anchorMonth,
    user_id: user.id,
  };
  let saveError: string | null = null;
  if (typeof id === "string" && id) {
    const { data, error } = await supabase.from("bills").update(values)
      .eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    saveError = error?.message || (!data ? "That bill was not found." : null);
  } else {
    const { error } = await supabase.from("bills").insert(values);
    saveError = error?.message || null;
  }
  if (saveError) redirect(messageUrl("/dashboard/bills", `Bill could not be saved: ${saveError}`));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  redirect(messageUrl("/dashboard/bills", "Bill saved.", "success"));
}

export async function markBillPaid(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  const expectedDueDate = z.string().date().safeParse(formData.get("expected_due_date"));
  if (!id.success || !expectedDueDate.success) redirect(messageUrl("/dashboard/bills", "Choose a valid bill and due date."));
  const { supabase } = await getUser();
  const { error } = await supabase.rpc("mark_bill_paid", { bill_id_input: id.data, expected_due_date: expectedDueDate.data });
  if (error) redirect(messageUrl("/dashboard/bills", `Could not mark bill paid: ${error.message}`));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  redirect(messageUrl("/dashboard/bills", "Bill marked as paid.", "success"));
}

export async function deleteBill(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect(messageUrl("/dashboard/bills", "Choose a valid bill."));
  const { supabase, user } = await getUser();
  const { data: deleted, error } = await supabase.from("bills").delete()
    .eq("id", id.data).eq("user_id", user.id).select("id").maybeSingle();
  if (error) redirect(messageUrl("/dashboard/bills", `Could not delete bill: ${error.message}`));
  if (!deleted) redirect(messageUrl("/dashboard/bills", "That bill was not found."));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  redirect(messageUrl("/dashboard/bills", "Bill deleted.", "success"));
}

export async function saveSettings(formData: FormData) {
  const currencySchema = z.string().refine(
    (currency) => Intl.supportedValuesOf("currency").includes(currency),
  );
  const parsed = z.object({
    display_name: z.string().trim().min(1).max(80),
    currency: currencySchema,
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
