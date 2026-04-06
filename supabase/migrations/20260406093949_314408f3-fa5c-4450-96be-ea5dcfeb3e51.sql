
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
BEGIN
  IF NEW.receipt_number IS NULL THEN
    -- Find the first gap in receipt numbers
    SELECT s.n INTO next_num
    FROM generate_series(1, COALESCE((SELECT MAX(receipt_number) FROM public.receipts), 0) + 1) AS s(n)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.receipts WHERE receipt_number = s.n
    )
    ORDER BY s.n
    LIMIT 1;
    
    -- If no gap found, use MAX + 1
    NEW.receipt_number := COALESCE(next_num, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
