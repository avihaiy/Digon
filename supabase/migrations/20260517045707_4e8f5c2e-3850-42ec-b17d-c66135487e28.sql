CREATE TABLE public.sifrei_torah (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sifrei_torah ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sifrei torah readable by all"
ON public.sifrei_torah FOR SELECT
USING (true);

CREATE POLICY "Sifrei torah writable by managers"
ON public.sifrei_torah FOR ALL
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

CREATE TRIGGER update_sifrei_torah_updated_at
BEFORE UPDATE ON public.sifrei_torah
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.sifrei_torah;
ALTER TABLE public.sifrei_torah REPLICA IDENTITY FULL;