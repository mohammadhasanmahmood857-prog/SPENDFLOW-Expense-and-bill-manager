import type { Recurrence } from "@/lib/database.types";

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
    maximumFractionDigits: 0,
  }).format(amount);
}

export function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function nextDueDate(date: string, recurrence: Recurrence) {
  const [year, month, day] = date.split("-").map(Number);
  const due = new Date(Date.UTC(year, month - 1, day));
  if (recurrence === "weekly") due.setUTCDate(due.getUTCDate() + 7);
  if (recurrence === "monthly") {
    const targetMonth = due.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(due.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
    due.setUTCDate(Math.min(day, lastDay));
    due.setUTCMonth(targetMonth);
  }
  if (recurrence === "yearly") {
    const targetYear = due.getUTCFullYear() + 1;
    const lastDay = new Date(Date.UTC(targetYear, due.getUTCMonth() + 1, 0)).getUTCDate();
    due.setUTCDate(Math.min(day, lastDay));
    due.setUTCFullYear(targetYear);
  }
  return due.toISOString().slice(0, 10);
}

export function daysUntil(date: string) {
  const today = new Date();
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${date}T00:00:00`);
  return Math.round((target.getTime() - localToday.getTime()) / 86_400_000);
}
