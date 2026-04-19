-- Auto-create a reminder 24h before each event (one-time, via trigger)

CREATE OR REPLACE FUNCTION public.create_event_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_time TIMESTAMPTZ;
  reminder_text TEXT;
  location_part TEXT := '';
  time_part TEXT;
BEGIN
  -- Compute reminder time: 24 hours before event start
  reminder_time := NEW.start_at - INTERVAL '24 hours';

  -- Don't create reminders in the past
  IF reminder_time <= now() THEN
    RETURN NEW;
  END IF;

  -- Build content string
  time_part := to_char(NEW.start_at AT TIME ZONE 'Asia/Jerusalem', 'HH24:MI');
  IF NEW.location IS NOT NULL AND length(trim(NEW.location)) > 0 THEN
    location_part := ' • ' || NEW.location;
  END IF;

  reminder_text := '📅 מחר: ' || NEW.title || ' בשעה ' || time_part || location_part;

  -- On UPDATE, remove any existing un-notified auto-reminder for this event
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.reminders
    WHERE content LIKE ('[event:' || NEW.id::text || ']%')
      AND notified = false;
  END IF;

  -- Insert the reminder. Tag it with event id so we can find/delete it later.
  INSERT INTO public.reminders (content, reminder_date, created_by, is_important, notified, is_dismissed)
  VALUES (
    '[event:' || NEW.id::text || '] ' || reminder_text,
    reminder_time,
    NEW.created_by,
    false,
    false,
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_reminder_insert ON public.events;
CREATE TRIGGER trg_event_reminder_insert
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.create_event_reminder();

DROP TRIGGER IF EXISTS trg_event_reminder_update ON public.events;
CREATE TRIGGER trg_event_reminder_update
AFTER UPDATE OF start_at, title, location ON public.events
FOR EACH ROW
WHEN (OLD.start_at IS DISTINCT FROM NEW.start_at OR OLD.title IS DISTINCT FROM NEW.title OR OLD.location IS DISTINCT FROM NEW.location)
EXECUTE FUNCTION public.create_event_reminder();

-- Cleanup: when event deleted, remove the auto-reminder
CREATE OR REPLACE FUNCTION public.delete_event_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.reminders
  WHERE content LIKE ('[event:' || OLD.id::text || ']%')
    AND notified = false;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_reminder_delete ON public.events;
CREATE TRIGGER trg_event_reminder_delete
AFTER DELETE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.delete_event_reminder();