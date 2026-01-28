-- Add RLS policies for backups bucket to allow authenticated managers to read
CREATE POLICY "Managers can view backups"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'backups'
  AND public.is_manager(auth.uid())
);

-- Managers can delete backups
CREATE POLICY "Managers can delete backups"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'backups'
  AND public.is_manager(auth.uid())
);