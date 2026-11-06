import { describe, expect, it } from "vitest";
import { budgetStatus, formatMoney, monthBounds, nextDueDate, sumMoney } from "@/lib/finance";

describe("sumMoney", () => {
  it("adds in whole cents, so 0.1 + 0.2 is exactly 0.3", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it("accepts the numeric strings Postgres returns and skips empty values", () => {
    expect(sumMoney(["12345678.90", "0.10", null, undefined])).toBe(12345679);
  });

  it("handles negatives for balances", () => {
    expect(sumMoney([100, -99.6])).toBe(0.4);
  });
});

describe("formatMoney", () => {
  it("never prints a negative zero from float leftovers", () => {
    expect(formatMoney(0.1 + 0.2 - 0.3)).not.toContain("-");
  });

  it("keeps real negative amounts negative", () => {
    expect(formatMoney(-5)).toContain("-");
  });

  it("always shows two decimals", () => {
    expect(formatMoney(1234.5)).toMatch(/1,234\.50/);
  });
});

describe("budgetStatus", () => {
  it.each([
    [0, 100, "ok", 0],
    [79.99, 100, "ok", 79],
    [80, 100, "warning", 80],
    [99.6, 100, "warning", 99],
    [100, 100, "reached", 100],
    [100.01, 100, "over", 101],
    [250, 100, "over", 250],
  ] as const)("spent %s of %s is %s at %s%%", (spent, limit, level, percent) => {
    const status = budgetStatus(spent, limit);
    expect(status.level).toBe(level);
    expect(status.percent).toBe(percent);
  });

  it("decides from exact cents, so a float sum equal to the limit is reached, not over", () => {
    expect(budgetStatus(0.1 + 0.2, 0.3)).toEqual({ level: "reached", percent: 100, remaining: 0 });
  });

  it("reports what is left, negative when over", () => {
    expect(budgetStatus(30, 100).remaining).toBe(70);
    expect(budgetStatus(130.5, 100).remaining).toBe(-30.5);
  });
});

describe("monthBounds", () => {
  it.each([
    [2026, 2, "2026-02-01", "2026-02-28"],
    [2028, 2, "2028-02-01", "2028-02-29"],
    [2026, 12, "2026-12-01", "2026-12-31"],
    [2026, 4, "2026-04-01", "2026-04-30"],
  ])("%s-%s runs %s to %s", (year, month, start, end) => {
    expect(monthBounds(year, month)).toEqual({ start, end });
  });
});

describe("nextDueDate", () => {
  it("adds a week for weekly bills, across a month end", () => {
    expect(nextDueDate("2026-11-28", "weekly")).toBe("2026-12-05");
  });

  it("keeps a 31st anchor: Jan 31 → Feb 28 → Mar 31", () => {
    expect(nextDueDate("2027-01-31", "monthly", 31)).toBe("2027-02-28");
    expect(nextDueDate("2027-02-28", "monthly", 31)).toBe("2027-03-31");
  });

  it("uses 29 February in a leap year", () => {
    expect(nextDueDate("2028-01-31", "monthly", 31)).toBe("2028-02-29");
  });

  it("rolls a monthly bill over the year end", () => {
    expect(nextDueDate("2026-12-15", "monthly", 15)).toBe("2027-01-15");
  });

  it("moves a 29 February yearly bill to 28 February in common years", () => {
    expect(nextDueDate("2028-02-29", "yearly", 29, 2)).toBe("2029-02-28");
  });
});
