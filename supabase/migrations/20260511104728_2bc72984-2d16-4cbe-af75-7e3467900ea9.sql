
-- 1. notification_preference on members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'notification_preference'
  ) THEN
    ALTER TABLE public.members
      ADD COLUMN notification_preference text NOT NULL DEFAULT 'none'
      CHECK (notification_preference IN ('none','email','whatsapp'));
  END IF;
END$$;

-- 2. Allow SECURITY DEFINER functions to insert audit log entries with NULL user_id (anon flows)
DROP POLICY IF EXISTS "Audit logs insertable by authenticated" ON public.audit_logs;
CREATE POLICY "Audit logs insertable by authenticated"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Audit logs insertable by definer functions"
ON public.audit_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL);

-- 3. Record a pending Bit payment intent (called from the member personal area)
CREATE OR REPLACE FUNCTION public.record_bit_payment_intent(
  _member_id uuid,
  _amount numeric,
  _user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  member_name text;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT full_name INTO member_name FROM public.members WHERE id = _member_id;
  IF member_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'member_not_found');
  END IF;

  INSERT INTO public.payments (member_id, amount, method, status, payment_type, notes)
  VALUES (
    _member_id,
    _amount,
    'bit',
    'pending',
    'donation',
    'נוצר אוטומטית מהאזור האישי - תשלום בביט'
  )
  RETURNING id INTO new_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (
    NULL,
    'bit_payment_click',
    'payments',
    new_id,
    jsonb_build_object(
      'member_id', _member_id,
      'member_name', member_name,
      'amount', _amount,
      'user_agent', left(_user_agent, 500),
      'source', 'public_member_area'
    )
  );

  RETURN jsonb_build_object('success', true, 'payment_id', new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_bit_payment_intent(uuid, numeric, text) TO anon, authenticated;

-- 4. Extend get_member_area_data to also write to audit_logs
CREATE OR REPLACE FUNCTION public.get_member_area_data(
  _member_id uuid,
  _phone text,
  _user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  expected_tail text;
  provided_tail text;
  charges jsonb;
  pending jsonb;
  receipts jsonb;
  bit_phone text;
  bit_enabled text;
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
    FROM public.receipts
    WHERE member_id = _member_id
    ORDER BY created_at DESC
    LIMIT 100
  ) sub;

  SELECT value INTO bit_phone FROM public.app_settings WHERE key = 'bit_phone';
  SELECT value INTO bit_enabled FROM public.app_settings WHERE key = 'bit_enabled';

  RETURN jsonb_build_object(
    'success', true,
    'member_name', m.full_name,
    'charges', charges,
    'pending', pending,
    'receipts', receipts,
    'bit_phone', COALESCE(bit_phone, ''),
    'bit_enabled', COALESCE(bit_enabled, 'false') = 'true'
  );
END;
$$;
