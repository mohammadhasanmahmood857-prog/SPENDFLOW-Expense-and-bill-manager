alter table public.bills
  add column if not exists category text not null default 'Home',
  add column if not exists anchor_day smallint,
  add column if not exists anchor_month smallint;

update public.bills
set anchor_day = extract(day from due_date)::smallint,
    anchor_month = extract(month from due_date)::smallint
where anchor_day is null or anchor_month is null;

alter table public.bills
  alter column anchor_day set not null,
  alter column anchor_month set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bills_anchor_day_check'
      and conrelid = 'public.bills'::regclass
  ) then
    alter table public.bills
      add constraint bills_anchor_day_check check (anchor_day between 1 and 31);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'bills_anchor_month_check'
      and conrelid = 'public.bills'::regclass
  ) then
    alter table public.bills
      add constraint bills_anchor_month_check check (anchor_month between 1 and 12);
  end if;
end;
$$;

alter table public.transactions
  add column if not exists bill_id uuid references public.bills (id) on delete set null;

create unique index if not exists transactions_bill_date_unique
  on public.transactions (bill_id, transaction_date);

drop function if exists public.mark_bill_paid(uuid, date);

create function public.mark_bill_paid(bill_id_input uuid, expected_due_date date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  bill_row public.bills%rowtype;
  next_due date;
  target_month date;
  month_end date;
  pakistan_today date;
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

  insert into public.transactions (
    user_id, bill_id, amount, type, category, description, transaction_date
  ) values (
    bill_row.user_id, bill_row.id, bill_row.amount, 'expense', bill_row.category,
    bill_row.name, bill_row.due_date
  )
  on conflict (bill_id, transaction_date) do nothing;

  if bill_row.recurrence = 'weekly' then
    next_due := bill_row.due_date + 7;
  elsif bill_row.recurrence = 'monthly' then
    target_month := (date_trunc('month', bill_row.due_date) + interval '1 month')::date;
    month_end := (date_trunc('month', target_month) + interval '1 month - 1 day')::date;
    next_due := make_date(
      extract(year from target_month)::integer,
      extract(month from target_month)::integer,
      least(bill_row.anchor_day, extract(day from month_end)::integer)
    );
  elsif bill_row.recurrence = 'yearly' then
    target_month := make_date(extract(year from bill_row.due_date)::integer + 1, bill_row.anchor_month, 1);
    month_end := (date_trunc('month', target_month) + interval '1 month - 1 day')::date;
    next_due := make_date(
      extract(year from target_month)::integer,
      bill_row.anchor_month,
      least(bill_row.anchor_day, extract(day from month_end)::integer)
    );
  end if;

  if next_due is not null then
    pakistan_today := to_date(
      to_char(now() at time zone 'Asia/Karachi', 'YYYY-MM-DD'),
      'YYYY-MM-DD'
    );
    while next_due <= pakistan_today loop
      if bill_row.recurrence = 'weekly' then
        next_due := next_due + 7;
      elsif bill_row.recurrence = 'monthly' then
        target_month := (date_trunc('month', next_due) + interval '1 month')::date;
        month_end := (date_trunc('month', target_month) + interval '1 month - 1 day')::date;
        next_due := make_date(
          extract(year from target_month)::integer,
          extract(month from target_month)::integer,
          least(bill_row.anchor_day, extract(day from month_end)::integer)
        );
      else
        target_month := make_date(extract(year from next_due)::integer + 1, bill_row.anchor_month, 1);
        month_end := (date_trunc('month', target_month) + interval '1 month - 1 day')::date;
        next_due := make_date(
          extract(year from target_month)::integer,
          bill_row.anchor_month,
          least(bill_row.anchor_day, extract(day from month_end)::integer)
        );
      end if;
    end loop;
  end if;

  update public.bills
  set due_date = coalesce(next_due, bill_row.due_date),
      last_paid_at = now()
  where id = bill_row.id;
end;
$$;

grant execute on function public.mark_bill_paid(uuid, date) to authenticated;
