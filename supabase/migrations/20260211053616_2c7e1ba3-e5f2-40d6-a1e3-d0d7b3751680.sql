-- Add new payment methods to the enum
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'check';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'bank_transfer';