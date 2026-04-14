
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  reminder_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reminders readable by authenticated"
ON public.reminders FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Reminders writable by managers"
ON public.reminders FOR ALL TO authenticated
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));
