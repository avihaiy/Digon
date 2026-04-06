
-- Create function to set receipt_number as max + 1
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    SELECT COALESCE(MAX(receipt_number), 0) + 1 INTO NEW.receipt_number
    FROM public.receipts;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS set_receipt_number_trigger ON public.receipts;

-- Create trigger to auto-set receipt number before insert
CREATE TRIGGER set_receipt_number_trigger
  BEFORE INSERT ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_receipt_number();

-- Update the default so it doesn't use the sequence anymore
ALTER TABLE public.receipts ALTER COLUMN receipt_number DROP DEFAULT;
