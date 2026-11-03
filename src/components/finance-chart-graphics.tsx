"use client";

// The recharts drawings, split out so finance-charts.tsx can load them after the page is interactive.
import { useSyncExternalStore } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMoney } from "@/lib/finance";

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

export function CategoryPie({ categories, fills, currency }: {
  categories: { name: string; value: number }[];
  fills: string[];
  currency: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={categories} dataKey="value" nameKey="name" innerRadius={66} outerRadius={94} paddingAngle={3} stroke="none" isAnimationActive={!reducedMotion} animationDuration={550}>
          {categories.map((item, index) => <Cell key={item.name} fill={fills[index]} />)}
        </Pie>
        <Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBars({ months, currency }: {
  months: { month: string; income: number; expenses: number }[];
  currency: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
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
  );
}
