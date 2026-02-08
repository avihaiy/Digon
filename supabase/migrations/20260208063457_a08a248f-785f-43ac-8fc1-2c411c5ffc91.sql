-- Create enum for day types
CREATE TYPE public.announcement_day_type AS ENUM ('weekdays', 'friday', 'shabbat');

-- Create enum for style themes
CREATE TYPE public.announcement_style AS ENUM ('traditional_gold', 'modern_dark', 'clean_white', 'royal_blue');

-- Create scheduled announcements table
CREATE TABLE public.scheduled_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  day_type announcement_day_type NOT NULL DEFAULT 'weekdays',
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '22:00',
  style announcement_style NOT NULL DEFAULT 'traditional_gold',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_announcements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Scheduled announcements readable by all"
ON public.scheduled_announcements
FOR SELECT
USING (true);

CREATE POLICY "Scheduled announcements writable by managers"
ON public.scheduled_announcements
FOR ALL
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_announcements_updated_at
BEFORE UPDATE ON public.scheduled_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_announcements;