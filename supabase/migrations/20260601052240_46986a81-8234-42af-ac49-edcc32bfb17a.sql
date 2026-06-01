
ALTER TABLE public.sifrei_torah_schedule REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sifrei_torah_schedule;
