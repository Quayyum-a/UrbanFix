-- The technician_profiles table should allow authenticated users to insert their own profile during onboarding
-- If RLS is blocking inserts, we need to either:
-- 1. Disable RLS on technician_profiles (simplest for now)
-- 2. Add proper INSERT policy allowing users to insert their own profile

-- OPTION 1: Disable RLS on technician_profiles (for development/testing)
ALTER TABLE technician_profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_class 
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE tablename = 'technician_profiles' AND schemaname = 'public';

-- OPTION 2: If you want to keep RLS, create a policy allowing users to insert their own profile
-- ALTER TABLE technician_profiles ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Users can insert their own technician profile"
--   ON technician_profiles
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can view their own technician profile"
--   ON technician_profiles
--   FOR SELECT
--   TO authenticated
--   USING (auth.uid() = user_id);
