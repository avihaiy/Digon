CREATE POLICY "Member charges publicly readable for share link"
ON public.member_charges
FOR SELECT
TO anon
USING (true);