-- Create prayer_times table for daily prayer schedules
CREATE TABLE public.prayer_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  time TIME NOT NULL,
  day_type TEXT NOT NULL DEFAULT 'weekday',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create announcements table for ticker
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  show_on_shabbat BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memorial_names table for Yahrzeit
CREATE TABLE public.memorial_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deceased_name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  is_male BOOLEAN DEFAULT true,
  hebrew_death_day INTEGER NOT NULL,
  hebrew_death_month INTEGER NOT NULL,
  gregorian_death_date DATE,
  family_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_names ENABLE ROW LEVEL SECURITY;

-- Prayer times policies
CREATE POLICY "Prayer times readable by all" ON public.prayer_times
  FOR SELECT USING (true);

CREATE POLICY "Prayer times writable by managers" ON public.prayer_times
  FOR ALL USING (is_manager(auth.uid())) WITH CHECK (is_manager(auth.uid()));

-- Announcements policies
CREATE POLICY "Announcements readable by all" ON public.announcements
  FOR SELECT USING (true);

CREATE POLICY "Announcements writable by managers" ON public.announcements
  FOR ALL USING (is_manager(auth.uid())) WITH CHECK (is_manager(auth.uid()));

-- Memorial names policies
CREATE POLICY "Memorial names readable by all" ON public.memorial_names
  FOR SELECT USING (true);

CREATE POLICY "Memorial names writable by managers" ON public.memorial_names
  FOR ALL USING (is_manager(auth.uid())) WITH CHECK (is_manager(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_prayer_times_updated_at
  BEFORE UPDATE ON public.prayer_times
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_memorial_names_updated_at
  BEFORE UPDATE ON public.memorial_names
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for display screens
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_times;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memorial_names;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aliyot;