-- Equipment categories enum
CREATE TYPE public.equipment_category AS ENUM ('hall', 'furniture', 'books', 'events', 'other');

-- Equipment status enum  
CREATE TYPE public.equipment_status AS ENUM ('available', 'loaned', 'maintenance', 'retired');

-- Loan status enum
CREATE TYPE public.loan_status AS ENUM ('active', 'returned', 'overdue');

-- Equipment table - items that can be loaned
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category equipment_category NOT NULL DEFAULT 'other',
  quantity INTEGER NOT NULL DEFAULT 1,
  available_quantity INTEGER NOT NULL DEFAULT 1,
  status equipment_status NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipment loans table - tracking who borrowed what
CREATE TABLE public.equipment_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  status loan_status NOT NULL DEFAULT 'active',
  purpose TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_loans ENABLE ROW LEVEL SECURITY;

-- Equipment policies - readable by all authenticated, writable by managers
CREATE POLICY "Equipment readable by authenticated"
ON public.equipment
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Equipment writable by managers"
ON public.equipment
FOR ALL
TO authenticated
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- Equipment loans policies
CREATE POLICY "Equipment loans readable by authenticated"
ON public.equipment_loans
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Equipment loans writable by managers"
ON public.equipment_loans
FOR ALL
TO authenticated
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- Trigger to update equipment timestamp
CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Trigger to update equipment loans timestamp
CREATE TRIGGER update_equipment_loans_updated_at
BEFORE UPDATE ON public.equipment_loans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();