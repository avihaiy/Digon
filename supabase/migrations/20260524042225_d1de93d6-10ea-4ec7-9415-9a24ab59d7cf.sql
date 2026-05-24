
ALTER TABLE public.sifrei_torah_schedule
  DROP CONSTRAINT IF EXISTS sifrei_torah_schedule_scheduled_date_key;

ALTER TABLE public.sifrei_torah_schedule
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS sifrei_torah_schedule_date_sefer_uniq
  ON public.sifrei_torah_schedule (scheduled_date, sefer_id);

CREATE INDEX IF NOT EXISTS sifrei_torah_schedule_date_idx
  ON public.sifrei_torah_schedule (scheduled_date, position);
