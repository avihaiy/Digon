-- Create enums for roles and statuses
CREATE TYPE public.app_role AS ENUM ('admin', 'gabai', 'viewer');
CREATE TYPE public.payment_method AS ENUM ('bit', 'cash');
CREATE TYPE public.payment_status AS ENUM ('pending', 'confirmed');
CREATE TYPE public.aliya_status AS ENUM ('pending', 'paid', 'waived');
CREATE TYPE public.aliya_type AS ENUM ('kohen', 'levi', 'shlishi', 'revii', 'chamishi', 'shishi', 'shvii', 'maftir', 'hagbaha', 'glila');

-- Members table
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Aliyot table
CREATE TABLE public.aliyot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shabbat_date DATE NOT NULL,
    parasha TEXT NOT NULL,
    aliya_type public.aliya_type NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    price DECIMAL(10, 2) DEFAULT 0,
    status public.aliya_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(shabbat_date, aliya_type)
);

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    aliya_id UUID REFERENCES public.aliyot(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    method public.payment_method NOT NULL,
    reference TEXT,
    received_by UUID REFERENCES auth.users(id),
    status public.payment_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Receipts table with auto-increment number
CREATE SEQUENCE public.receipt_number_seq START 1001;

CREATE TABLE public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number INTEGER DEFAULT nextval('public.receipt_number_seq'),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit log table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Profiles table for user display info
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aliyot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any management role
CREATE OR REPLACE FUNCTION public.is_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'gabai')
  )
$$;

-- RLS Policies

-- Members: readable by authenticated, writable by admin/gabai
CREATE POLICY "Members readable by authenticated" ON public.members
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members writable by managers" ON public.members
    FOR ALL TO authenticated
    USING (public.is_manager(auth.uid()))
    WITH CHECK (public.is_manager(auth.uid()));

-- Aliyot: readable by authenticated, writable by admin/gabai
CREATE POLICY "Aliyot readable by authenticated" ON public.aliyot
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Aliyot writable by managers" ON public.aliyot
    FOR ALL TO authenticated
    USING (public.is_manager(auth.uid()))
    WITH CHECK (public.is_manager(auth.uid()));

-- Payments: readable by authenticated, writable by admin/gabai
CREATE POLICY "Payments readable by authenticated" ON public.payments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Payments writable by managers" ON public.payments
    FOR ALL TO authenticated
    USING (public.is_manager(auth.uid()))
    WITH CHECK (public.is_manager(auth.uid()));

-- Receipts: readable by authenticated, writable by admin/gabai
CREATE POLICY "Receipts readable by authenticated" ON public.receipts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Receipts writable by managers" ON public.receipts
    FOR ALL TO authenticated
    USING (public.is_manager(auth.uid()))
    WITH CHECK (public.is_manager(auth.uid()));

-- Notifications: users see their own
CREATE POLICY "Users see own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Managers can create notifications" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (public.is_manager(auth.uid()));

-- Audit logs: readable by admin only
CREATE POLICY "Audit logs readable by admin" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Audit logs insertable by authenticated" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- User roles: readable by authenticated, writable by admin
CREATE POLICY "Roles readable by authenticated" ON public.user_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Roles writable by admin" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles: users can read all, update own
CREATE POLICY "Profiles readable by authenticated" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_aliyot_updated_at
    BEFORE UPDATE ON public.aliyot
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();