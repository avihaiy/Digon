-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense attachments table
CREATE TABLE public.expense_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for expense receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', true);

-- Enable RLS on all tables
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_categories
CREATE POLICY "Expense categories readable by authenticated" 
ON public.expense_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Expense categories writable by managers" 
ON public.expense_categories 
FOR ALL 
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- RLS Policies for expenses
CREATE POLICY "Expenses readable by authenticated" 
ON public.expenses 
FOR SELECT 
USING (true);

CREATE POLICY "Expenses writable by managers" 
ON public.expenses 
FOR ALL 
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- RLS Policies for expense_attachments
CREATE POLICY "Expense attachments readable by authenticated" 
ON public.expense_attachments 
FOR SELECT 
USING (true);

CREATE POLICY "Expense attachments writable by managers" 
ON public.expense_attachments 
FOR ALL 
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- Storage policies for expense-receipts bucket
CREATE POLICY "Anyone can view expense receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-receipts');

CREATE POLICY "Managers can upload expense receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'expense-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Managers can update expense receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'expense-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Managers can delete expense receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'expense-receipts' AND auth.role() = 'authenticated');

-- Add triggers for updated_at
CREATE TRIGGER update_expense_categories_updated_at
BEFORE UPDATE ON public.expense_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description) VALUES
('חשמל', 'הוצאות חשמל'),
('מים', 'הוצאות מים'),
('ארנונה', 'תשלומי ארנונה'),
('תחזוקה', 'תחזוקת מבנה וציוד'),
('ניקיון', 'שירותי ניקיון'),
('ספרי קודש', 'רכישת ספרים'),
('אירועים', 'הוצאות אירועים וכיבודים'),
('משכורות', 'משכורות עובדים'),
('ביטוח', 'פוליסות ביטוח'),
('אחר', 'הוצאות שונות');