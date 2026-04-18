-- Create event type enum
CREATE TYPE public.event_type AS ENUM ('wedding', 'bar_mitzvah', 'memorial', 'lesson', 'meeting', 'holiday', 'other');

-- Create events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  event_type public.event_type NOT NULL DEFAULT 'other',
  start_at timestamp with time zone NOT NULL,
  end_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_start_at ON public.events(start_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events readable by authenticated"
ON public.events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Events writable by managers"
ON public.events FOR ALL TO authenticated
USING (public.is_manager(auth.uid()))
WITH CHECK (public.is_manager(auth.uid()));

CREATE TRIGGER events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();