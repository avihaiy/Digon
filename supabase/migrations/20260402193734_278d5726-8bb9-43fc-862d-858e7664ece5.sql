-- Add hall payment fields to payments table
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS hall_event_type text,
  ADD COLUMN IF NOT EXISTS total_installments integer,
  ADD COLUMN IF NOT EXISTS installment_number integer,
  ADD COLUMN IF NOT EXISTS installment_total_amount numeric,
  ADD COLUMN IF NOT EXISTS installment_group_id uuid;