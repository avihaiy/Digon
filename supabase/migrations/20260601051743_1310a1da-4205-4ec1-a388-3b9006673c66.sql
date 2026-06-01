
-- Add time_slot to schedule to support different sifrei torah for morning vs mincha (Shabbat/Holiday)
ALTER TABLE public.sifrei_torah_schedule
  ADD COLUMN IF NOT EXISTS time_slot text NOT NULL DEFAULT 'all';

-- Replace unique constraint to include time_slot so same sefer can appear in different slots
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sifrei_torah_schedule_scheduled_date_sefer_id_key'
  ) THEN
    ALTER TABLE public.sifrei_torah_schedule DROP CONSTRAINT sifrei_torah_schedule_scheduled_date_sefer_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS sifrei_torah_schedule_date_slot_sefer_uniq
  ON public.sifrei_torah_schedule (scheduled_date, time_slot, sefer_id);
