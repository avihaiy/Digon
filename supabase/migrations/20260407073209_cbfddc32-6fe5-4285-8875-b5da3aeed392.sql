
CREATE OR REPLACE FUNCTION public.apply_payment_to_charges()
RETURNS TRIGGER AS $$
DECLARE
  remaining NUMERIC;
  charge_row RECORD;
  to_apply NUMERIC;
BEGIN
  -- Only run when payment is confirmed
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if this was already confirmed (update case)
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  remaining := NEW.amount;

  -- Apply to oldest open charges first (FIFO)
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
    SET remaining_balance = remaining_balance - to_apply,
        updated_at = now()
    WHERE id = charge_row.id;
    
    remaining := remaining - to_apply;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_apply_payment_to_charges
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.apply_payment_to_charges();
