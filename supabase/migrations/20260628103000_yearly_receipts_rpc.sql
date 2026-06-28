-- Create RPC function to fetch all receipts for a specific year securely
CREATE OR REPLACE FUNCTION public.get_member_yearly_receipts(
    _member_id uuid,
    _phone text,
    _year int
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
  receipts jsonb;
BEGIN
  -- Authenticate member
  SELECT phone INTO m FROM public.members WHERE id = _member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  expected_tail := right(regexp_replace(COALESCE(m.phone, ''), '\D', '', 'g'), 9);
  provided_tail := right(regexp_replace(COALESCE(_phone, ''), '\D', '', 'g'), 9);

  IF expected_tail = '' OR provided_tail = '' OR expected_tail <> provided_tail THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_credentials');
  END IF;

  -- Fetch receipts for the given year
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 
    'receipt_number', receipt_number, 
    'total_amount', total_amount,
    'description', description, 
    'created_at', created_at
  ) ORDER BY created_at ASC), '[]'::jsonb)
  INTO receipts
  FROM public.receipts 
  WHERE member_id = _member_id 
    AND EXTRACT(YEAR FROM created_at) = _year;

  RETURN jsonb_build_object(
    'success', true,
    'receipts', receipts
  );
END;
$$;
