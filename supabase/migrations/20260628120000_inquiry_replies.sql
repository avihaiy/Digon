-- Add reply columns
ALTER TABLE public.member_inquiries ADD COLUMN IF NOT EXISTS reply text;
ALTER TABLE public.member_inquiries ADD COLUMN IF NOT EXISTS replied_at timestamp with time zone;

-- Update get_member_area_data to return inquiries
CREATE OR REPLACE FUNCTION public.get_member_area_data(_member_id uuid, _phone text, _user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  m record;
  expected_tail text;
  provided_tail text;
  charges jsonb;
  pending jsonb;
  receipts jsonb;
  messages jsonb;
  inquiries jsonb;
  bit_phone text;
  bit_enabled text;
  tax_enabled text;
  total_paid numeric;
  allocated numeric;
  charges_debt numeric;
  credit_balance numeric;
BEGIN
  SELECT full_name, phone, email, address, spouse_name INTO m FROM public.members WHERE id = _member_id;
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

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'title', title, 'content', content, 'created_at', created_at, 'is_read', is_read, 'is_global', (member_id IS NULL)
  ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO messages
  FROM public.member_messages
  WHERE member_id = _member_id OR member_id IS NULL
  LIMIT 50;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'subject', subject, 'content', content, 'status', status, 'created_at', created_at, 'reply', reply, 'replied_at', replied_at
  ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO inquiries
  FROM public.member_inquiries
  WHERE member_id = _member_id
  LIMIT 50;

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
  SELECT value INTO tax_enabled FROM public.app_settings WHERE key = 'tax_receipt_enabled';

  RETURN jsonb_build_object(
    'success', true,
    'member_name', m.full_name,
    'email', COALESCE(m.email, ''),
    'address', COALESCE(m.address, ''),
    'spouse_name', COALESCE(m.spouse_name, ''),
    'charges', charges,
    'pending', pending,
    'receipts', receipts,
    'messages', messages,
    'inquiries', inquiries,
    'bit_phone', COALESCE(bit_phone, ''),
    'bit_enabled', COALESCE(bit_enabled, 'false') = 'true',
    'tax_receipt_enabled', COALESCE(tax_enabled, 'true') = 'true',
    'credit_balance', credit_balance,
    'charges_debt', charges_debt
  );
END;
$function$;
