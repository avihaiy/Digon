-- Fix function search path for update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- The audit_logs INSERT policy is intentionally permissive for logging purposes
-- We'll add a restriction to ensure user_id matches auth.uid()
DROP POLICY IF EXISTS "Audit logs insertable by authenticated" ON public.audit_logs;

CREATE POLICY "Audit logs insertable by authenticated" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());