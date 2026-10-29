# SpendFlow

SpendFlow is a personal finance app built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Storage, Recharts, Motion, and Zod. Money records stay on the server and every query is scoped to the authenticated user; PostgreSQL row-level security is the authorization boundary.

## What works

- Email/password registration, login, logout, and protected `/dashboard` routes.
- Private transaction CRUD, category/type/date filters, sorting, search, optional private receipt uploads, and CSV export.
- Monthly category budgets calculated from stored expenses, with 80% warnings and over-budget states.
- One-time and recurring bill tracking. Marking a bill paid records an expense dated on the bill's scheduled due date (not the day you click Pay) exactly once, then advances recurring due dates while preserving the original calendar anchor.
- Dashboard totals, charts, recent activity, bill reminders, and insights calculated from the signed-in user's database records. New accounts see empty states instead of sample financial data.
- Profile display name and currency preferences. Changing currency affects formatting only; it does not convert saved amounts.

Receipt images can be read with in-browser OCR before they are uploaded. OCR text is only shown for review and is not saved. Uploaded receipts are private and available as short-lived signed links.

## Requirements

- Node.js 22 or later
- npm
- A Supabase project

## Local setup

1. Install packages:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set the project's URL and anon key. These are public client credentials; never use a Supabase `service_role` key in this app.

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. In the Supabase SQL Editor, run every SQL file in `supabase/migrations` in filename order. This creates the tables and indexes, applies RLS policies, configures the private receipt bucket, and adds the atomic bill-payment workflow.

4. In Supabase Authentication settings, enable email/password sign-in. Allow the local redirect URL (`http://localhost:3000/**`) and confirm the email link after registration; it returns through `/auth/confirm`.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`, register an account, and add your own records.

## Useful commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Vercel deployment

1. Push this project to a Git provider and import it into Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Vercel project's environment variables for Preview and Production.
3. Run every SQL migration against the production Supabase project in filename order.
4. Add the deployed origin (for example, `https://your-app.vercel.app/**`) to Supabase Authentication's allowed redirect URLs. Set the site URL to the production origin.
5. Deploy from Vercel. No separate backend or scheduled job is required.

The project is prepared for Vercel, but deployment has not been performed from this workspace because no Supabase or Vercel credentials were provided.

## Security notes

- RLS is enabled on all user-owned tables. Policies compare `auth.uid()` with the record owner and apply to reads and writes.
- Every server action and export query also supplies the authenticated user's ID; client-side visibility is not the security boundary.
- Receipt storage is private. Storage policies require the first path segment to match the authenticated user's ID. Download links expire after five minutes.
- Do not add a service-role key to `.env.local`, browser code, or Vercel's `NEXT_PUBLIC_*` environment.
