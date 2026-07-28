-- FIRST: Delete the broken policies
DROP POLICY IF EXISTS "Users can upload to own paths 1rib2xb_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;

-- NOW: Create correct policies with proper AND syntax

-- Policy 1: Allow INSERT (upload)
CREATE POLICY "Users can upload to own paths"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'technician-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow SELECT (read)
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'technician-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify policies were created
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;
