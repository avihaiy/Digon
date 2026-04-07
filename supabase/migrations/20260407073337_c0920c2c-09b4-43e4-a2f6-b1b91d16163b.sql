
CREATE TABLE public.charge_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  charge_id UUID NOT NULL REFERENCES public.member_charges(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.charge_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Charge payments readable by authenticated"
ON public.charge_payments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Charge payments writable by managers"
ON public.charge_payments FOR ALL TO authenticated
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- Update trigger function to log each payment application
CREATE OR REPLACE FUNCTION public.apply_payment_to_charges()
RETURNS TRIGGER AS $$
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
    SET remaining_balance = remaining_balance - to_apply,
        updated_at = now()
    WHERE id = charge_row.id;

    -- Log the payment application
    INSERT INTO public.charge_payments (charge_id, payment_id, amount)
    VALUES (charge_row.id, NEW.id, to_apply);
    
    remaining := remaining - to_apply;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
