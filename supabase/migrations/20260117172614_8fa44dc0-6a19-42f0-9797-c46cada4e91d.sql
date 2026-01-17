-- Create settings table to store global app settings
CREATE TABLE public.app_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Settings readable by all authenticated users
CREATE POLICY "Settings readable by authenticated"
ON public.app_settings
FOR SELECT
USING (true);

-- Settings writable by managers
CREATE POLICY "Settings writable by managers"
ON public.app_settings
FOR ALL
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- Create trigger for updating updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default location setting
INSERT INTO public.app_settings (key, value) VALUES ('display_location', 'akko');