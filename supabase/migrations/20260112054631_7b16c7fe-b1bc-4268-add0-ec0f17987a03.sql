-- Create budget categories enum
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Create budget categories table
CREATE TABLE public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type transaction_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget transactions table
CREATE TABLE public.budget_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.budget_categories(id),
  type transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_id UUID REFERENCES public.payments(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_categories
CREATE POLICY "Budget categories readable by authenticated"
ON public.budget_categories
FOR SELECT
USING (true);

CREATE POLICY "Budget categories writable by managers"
ON public.budget_categories
FOR ALL
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- RLS policies for budget_transactions
CREATE POLICY "Budget transactions readable by authenticated"
ON public.budget_transactions
FOR SELECT
USING (true);

CREATE POLICY "Budget transactions writable by managers"
ON public.budget_transactions
FOR ALL
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_budget_transactions_updated_at
BEFORE UPDATE ON public.budget_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default categories
INSERT INTO public.budget_categories (name, type, description) VALUES
('עליות לתורה', 'income', 'הכנסות מעליות לתורה'),
('תרומות', 'income', 'תרומות כלליות'),
('נדרים', 'income', 'נדרים והתחייבויות'),
('דמי חבר', 'income', 'דמי חברות שנתיים'),
('אחר - הכנסה', 'income', 'הכנסות אחרות'),
('חשמל', 'expense', 'הוצאות חשמל'),
('מים', 'expense', 'הוצאות מים'),
('ניקיון', 'expense', 'שירותי ניקיון'),
('תחזוקה', 'expense', 'תחזוקה ותיקונים'),
('ספרי קודש', 'expense', 'רכישת ספרים'),
('קידושים', 'expense', 'הוצאות קידושים'),
('אחר - הוצאה', 'expense', 'הוצאות אחרות');