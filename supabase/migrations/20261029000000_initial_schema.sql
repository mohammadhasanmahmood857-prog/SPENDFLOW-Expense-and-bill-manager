create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  currency text not null default 'PKR' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text not null default '',
  transaction_date date not null,
  receipt_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year between 2000 and 2200),
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category, month, year)
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  recurrence text not null default 'monthly'
    check (recurrence in ('once', 'weekly', 'monthly', 'yearly')),
  last_paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);
create index if not exists transactions_user_category_idx
  on public.transactions (user_id, category);
create index if not exists budgets_user_period_idx
  on public.budgets (user_id, year, month);
create index if not exists bills_user_due_idx
  on public.bills (user_id, due_date);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.bills enable row level security;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles
  for all using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users manage their own transactions" on public.transactions;
create policy "Users manage their own transactions" on public.transactions
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own budgets" on public.budgets;
create policy "Users manage their own budgets" on public.budgets
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own bills" on public.bills;
create policy "Users manage their own bills" on public.bills
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists "Users manage receipt files in their folder" on storage.objects;
create policy "Users manage receipt files in their folder" on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
