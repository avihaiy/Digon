CREATE TABLE public.sifrei_torah_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_date DATE NOT NULL UNIQUE,
  sefer_id UUID NOT NULL REFERENCES public.sifrei_torah(id) ON DELETE CASCADE,
  label TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sifrei_torah_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sifrei torah schedule readable by all"
ON public.sifrei_torah_schedule
FOR SELECT
USING (true);

CREATE POLICY "Sifrei torah schedule writable by managers"
ON public.sifrei_torah_schedule
FOR ALL
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

CREATE INDEX idx_sifrei_torah_schedule_date ON public.sifrei_torah_schedule(scheduled_date);

CREATE TRIGGER update_sifrei_torah_schedule_updated_at
BEFORE UPDATE ON public.sifrei_torah_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();