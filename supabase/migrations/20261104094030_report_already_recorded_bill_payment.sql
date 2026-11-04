-- Marking a bill paid must never succeed silently without recording a payment.
-- Before: if every due date being paid already had a payment row (e.g. the due date was edited
-- back to a date that was already paid), "on conflict do nothing" skipped the insert, yet the
-- bill still moved to its next due date. Now the function counts the rows it actually inserts
-- and raises a clear error when that count is zero, leaving the bill unchanged.
-- Everything else (row lock, expected_due_date guard, missed-period loop, 520 cap) is unchanged.
-- Rollback: re-run the function from 20261102000000_record_missed_bill_payments.sql.

create or replace function public.mark_bill_paid(bill_id_input uuid, expected_due_date date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  bill_row public.bills%rowtype;
  pay_date date;
  target_month date;
  month_end date;
  pakistan_today date;
  periods integer := 0;
  inserted_now integer;
  inserted_total integer := 0;
begin
  select * into bill_row
  from public.bills
  where id = bill_id_input and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Bill not found or access denied.';
  end if;

  if bill_row.due_date <> expected_due_date then
    return;
  end if;

  if bill_row.recurrence = 'once' and bill_row.last_paid_at is not null then
    return;
  end if;

  pakistan_today := (now() at time zone 'Asia/Karachi')::date;
  pay_date := bill_row.due_date;

  loop
    insert into public.transactions (
      user_id, bill_id, amount, type, category, description, transaction_date
    ) values (
      bill_row.user_id, bill_row.id, bill_row.amount, 'expense', bill_row.category,
      bill_row.name, pay_date
    )
    on conflict (bill_id, transaction_date) do nothing;
    get diagnostics inserted_now = row_count;
    inserted_total := inserted_total + inserted_now;
    periods := periods + 1;

    exit when bill_row.recurrence = 'once';

    if bill_row.recurrence = 'weekly' then
      pay_date := pay_date + 7;
    elsif bill_row.recurrence = 'monthly' then
      target_month := (date_trunc('month', pay_date) + interval '1 month')::date;
      month_end := (target_month + interval '1 month - 1 day')::date;
      pay_date := make_date(
        extract(year from target_month)::integer,
        extract(month from target_month)::integer,
        least(bill_row.anchor_day, extract(day from month_end)::integer)
      );
    else
      target_month := make_date(extract(year from pay_date)::integer + 1, bill_row.anchor_month, 1);
      month_end := (target_month + interval '1 month - 1 day')::date;
      pay_date := make_date(
        extract(year from target_month)::integer,
        bill_row.anchor_month,
        least(bill_row.anchor_day, extract(day from month_end)::integer)
      );
    end if;

    exit when pay_date > pakistan_today;

    -- Guards against a mistyped due date far in the past creating thousands of rows.
    if periods >= 520 then
      raise exception 'This bill has too many missed payments to record at once. Update its due date first.';
    end if;
  end loop;

  if inserted_total = 0 then
    raise exception 'A payment for % is already recorded for this bill. Check its due date before marking it paid again.',
      to_char(bill_row.due_date, 'DD Mon YYYY');
  end if;

  update public.bills
  set due_date = pay_date,
      last_paid_at = now()
  where id = bill_row.id;
end;
$$;

grant execute on function public.mark_bill_paid(uuid, date) to authenticated;
