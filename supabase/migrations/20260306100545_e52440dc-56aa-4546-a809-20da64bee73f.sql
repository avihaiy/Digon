ALTER TABLE public.heichal_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Heichal names readable by all" ON public.heichal_names FOR SELECT USING (true);
CREATE POLICY "Heichal names writable by managers" ON public.heichal_names FOR ALL USING (is_manager(auth.uid())) WITH CHECK (is_manager(auth.uid()));