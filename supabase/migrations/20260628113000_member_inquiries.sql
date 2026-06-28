-- Create member_inquiries table
CREATE TABLE public.member_inquiries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.member_inquiries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY Managers can do everything on member_inquiries
    ON public.member_inquiries
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (public.is_manager(auth.uid()))
    WITH CHECK (public.is_manager(auth.uid()));

-- RPC to submit inquiry from public area
CREATE OR REPLACE FUNCTION public.submit_member_inquiry(_member_id uuid, _phone text, _subject text, _content text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  m record;
  expected_tail text;
  provided_tail text;
BEGIN
  SELECT phone INTO m FROM public.members WHERE id = _member_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;

  expected_tail := right(regexp_replace(COALESCE(m.phone, ''), '\D', '', 'g'), 9);
  provided_tail := right(regexp_replace(COALESCE(_phone, ''), '\D', '', 'g'), 9);
  
  IF expected_tail = '' OR provided_tail = '' OR expected_tail <> provided_tail THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_credentials');
  END IF;

  INSERT INTO public.member_inquiries (member_id, subject, content)
  VALUES (_member_id, _subject, _content);

  RETURN jsonb_build_object('success', true);
END;
$function$;
