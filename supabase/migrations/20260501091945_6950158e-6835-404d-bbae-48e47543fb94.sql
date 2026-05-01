-- Create public bucket for shareable receipt PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-pdfs', 'receipt-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access (anyone with link)
CREATE POLICY "Public read receipt-pdfs"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipt-pdfs');

-- Managers can upload
CREATE POLICY "Managers upload receipt-pdfs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipt-pdfs' AND public.is_manager(auth.uid()));

-- Managers can update
CREATE POLICY "Managers update receipt-pdfs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipt-pdfs' AND public.is_manager(auth.uid()));

-- Managers can delete
CREATE POLICY "Managers delete receipt-pdfs"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipt-pdfs' AND public.is_manager(auth.uid()));

-- Allow public (anonymous) read of receipts table for the public view page
CREATE POLICY "Receipts publicly readable for share link"
ON public.receipts FOR SELECT
TO anon
USING (true);

-- Allow public read of members minimal info for receipt display
CREATE POLICY "Members publicly readable for receipt share"
ON public.members FOR SELECT
TO anon
USING (true);

-- Allow public read of payments minimal info for receipt display
CREATE POLICY "Payments publicly readable for receipt share"
ON public.payments FOR SELECT
TO anon
USING (true);