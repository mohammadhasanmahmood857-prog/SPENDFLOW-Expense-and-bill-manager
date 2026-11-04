import type { Recurrence } from "@/lib/database.types";
import { pakistanDateParts } from "@/lib/dates";

export const CATEGORIES = [
  "Food",
  "Transport",
  "Home",
  "Shopping",
  "Health",
  "Education",
  "Entertainment",
  "Salary",
  "Freelance",
  "Other",
] as const;

export function formatMoney(amount: number, currency = "PKR") {
  // Rounds to the cent first so tiny float leftovers never print as "-Rs 0.00".
  const cents = Math.round(amount * 100);
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents === 0 ? 0 : cents / 100);
}

// Adds money in whole cents so 0.1 + 0.2 is exactly 0.3.
export function sumMoney(values: Iterable<number | string | null | undefined>) {
  let cents = 0;
  for (const value of values) cents += Math.round(Number(value || 0) * 100);
  return cents / 100;
}

export type BudgetLevel = "ok" | "warning" | "reached" | "over";

// Status comes from the exact amounts; the percentage is only a label, so 99.6% never reads as "over".
export function budgetStatus(spent: number, limit: number) {
  const spentCents = Math.round(spent * 100);
  const limitCents = Math.round(limit * 100);
  const ratio = limitCents > 0 ? spentCents / limitCents : 0;
  const level: BudgetLevel = spentCents > limitCents ? "over"
    : spentCents === limitCents ? "reached"
      : ratio >= 0.8 ? "warning" : "ok";
  const percent = level === "over" ? Math.max(101, Math.round(ratio * 100))
    : level === "reached" ? 100
      : Math.min(99, Math.floor(ratio * 100));
  return { level, percent, remaining: (limitCents - spentCents) / 100 };
}

export function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function nextDueDate(
  date: string,
  recurrence: Recurrence,
  anchorDay?: number,
  anchorMonth?: number,
) {
  const [year, month, day] = date.split("-").map(Number);
  const due = new Date(Date.UTC(year, month - 1, day));
  if (recurrence === "weekly") due.setUTCDate(due.getUTCDate() + 7);
  if (recurrence === "monthly") {
    const target = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    due.setUTCFullYear(target.getUTCFullYear(), target.getUTCMonth(), Math.min(anchorDay || day, lastDay));
  }
  if (recurrence === "yearly") {
    const targetYear = year + 1;
    const targetMonth = (anchorMonth || month) - 1;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    due.setUTCFullYear(targetYear, targetMonth, Math.min(anchorDay || day, lastDay));
  }
  return due.toISOString().slice(0, 10);
}

export function daysUntil(date: string) {
  const { year, month, day } = pakistanDateParts();
  const today = Date.UTC(year, month - 1, day);
  const [targetYear, targetMonth, targetDay] = date.split("-").map(Number);
  return Math.round((Date.UTC(targetYear, targetMonth - 1, targetDay) - today) / 86_400_000);
}
