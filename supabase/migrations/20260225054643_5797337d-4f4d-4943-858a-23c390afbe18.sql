CREATE TABLE IF NOT EXISTS public.ticker_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.ticker_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticker items readable by all" ON public.ticker_items FOR SELECT USING (true);

CREATE POLICY "Ticker items writable by managers" ON public.ticker_items FOR ALL USING (is_manager(auth.uid())) WITH CHECK (is_manager(auth.uid()));