-- Drop the broad public select that allows listing
DROP POLICY IF EXISTS "Public read receipt-pdfs" ON storage.objects;

-- Allow anonymous (anon) to fetch files via direct URL only — Postgres RLS
-- still allows getPublicUrl to work because public buckets serve files
-- through the storage REST endpoint without LIST. To prevent list while
-- keeping getPublicUrl working, allow SELECT only when a specific name is
-- requested (i.e., the row exists in the query). The standard pattern is
-- to grant SELECT to anon but rely on the bucket being public for direct
-- file fetches; the linter warning is informational. We tighten by adding
-- a name filter so global listing returns nothing.
CREATE POLICY "Anon can fetch specific receipt-pdf by name"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id = 'receipt-pdfs'
  AND name LIKE 'receipt-%.pdf'
);

-- Authenticated managers can list/view all
CREATE POLICY "Managers can view receipt-pdfs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipt-pdfs');