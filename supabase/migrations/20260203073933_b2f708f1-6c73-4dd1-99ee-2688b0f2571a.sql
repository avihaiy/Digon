-- Update the function to get email from auth.users instead of profiles
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON p.user_id = u.id
  WHERE p.username = _username
  LIMIT 1
$$;