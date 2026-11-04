-- A transaction may only reference a bill owned by the same user.
-- Foreign-key checks bypass RLS, so the plain transactions.bill_id -> bills.id key let a
-- user attach their own transaction to another user's bill (if they knew its id) and
-- occupy that bill's (bill_id, transaction_date) slot, blocking mark_bill_paid.
-- A composite key on (bill_id, user_id) closes this at the database level.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bills_id_user_unique'
      and conrelid = 'public.bills'::regclass
  ) then
    alter table public.bills
      add constraint bills_id_user_unique unique (id, user_id);
  end if;
end;
$$;

-- Detach any transaction that points at another user's bill. The app never writes such
-- rows, so this is expected to match 0 rows; it only makes the new key safe to add.
update public.transactions t
set bill_id = null
where t.bill_id is not null
  and not exists (
    select 1 from public.bills b
    where b.id = t.bill_id and b.user_id = t.user_id
  );

alter table public.transactions
  drop constraint if exists transactions_bill_id_fkey;
alter table public.transactions
  drop constraint if exists transactions_bill_owner_fkey;

-- ON DELETE SET NULL (bill_id) needs PostgreSQL 15+ and leaves user_id untouched.
alter table public.transactions
  add constraint transactions_bill_owner_fkey
  foreign key (bill_id, user_id) references public.bills (id, user_id)
  on delete set null (bill_id);
