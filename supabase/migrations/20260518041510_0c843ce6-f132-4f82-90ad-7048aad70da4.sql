CREATE OR REPLACE FUNCTION public.audit_sifrei_torah_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_name text;
  old_jsonb jsonb;
  new_jsonb jsonb;
  rec_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_name := 'sifrei_torah_schedule_create';
    old_jsonb := NULL;
    new_jsonb := to_jsonb(NEW);
    rec_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    action_name := 'sifrei_torah_schedule_update';
    old_jsonb := to_jsonb(OLD);
    new_jsonb := to_jsonb(NEW);
    rec_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    action_name := 'sifrei_torah_schedule_delete';
    old_jsonb := to_jsonb(OLD);
    new_jsonb := NULL;
    rec_id := OLD.id;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), action_name, 'sifrei_torah_schedule', rec_id, old_jsonb, new_jsonb);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sifrei_torah_schedule_audit ON public.sifrei_torah_schedule;
CREATE TRIGGER sifrei_torah_schedule_audit
AFTER INSERT OR UPDATE OR DELETE ON public.sifrei_torah_schedule
FOR EACH ROW EXECUTE FUNCTION public.audit_sifrei_torah_schedule();