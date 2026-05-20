-- Fix: change credit-to-new-charge trigger to AFTER INSERT (avoids FK violation)
-- Also: exclude hall payments from credit/debt application (they're direct purchases, not deposits)

DROP TRIGGER IF EXISTS apply_credit_to_new_charge_trigger ON public.member_charges;

CREATE OR REPLACE FUNCTION public.apply_credit_to_new_charge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  remaining numeric;
  pay_row RECORD;
  pay_credit numeric;
  to_apply numeric;
BEGIN
  remaining := COALESCE(NEW.remaining_balance, NEW.amount);
  IF remaining <= 0 THEN
    RETURN NEW;
  END IF;

  FOR pay_row IN
    SELECT p.id,
           p.amount - COALESCE((
             SELECT SUM(cp.amount) FROM public.charge_payments cp WHERE cp.payment_id = p.id
           ), 0) AS credit
    FROM public.payments p
    WHERE p.member_id = NEW.member_id
      AND p.status = 'confirmed'
      AND COALESCE(p.payment_type, '') <> 'hall'
    ORDER BY p.created_at ASC
  LOOP
    EXIT WHEN remaining <= 0;
    pay_credit := pay_row.credit;
    IF pay_credit IS NULL OR pay_credit <= 0 THEN
      CONTINUE;
    END IF;
    to_apply := LEAST(remaining, pay_credit);
    INSERT INTO public.charge_payments (charge_id, payment_id, amount)
    VALUES (NEW.id, pay_row.id, to_apply);
    remaining := remaining - to_apply;
  END LOOP;

  IF remaining <> COALESCE(NEW.remaining_balance, NEW.amount) THEN
    UPDATE public.member_charges SET remaining_balance = remaining, updated_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_credit_to_new_charge_trigger
AFTER INSERT ON public.member_charges
FOR EACH ROW
EXECUTE FUNCTION public.apply_credit_to_new_charge();

-- Exclude hall payments from auto-apply on payment confirmation
CREATE OR REPLACE FUNCTION public.apply_payment_to_charges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  remaining NUMERIC;
  charge_row RECORD;
  to_apply NUMERIC;
BEGIN
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Hall payments are direct purchases, not deposits — don't apply to member debt
  IF COALESCE(NEW.payment_type, '') = 'hall' THEN
    RETURN NEW;
  END IF;

  remaining := NEW.amount;

  FOR charge_row IN
    SELECT id, remaining_balance
    FROM public.member_charges
    WHERE member_id = NEW.member_id
      AND remaining_balance > 0
    ORDER BY charge_date ASC, created_at ASC
  LOOP
    EXIT WHEN remaining <= 0;
    to_apply := LEAST(remaining, charge_row.remaining_balance);
    UPDATE public.member_charges
    SET remaining_balance = remaining_balance - to_apply, updated_at = now()
    WHERE id = charge_row.id;
    INSERT INTO public.charge_payments (charge_id, payment_id, amount)
    VALUES (charge_row.id, NEW.id, to_apply);
    remaining := remaining - to_apply;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Exclude hall payments from manual FIFO credit reconciliation
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
        AND COALESCE(p.payment_type, '') <> 'hall'
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

-- Update public member area data to include credit/balance info
CREATE OR REPLACE FUNCTION public.get_member_area_data(_member_id uuid, _phone text, _user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m record;
  expected_tail text;
  provided_tail text;
  charges jsonb;
  pending jsonb;
  receipts jsonb;
  bit_phone text;
  bit_enabled text;
  total_paid numeric;
  allocated numeric;
  charges_debt numeric;
  credit_balance numeric;
BEGIN
  SELECT full_name, phone INTO m FROM public.members WHERE id = _member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  expected_tail := right(regexp_replace(COALESCE(m.phone, ''), '\D', '', 'g'), 9);
  provided_tail := right(regexp_replace(COALESCE(_phone, ''), '\D', '', 'g'), 9);

  IF expected_tail = '' OR provided_tail = '' OR expected_tail <> provided_tail THEN
    INSERT INTO public.member_area_logins (member_id, success, user_agent)
    VALUES (_member_id, false, left(_user_agent, 500));
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (NULL, 'member_area_login_failed', 'members', _member_id,
      jsonb_build_object('member_name', m.full_name, 'user_agent', left(_user_agent, 500)));
    RETURN jsonb_build_object('success', false, 'error', 'invalid_credentials');
  END IF;

  INSERT INTO public.member_area_logins (member_id, success, user_agent)
  VALUES (_member_id, true, left(_user_agent, 500));
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (NULL, 'member_area_login_success', 'members', _member_id,
    jsonb_build_object('member_name', m.full_name, 'user_agent', left(_user_agent, 500)));

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'amount', amount, 'remaining_balance', remaining_balance,
    'description', description, 'charge_date', charge_date
  ) ORDER BY charge_date DESC), '[]'::jsonb)
  INTO charges
  FROM public.member_charges
  WHERE member_id = _member_id AND remaining_balance > 0;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'amount', p.amount, 'method', p.method, 'created_at', p.created_at,
    'description', (SELECT description FROM public.receipts WHERE id = p.id LIMIT 1)
  ) ORDER BY p.created_at DESC), '[]'::jsonb)
  INTO pending
  FROM public.payments p
  WHERE p.member_id = _member_id AND p.status = 'pending';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'receipt_number', receipt_number, 'total_amount', total_amount,
    'description', description, 'created_at', created_at
  ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO receipts
  FROM (
    SELECT id, receipt_number, total_amount, description, created_at
    FROM public.receipts WHERE member_id = _member_id
    ORDER BY created_at DESC LIMIT 100
  ) sub;

  -- compute credit (excluding hall payments)
  SELECT COALESCE(SUM(p.amount), 0) INTO total_paid
  FROM public.payments p
  WHERE p.member_id = _member_id AND p.status = 'confirmed'
    AND COALESCE(p.payment_type,'') <> 'hall';

  SELECT COALESCE(SUM(cp.amount), 0) INTO allocated
  FROM public.charge_payments cp
  JOIN public.payments p ON p.id = cp.payment_id
  WHERE p.member_id = _member_id
    AND COALESCE(p.payment_type,'') <> 'hall';

  SELECT COALESCE(SUM(remaining_balance), 0) INTO charges_debt
  FROM public.member_charges WHERE member_id = _member_id AND remaining_balance > 0;

  credit_balance := GREATEST(0, total_paid - allocated);

  SELECT value INTO bit_phone FROM public.app_settings WHERE key = 'bit_phone';
  SELECT value INTO bit_enabled FROM public.app_settings WHERE key = 'bit_enabled';

  RETURN jsonb_build_object(
    'success', true,
    'member_name', m.full_name,
    'charges', charges,
    'pending', pending,
    'receipts', receipts,
    'bit_phone', COALESCE(bit_phone, ''),
    'bit_enabled', COALESCE(bit_enabled, 'false') = 'true',
    'credit_balance', credit_balance,
    'charges_debt', charges_debt
  );
END;
$function$;