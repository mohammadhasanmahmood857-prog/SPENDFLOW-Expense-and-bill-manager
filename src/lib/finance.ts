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
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
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
