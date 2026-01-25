-- Add phone column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Add email column to profiles table (to store the email for display)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;