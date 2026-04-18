CREATE OR REPLACE FUNCTION public.get_public_finance_display_stats(months_count integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  safe_months integer := greatest(1, least(coalesce(months_count, 3), 12));
  current_month_start timestamp with time zone := date_trunc('month', now());
  this_month_income numeric := 0;
  this_month_expenses numeric := 0;
  monthly_json jsonb;
begin
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
    ), 0),
    coalesce((
      select sum(e.amount)
      from public.expenses e
      where e.expense_date >= current_month_start::date
    ), 0) + coalesce((
      select sum(bt.amount)
      from public.budget_transactions bt
      where bt.type = 'expense'
        and bt.transaction_date >= current_month_start::date
    ), 0)
  into this_month_income, this_month_expenses;

  with month_bounds as (
    select generate_series(safe_months - 1, 0, -1) as month_offset
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
  )
  select coalesce(
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
  into monthly_json
  from monthly_sums ms;

  return jsonb_build_object(
    'thisMonthIncome', this_month_income,
    'thisMonthExpenses', this_month_expenses,
    'thisMonthBalance', this_month_income - this_month_expenses,
    'monthlyData', monthly_json
  );
end;
$function$;