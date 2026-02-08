-- Add image_url column to scheduled_announcements
ALTER TABLE public.scheduled_announcements 
ADD COLUMN image_url TEXT;

-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', true);

-- Allow public read access to announcement images
CREATE POLICY "Announcement images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-images');

-- Allow managers to upload announcement images
CREATE POLICY "Managers can upload announcement images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'announcement-images' 
  AND is_manager(auth.uid())
);

-- Allow managers to update announcement images
CREATE POLICY "Managers can update announcement images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'announcement-images' AND is_manager(auth.uid()));

-- Allow managers to delete announcement images
CREATE POLICY "Managers can delete announcement images"
ON storage.objects FOR DELETE
USING (bucket_id = 'announcement-images' AND is_manager(auth.uid()));