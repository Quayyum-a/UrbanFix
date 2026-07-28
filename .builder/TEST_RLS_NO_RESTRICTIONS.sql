-- TEMPORARY: Drop all policies to test without RLS
DROP POLICY IF EXISTS "Users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can read" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own paths" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own paths 1rib2xb_0" ON storage.objects;

-- DISABLE RLS temporarily to test if that's the blocker
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_class 
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Verify no policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
