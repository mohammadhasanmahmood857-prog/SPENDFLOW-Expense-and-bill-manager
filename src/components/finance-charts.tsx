"use client";

import dynamic from "next/dynamic";
import { formatMoney } from "@/lib/finance";

// recharts is the heaviest client library; it loads after the page instead of blocking it.
// The fixed-height boxes around each chart keep the layout from shifting while it loads.
const CategoryPie = dynamic(() => import("./finance-chart-graphics").then((m) => m.CategoryPie), { ssr: false });
const MonthlyBars = dynamic(() => import("./finance-chart-graphics").then((m) => m.MonthlyBars), { ssr: false });

const colors = ["var(--blue)", "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function categoryColor(index: number) {
  return index === 0 ? colors[0] : colors[((index - 1) % (colors.length - 1)) + 1];
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
                <CategoryPie categories={categories} fills={categories.map((_, index) => categoryColor(index))} currency={currency} />
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
                <MonthlyBars months={months} currency={currency} />
              </div>
            </>
          )}
        </section>
    </div>
  );
}
