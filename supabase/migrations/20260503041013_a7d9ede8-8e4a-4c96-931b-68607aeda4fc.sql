DROP POLICY IF EXISTS "Expenses readable by authenticated" ON public.expenses;

CREATE POLICY "Expenses readable by managers"
ON public.expenses
FOR SELECT
USING (public.is_manager(auth.uid()));