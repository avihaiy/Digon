
CREATE TABLE public.member_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  remaining_balance NUMERIC NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.member_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Member charges readable by authenticated"
ON public.member_charges FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Member charges writable by managers"
ON public.member_charges FOR ALL TO authenticated
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

CREATE TRIGGER update_member_charges_updated_at
BEFORE UPDATE ON public.member_charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
