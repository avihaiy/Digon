
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
  max_num integer;
BEGIN
  IF NEW.receipt_number IS NULL THEN
    SELECT COALESCE(MAX(receipt_number), 1055) INTO max_num FROM public.receipts;
    
    -- Find the first gap starting from 1056
    SELECT s.n INTO next_num
    FROM generate_series(1056, max_num + 1) AS s(n)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.receipts WHERE receipt_number = s.n
    )
    ORDER BY s.n
    LIMIT 1;
    
    NEW.receipt_number := COALESCE(next_num, 1056);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
