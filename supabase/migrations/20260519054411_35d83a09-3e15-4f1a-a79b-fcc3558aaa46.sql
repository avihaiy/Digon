
CREATE OR REPLACE FUNCTION public.apply_credit_fifo(_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  charge_row RECORD;
  pay_row RECORD;
  credit NUMERIC;
  to_apply NUMERIC;
  charge_remaining NUMERIC;
  total_applied NUMERIC := 0;
BEGIN
  IF NOT public.is_manager(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  FOR charge_row IN
    SELECT id, remaining_balance
    FROM public.member_charges
    WHERE member_id = _member_id AND remaining_balance > 0
    ORDER BY charge_date ASC, created_at ASC
  LOOP
    charge_remaining := charge_row.remaining_balance;

    FOR pay_row IN
      SELECT p.id,
             p.amount - COALESCE((
               SELECT SUM(cp.amount) FROM public.charge_payments cp WHERE cp.payment_id = p.id
             ), 0) AS credit
      FROM public.payments p
      WHERE p.member_id = _member_id AND p.status = 'confirmed'
      ORDER BY p.created_at ASC
    LOOP
      EXIT WHEN charge_remaining <= 0;
      credit := pay_row.credit;
      IF credit IS NULL OR credit <= 0 THEN
        CONTINUE;
      END IF;
      to_apply := LEAST(charge_remaining, credit);
      INSERT INTO public.charge_payments (charge_id, payment_id, amount)
      VALUES (charge_row.id, pay_row.id, to_apply);
      charge_remaining := charge_remaining - to_apply;
      total_applied := total_applied + to_apply;
    END LOOP;

    UPDATE public.member_charges
    SET remaining_balance = charge_remaining, updated_at = now()
    WHERE id = charge_row.id;
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'apply_credit_fifo', 'member_charges', _member_id,
    jsonb_build_object('total_applied', total_applied));

  RETURN jsonb_build_object('success', true, 'total_applied', total_applied);
END;
$$;
