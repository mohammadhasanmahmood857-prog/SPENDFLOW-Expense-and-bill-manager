-- Covering index for transactions_bill_owner_fkey (bill_id, user_id), so deleting a bill
-- does not scan transactions to null out bill_id (Supabase advisor 0001).

create index if not exists transactions_bill_owner_idx
  on public.transactions (bill_id, user_id);
