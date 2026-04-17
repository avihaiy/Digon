create or replace function public.get_public_finance_display_stats(months_count integer default 3)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_months integer := greatest(1, least(coalesce(months_count, 3), 12));
  current_month_start timestamp with time zone := date_trunc('month', now());
  result jsonb;
begin
  with month_bounds as (
    select
      generate_series(safe_months - 1, 0, -1) as month_offset
  ), monthly as (
    select
      mb.month_offset,
      date_trunc('month', now() - make_interval(months => mb.month_offset)) as month_start,
      date_trunc('month', now() - make_interval(months => mb.month_offset)) + interval '1 month' - interval '1 second' as month_end
    from month_bounds mb
  ), monthly_sums as (
    select
      m.month_offset,
      trim(to_char(m.month_start, 'TMMonth')) as month_label,
      (m.month_offset = 0) as is_current,
      coalesce((
        select sum(p.amount)
        from public.payments p
        where p.status = 'confirmed'
          and p.created_at >= m.month_start
          and p.created_at <= m.month_end
      ), 0) + coalesce((
        select sum(bt.amount)
        from public.budget_transactions bt
        where bt.type = 'income'
          and bt.transaction_date >= m.month_start::date
          and bt.transaction_date <= m.month_end::date
      ), 0) as income,
      coalesce((
        select sum(e.amount)
        from public.expenses e
        where e.expense_date >= m.month_start::date
          and e.expense_date <= m.month_end::date
      ), 0) + coalesce((
        select sum(bt.amount)
        from public.budget_transactions bt
        where bt.type = 'expense'
          and bt.transaction_date >= m.month_start::date
          and bt.transaction_date <= m.month_end::date
      ), 0) as expenses
    from monthly m
  ), current_totals as (
    select
      coalesce((
        select sum(p.amount)
        from public.payments p
        where p.status = 'confirmed'
          and p.created_at >= current_month_start
      ), 0) + coalesce((
        select sum(bt.amount)
        from public.budget_transactions bt
        where bt.type = 'income'
          and bt.transaction_date >= current_month_start::date
      ), 0) as this_month_income,
      coalesce((
        select sum(e.amount)
        from public.expenses e
        where e.expense_date >= current_month_start::date
      ), 0) + coalesce((
        select sum(bt.amount)
        from public.budget_transactions bt
        where bt.type = 'expense'
          and bt.transaction_date >= current_month_start::date
      ), 0) as this_month_expenses
  )
  select jsonb_build_object(
    'thisMonthIncome', ct.this_month_income,
    'thisMonthExpenses', ct.this_month_expenses,
    'thisMonthBalance', ct.this_month_income - ct.this_month_expenses,
    'monthlyData', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'label', ms.month_label,
          'month', ms.month_label,
          'isCurrent', ms.is_current,
          'income', ms.income,
          'expenses', ms.expenses,
          'balance', ms.income - ms.expenses
        ) order by ms.month_offset desc
      ),
      '[]'::jsonb
    )
  )
  into result
  from current_totals ct
  cross join monthly_sums ms;

  return result;
end;
$$;

grant execute on function public.get_public_finance_display_stats(integer) to anon, authenticated;