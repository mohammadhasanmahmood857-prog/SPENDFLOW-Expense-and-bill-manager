-- Categories were only checked by the app (CATEGORIES in src/lib/finance.ts). Enforce the same
-- list in the database so rows written outside the app cannot break budgets and charts.
-- Pre-check on 2026-11-04: 0 transactions, 0 budgets and 0 bills used a category outside this list.
-- Added NOT VALID, then validated. Inside one migration transaction the ADD CONSTRAINT lock is
-- held until commit anyway; at SpendFlow's table sizes that lasts milliseconds.
-- Keep this list in sync with CATEGORIES: add a category here (migrate first), then deploy the app.
-- Rollback: alter table ... drop constraint <name>; for each of the three constraints.

alter table public.transactions drop constraint if exists transactions_category_known;
alter table public.transactions add constraint transactions_category_known check (category in (
  'Food', 'Transport', 'Home', 'Shopping', 'Health', 'Education', 'Entertainment', 'Salary', 'Freelance', 'Other'
)) not valid;
alter table public.transactions validate constraint transactions_category_known;

alter table public.budgets drop constraint if exists budgets_category_known;
alter table public.budgets add constraint budgets_category_known check (category in (
  'Food', 'Transport', 'Home', 'Shopping', 'Health', 'Education', 'Entertainment', 'Salary', 'Freelance', 'Other'
)) not valid;
alter table public.budgets validate constraint budgets_category_known;

alter table public.bills drop constraint if exists bills_category_known;
alter table public.bills add constraint bills_category_known check (category in (
  'Food', 'Transport', 'Home', 'Shopping', 'Health', 'Education', 'Entertainment', 'Salary', 'Freelance', 'Other'
)) not valid;
alter table public.bills validate constraint bills_category_known;
