
-- Add payment_type, quantity, unit_price columns to payments table
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'aliya',
  ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0;

-- Create bracha_packages table for yearly blessing balance tracking
CREATE TABLE public.bracha_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  package_type text NOT NULL DEFAULT 'single', -- 'single', 'package_10', 'package_20', 'unlimited'
  total_brachot integer NOT NULL DEFAULT 1,
  used_brachot integer NOT NULL DEFAULT 0,
  balance integer NOT NULL DEFAULT 1,
  price_paid numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.bracha_packages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Bracha packages readable by authenticated"
  ON public.bracha_packages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Bracha packages writable by managers"
  ON public.bracha_packages FOR ALL TO authenticated
  USING (is_manager(auth.uid()))
  WITH CHECK (is_manager(auth.uid()));

-- Insert default settings for ashkava price if not exists
INSERT INTO public.app_settings (key, value) VALUES ('ashkava_unit_price', '30') ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('bracha_unit_price', '180') ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('bracha_package_10_price', '1500') ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('bracha_package_20_price', '2500') ON CONFLICT DO NOTHING;
