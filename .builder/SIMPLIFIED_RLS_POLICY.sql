-- STEP 1: Delete the old policies
DROP POLICY IF EXISTS "Users can upload to own paths" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;

-- STEP 2: Create SIMPLIFIED policies (no path scoping - just test bucket access)
CREATE POLICY "Users can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'technician-documents');

CREATE POLICY "Users can read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'technician-documents');

-- Verify
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
