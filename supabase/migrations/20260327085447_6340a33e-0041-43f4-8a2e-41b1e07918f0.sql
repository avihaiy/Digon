
ALTER TABLE public.scheduled_announcements
ADD COLUMN font_size integer DEFAULT NULL,
ADD COLUMN font_color text DEFAULT NULL;
