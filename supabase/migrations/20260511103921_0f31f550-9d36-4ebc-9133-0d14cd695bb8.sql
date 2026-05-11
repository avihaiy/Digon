
-- =========================================================================
-- SECURITY HARDENING MIGRATION
-- =========================================================================

-- 1) Tighten members: drop anon SELECT
DROP POLICY IF EXISTS "Members publicly readable for receipt share" ON public.members;

-- 2) Tighten payments: drop anon SELECT
DROP POLICY IF EXISTS "Payments publicly readable for receipt share" ON public.payments;

-- 3) Tighten receipts: drop anon SELECT
DROP POLICY IF EXISTS "Receipts publicly readable for share link" ON public.receipts;

-- 4) Tighten member_charges: drop anon SELECT
DROP POLICY IF EXISTS "Member charges publicly readable for share link" ON public.member_charges;

-- 5) Tighten app_settings SELECT to authenticated only
DROP POLICY IF EXISTS "Settings readable by authenticated" ON public.app_settings;
CREATE POLICY "Settings readable by authenticated"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- 6) Tighten budget_transactions SELECT to authenticated only
DROP POLICY IF EXISTS "Budget transactions readable by authenticated" ON public.budget_transactions;
CREATE POLICY "Budget transactions readable by authenticated"
ON public.budget_transactions
FOR SELECT
TO authenticated
USING (true);

-- 7) Tighten expense_attachments SELECT to managers
DROP POLICY IF EXISTS "Expense attachments readable by authenticated" ON public.expense_attachments;
CREATE POLICY "Expense attachments readable by managers"
ON public.expense_attachments
FOR SELECT
TO authenticated
USING (is_manager(auth.uid()));

-- 8) Make expense-receipts storage bucket private and lock down policies
UPDATE storage.buckets SET public = false WHERE id = 'expense-receipts';

DROP POLICY IF EXISTS "Anyone can view expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Managers can upload expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Managers can update expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Managers can delete expense receipts" ON storage.objects;

CREATE POLICY "Managers can view expense receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'expense-receipts' AND is_manager(auth.uid()));

CREATE POLICY "Managers can upload expense receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expense-receipts' AND is_manager(auth.uid()));

CREATE POLICY "Managers can update expense receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'expense-receipts' AND is_manager(auth.uid()));

CREATE POLICY "Managers can delete expense receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'expense-receipts' AND is_manager(auth.uid()));

-- =========================================================================
-- SECURITY DEFINER RPCs for controlled public access
-- These functions return ONLY the minimum data needed for public-facing pages.
-- =========================================================================

-- Public receipt lookup by receipt number (used by /receipt/:number share links)
CREATE OR REPLACE FUNCTION public.get_public_receipt(_receipt_number integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', r.id,
    'receipt_number', r.receipt_number,
    'total_amount', r.total_amount,
    'description', r.description,
    'created_at', r.created_at,
    'member_name', m.full_name,
    'payment_method', p.method,
    'payment_reference', p.reference
  )
  INTO result
  FROM public.receipts r
  LEFT JOIN public.members m ON m.id = r.member_id
  LEFT JOIN public.payments p ON p.id = r.payment_id
  WHERE r.receipt_number = _receipt_number
  LIMIT 1;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_receipt(integer) TO anon, authenticated;

-- Public member debts (for share-link UX). Returns only debt summary, no PII other than name.
CREATE OR REPLACE FUNCTION public.get_public_member_debts(_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_name text;
  charges jsonb;
  pending jsonb;
BEGIN
  SELECT full_name INTO member_name FROM public.members WHERE id = _member_id;
  IF member_name IS NULL THEN
    RETURN NULL;
  END IF;

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

  RETURN jsonb_build_object(
    'member_name', member_name,
    'charges', charges,
    'pending', pending
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_member_debts(uuid) TO anon, authenticated;

-- Member area profile (returns name + whether phone is set, without exposing phone)
CREATE OR REPLACE FUNCTION public.get_public_member_profile(_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
BEGIN
  SELECT full_name, phone INTO m FROM public.members WHERE id = _member_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'member_name', m.full_name,
    'has_phone', (m.phone IS NOT NULL AND length(regexp_replace(m.phone, '\D', '', 'g')) >= 9)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_member_profile(uuid) TO anon, authenticated;

-- Verify member phone (last 9 digits match) and return area data atomically.
-- Logs each attempt to member_area_logins.
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
    RETURN jsonb_build_object('success', false, 'error', 'invalid_credentials');
  END IF;

  INSERT INTO public.member_area_logins (member_id, success, user_agent)
  VALUES (_member_id, true, left(_user_agent, 500));

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

GRANT EXECUTE ON FUNCTION public.get_member_area_data(uuid, text, text) TO anon, authenticated;
