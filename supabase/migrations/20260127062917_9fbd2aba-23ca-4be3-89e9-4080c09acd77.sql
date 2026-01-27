-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Only service role can manage backups (no public access)
CREATE POLICY "Service role can manage backups"
ON storage.objects FOR ALL
USING (bucket_id = 'backups' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'backups' AND auth.role() = 'service_role');

-- Enable pg_cron and pg_net extensions for scheduled backups
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;