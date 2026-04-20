-- Add per-event reminder override (in hours)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS reminder_hours_before integer;

-- Update trigger function to honor per-event override
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
  hours_before INT := 24;
  hours_setting TEXT;
  prefix_label TEXT;
BEGIN
  -- Per-event override takes precedence
  IF NEW.reminder_hours_before IS NOT NULL THEN
    hours_before := GREATEST(1, LEAST(NEW.reminder_hours_before, 168));
  ELSE
    -- Fallback to system default in app_settings
    SELECT value INTO hours_setting
    FROM public.app_settings
    WHERE key = 'event_reminder_hours_before'
    LIMIT 1;

    IF hours_setting IS NOT NULL THEN
      BEGIN
        hours_before := GREATEST(1, LEAST(coalesce(hours_setting::int, 24), 168));
      EXCEPTION WHEN others THEN
        hours_before := 24;
      END;
    END IF;
  END IF;

  reminder_time := NEW.start_at - make_interval(hours => hours_before);

  -- On UPDATE, remove existing un-notified auto-reminder for this event
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.reminders
    WHERE content LIKE ('[event:' || NEW.id::text || ']%')
      AND notified = false;
  END IF;

  -- Don't create reminders in the past
  IF reminder_time <= now() THEN
    RETURN NEW;
  END IF;

  time_part := to_char(NEW.start_at AT TIME ZONE 'Asia/Jerusalem', 'HH24:MI');
  IF NEW.location IS NOT NULL AND length(trim(NEW.location)) > 0 THEN
    location_part := ' • ' || NEW.location;
  END IF;

  IF hours_before <= 2 THEN
    prefix_label := '📅 בעוד ' || hours_before || ' שעות: ';
  ELSIF hours_before = 24 THEN
    prefix_label := '📅 מחר: ';
  ELSIF hours_before = 48 THEN
    prefix_label := '📅 בעוד יומיים: ';
  ELSIF hours_before = 72 THEN
    prefix_label := '📅 בעוד 3 ימים: ';
  ELSIF hours_before % 24 = 0 THEN
    prefix_label := '📅 בעוד ' || (hours_before / 24) || ' ימים: ';
  ELSE
    prefix_label := '📅 בעוד ' || hours_before || ' שעות: ';
  END IF;

  reminder_text := prefix_label || NEW.title || ' בשעה ' || time_part || location_part;

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