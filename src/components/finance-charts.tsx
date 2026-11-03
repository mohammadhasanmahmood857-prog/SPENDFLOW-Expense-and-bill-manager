"use client";

import { useSyncExternalStore } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMoney } from "@/lib/finance";

const colors = ["var(--blue)", "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function categoryColor(index: number) {
  return index === 0 ? colors[0] : colors[((index - 1) % (colors.length - 1)) + 1];
}

// Reads the OS "reduce motion" setting directly instead of shipping an animation library for it.
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(reducedMotionQuery).matches, () => false);
}

type CategoryPoint = { name: string; value: number };
type MonthPoint = { month: string; income: number; expenses: number };

function ChartEmpty({ children }: { children: string }) {
  return <div className="grid h-[250px] place-items-center rounded-lg bg-[var(--surface-muted)] px-8 text-center text-sm leading-6 text-[var(--muted)]">{children}</div>;
}

export function FinanceCharts({
  categories,
  months,
  currency,
}: {
  categories: CategoryPoint[];
  months: MonthPoint[];
  currency: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <section className="panel p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-sm font-bold">Where spending goes</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">This month, by category</p>
          </div>
          {categories.length === 0 ? <ChartEmpty>Add an expense to see your spending categories here.</ChartEmpty> : (
            <div className="grid items-center gap-1 sm:grid-cols-[1.1fr_.9fr]">
              <div className="h-[240px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="value" nameKey="name" innerRadius={66} outerRadius={94} paddingAngle={3} stroke="none" isAnimationActive={!reducedMotion} animationDuration={550}>
                      {categories.map((item, index) => <Cell key={item.name} fill={categoryColor(index)} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-3 pb-3">
                {categories.slice(0, 6).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-[var(--muted)]"><i className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(index) }} /><span className="truncate">{item.name}</span></span>
                    <span className="shrink-0 font-semibold">{formatMoney(item.value, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="panel p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-sm font-bold">Income and spending</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">A six-month view of recorded transactions</p>
          </div>
          {months.every((item) => item.income === 0 && item.expenses === 0) ? <ChartEmpty>Your monthly rhythm will appear as you add transactions.</ChartEmpty> : (
            <>
              <div className="mb-3 flex items-center gap-4 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-2"><i className="size-2.5 rounded-sm bg-[var(--blue)]" />Income</span>
                <span className="flex items-center gap-2"><i className="size-2.5 rounded-sm bg-[var(--chart-1)]" />Expenses</span>
              </div>
              <div className="h-[232px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={months} margin={{ top: 4, right: 3, left: -12, bottom: 0 }} barGap={5}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(value) => new Intl.NumberFormat("en", { notation: "compact" }).format(value)} />
                  <Tooltip formatter={(value) => formatMoney(Number(value), currency)} cursor={{ fill: "var(--surface-muted)" }} />
                  <Bar dataKey="income" name="Income" fill="var(--blue)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={!reducedMotion} animationDuration={550} />
                  <Bar dataKey="expenses" name="Expenses" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={!reducedMotion} animationDuration={550} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>
    </div>
  );
}
