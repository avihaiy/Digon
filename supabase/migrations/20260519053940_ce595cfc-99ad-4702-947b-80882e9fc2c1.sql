-- Apply existing credit (overpayments) to newly inserted charges
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

  NEW.remaining_balance := remaining;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_credit_to_new_charge_trigger ON public.member_charges;
CREATE TRIGGER apply_credit_to_new_charge_trigger
BEFORE INSERT ON public.member_charges
FOR EACH ROW
EXECUTE FUNCTION public.apply_credit_to_new_charge();