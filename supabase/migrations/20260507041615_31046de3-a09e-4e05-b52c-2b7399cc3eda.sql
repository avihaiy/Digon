CREATE TABLE public.member_area_logins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL,
  success boolean NOT NULL DEFAULT false,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_area_logins_member_id ON public.member_area_logins(member_id);
CREATE INDEX idx_member_area_logins_created_at ON public.member_area_logins(created_at DESC);

ALTER TABLE public.member_area_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert member area login logs"
ON public.member_area_logins
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Managers can read member area login logs"
ON public.member_area_logins
FOR SELECT
TO authenticated
USING (is_manager(auth.uid()));