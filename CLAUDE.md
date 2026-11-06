@AGENTS.md

# SpendFlow

Personal expense and bill manager. Next.js 16 App Router (cacheComponents, `src/proxy.ts` instead of middleware), React 19, TypeScript, Tailwind 4, Supabase (Auth, Postgres with RLS, private Storage), deployed on Vercel.

- Production: https://spendflow-expense-and-bill-manager.vercel.app (every push to `main` deploys).
- Supabase project ref: `rzhuphkpvdgdmslmtrju`. Vercel functions run in `dub1`, next to the database.
- Users are real and the data is financial. Treat production as live.

## Map
- `src/app/actions.ts`: all server actions (auth, transactions, budgets, bills, settings). Every write validates with zod and also filters by `user_id`, on top of RLS.
- `src/proxy.ts` + `src/lib/supabase/proxy.ts`: session refresh, the signed-out `/dashboard` redirect, and the signed-in redirect away from `/login` and `/signup`. Redirects carry refreshed cookies and no-store headers.
- `src/lib/supabase/server.ts` (per-request `cache()` for user and profile), `browser.ts` (used only for receipt upload).
- `src/lib/finance.ts`: money maths. Sum with `sumMoney` (whole cents) and decide budget state with `budgetStatus`; never compare rounded percentages.
- `src/lib/auth.ts`: `safeNextPath` guards every redirect target.
- `supabase/migrations/`: schema history. File versions match production's migration history 1:1.

## Commands
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
CI (`.github/workflows/ci.yml`) runs the same on every push. Local machine is on Node 20.11, which is why Tailwind is pinned at 4.3.3 (4.3.4 needs Node 22+); Vercel builds on Node 26.

## Rules
- **Database changes go through a new migration file**, applied with `npx supabase migration list --remote=rzhuphkpvdgdmslmtrju`, then `npx supabase db push --remote=…`. Never hand-run SQL in the editor, never `--include-all`, `db reset` or `db pull` against production.
- **No direct production writes** (SQL, auth tables, storage) without the user's explicit approval for that specific write.
- **Test data only on the QA accounts** `spendflow-qa-a@example.test` / `spendflow-qa-b@example.test`. Never read or change real users' rows.
- Never print or commit `.env*` values. The anon key is public; a `service_role` key must never appear in this app.
- Money forms use `SubmitButton` (useFormStatus) so a double click can't save twice.
- Keep `/reset-password` out of the proxy matcher: recovery links sign the user in before they choose a password.
- Before calling something done: lint, typecheck, test and build pass, and the change is checked in a real browser at phone (320–430px) and desktop widths.
