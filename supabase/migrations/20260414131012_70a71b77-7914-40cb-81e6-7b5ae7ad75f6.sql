ALTER TABLE public.reminders 
ADD COLUMN recurrence TEXT DEFAULT NULL;

COMMENT ON COLUMN public.reminders.recurrence IS 'Recurrence pattern: null (one-time), daily, weekly, monthly';
