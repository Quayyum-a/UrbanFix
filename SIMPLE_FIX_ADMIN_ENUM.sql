-- SIMPLE FIX FOR ADMIN ENUM ERROR
-- Use this if the other script fails
-- 
-- Steps:
-- 1. Go to Supabase SQL Editor
-- 2. Copy and paste EACH query separately (one at a time)
-- 3. Run each one individually
-- 4. If one fails, skip it and continue to the next

-- ============================================
-- QUERY 1: Add 'admin' to user_role enum
-- ============================================
-- Drop policies that use user_role
DROP POLICY IF EXISTS "Customers can view approved technician profiles" ON public.technician_profiles;
DROP POLICY IF EXISTS "Technicians can view available jobs for assignment" ON public.jobs;
DROP POLICY IF EXISTS "Customers can view all technician pricing" ON public.technician_pricing;
DROP POLICY IF EXISTS "Technicians can create requests" ON public.parts_requests;

-- Drop view that uses user_role
DROP VIEW IF EXISTS public.technician_performance_leaderboard;

-- Create new enum with admin
CREATE TYPE public.user_role_temp AS ENUM ('customer', 'technician', 'admin');

-- Create temp column
ALTER TABLE public.users ADD COLUMN role_temp public.user_role_temp;

-- Copy data from old column to temp column
UPDATE public.users SET role_temp = role::text::public.user_role_temp;

-- Drop old column
ALTER TABLE public.users DROP COLUMN role;

-- Rename columns
ALTER TABLE public.users RENAME COLUMN role_temp TO role;

-- Drop old type
DROP TYPE public.user_role;

-- Rename new type
ALTER TYPE public.user_role_temp RENAME TO user_role;


-- ============================================
-- QUERY 2: Create admin PIN record
-- ============================================
INSERT INTO public.user_pins (phone, pin_hash, attempts, locked_until, created_at, updated_at)
VALUES (
  '+2348066025051',
  '$2b$10$9qLLqkOCJTDEQ5X3Kl2.ZuTmBQr.N3XQB.n6yX8RM5zqkLJ8G7Cfi',
  0,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  pin_hash = '$2b$10$9qLLqkOCJTDEQ5X3Kl2.ZuTmBQr.N3XQB.n6yX8RM5zqkLJ8G7Cfi',
  attempts = 0,
  locked_until = NULL,
  updated_at = NOW();


-- ============================================
-- QUERY 3: Create admin user
-- ============================================
INSERT INTO public.users (phone, role, full_name, avatar_url, created_at, updated_at)
VALUES (
  '+2348066025051',
  'admin'::public.user_role,
  'Admin',
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  role = 'admin'::public.user_role,
  updated_at = NOW();


-- ============================================
-- QUERY 4: Recreate policies (optional but recommended)
-- ============================================
CREATE POLICY "Customers can view approved technician profiles" ON public.technician_profiles
  FOR SELECT
  USING (verification_status = 'approved'::public.verification_status);

CREATE POLICY "Technicians can view available jobs for assignment" ON public.jobs
  FOR SELECT
  USING (status = 'paid'::public.job_status);

CREATE POLICY "Customers can view all technician pricing" ON public.technician_pricing
  FOR SELECT
  USING (true);

CREATE POLICY "Technicians can create requests" ON public.parts_requests
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- QUERY 5: Verify it worked
-- ============================================
-- Run these to check:
SELECT 'Admin user created' as status, phone, role FROM public.users WHERE phone = '+2348066025051';
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') ORDER BY enumlabel;

-- If these work, you're done!
