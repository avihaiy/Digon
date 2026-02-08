-- Add new array column for multiple day types
ALTER TABLE public.scheduled_announcements 
ADD COLUMN day_types text[] NOT NULL DEFAULT ARRAY['weekdays']::text[];

-- Migrate existing data from single day_type to array
UPDATE public.scheduled_announcements 
SET day_types = ARRAY[day_type::text];

-- Drop the old column and enum type
ALTER TABLE public.scheduled_announcements DROP COLUMN day_type;
DROP TYPE IF EXISTS public.announcement_day_type;