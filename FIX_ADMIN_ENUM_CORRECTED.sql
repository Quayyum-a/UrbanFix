-- CORRECTED FIX FOR ADMIN ENUM ERROR
-- Properly handles the get_user_role() function dependency
-- 
-- Instructions:
-- 1. Go to Supabase SQL Editor
-- 2. Copy and paste the ENTIRE script
-- 3. Click "Run"

BEGIN;

-- Step 1: Drop dependent policies first
DROP POLICY IF EXISTS "Customers can view approved technician profiles" ON public.technician_profiles;
DROP POLICY IF EXISTS "Technicians can view available jobs for assignment" ON public.jobs;
DROP POLICY IF EXISTS "Customers can view all technician pricing" ON public.technician_pricing;
DROP POLICY IF EXISTS "Technicians can create requests" ON public.parts_requests;

-- Step 2: Drop view that uses the enum
DROP VIEW IF EXISTS public.technician_performance_leaderboard;

-- Step 3: Drop the function that uses the old enum
DROP FUNCTION IF EXISTS public.get_user_role();

-- Step 4: Create new enum type with admin included
CREATE TYPE public.user_role_new AS ENUM ('customer', 'technician', 'admin');

-- Step 5: Add temporary column with new enum type
ALTER TABLE public.users ADD COLUMN role_new public.user_role_new;

-- Step 6: Copy data from old column to new column
UPDATE public.users SET role_new = role::text::public.user_role_new WHERE role_new IS NULL;

-- Step 7: Drop the old column
ALTER TABLE public.users DROP COLUMN role;

-- Step 8: Drop the old enum type (no more dependencies!)
DROP TYPE public.user_role;

-- Step 9: Rename new column and type to official names
ALTER TABLE public.users RENAME COLUMN role_new TO role;
ALTER TYPE public.user_role_new RENAME TO user_role;

-- Step 10: Recreate the get_user_role() function with new enum
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT role FROM public.users
    WHERE id = auth.uid()
  );
END;
$function$;

-- Step 11: Recreate the policies
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

-- Step 12: Recreate the leaderboard view
CREATE VIEW public.technician_performance_leaderboard AS
 SELECT u.id AS technician_id,
    u.full_name AS technician_name,
    count(DISTINCT te.id) AS total_jobs,
    sum(te.net_earnings) AS total_earnings,
    avg(r.rating)::numeric(3,2) AS average_rating,
    count(DISTINCT r.id) AS review_count,
    rank() OVER (ORDER BY count(DISTINCT te.id) DESC) AS jobs_rank,
    rank() OVER (ORDER BY sum(te.net_earnings) DESC) AS earnings_rank,
    rank() OVER (ORDER BY avg(r.rating) DESC, count(DISTINCT r.id) DESC) AS rating_rank
   FROM public.users u
     LEFT JOIN public.technician_earnings te ON u.id = te.technician_id
     LEFT JOIN public.reviews r ON u.id = r.reviewee_id
  WHERE u.role = 'technician'::public.user_role
  GROUP BY u.id, u.full_name
  ORDER BY count(DISTINCT te.id) DESC;

-- Step 13: Create admin PIN record
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

-- Step 14: Create admin user with admin role
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

COMMIT;

-- Verification (optional - run these separately to check):
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') ORDER BY enumlabel;
-- Should show: admin, customer, technician
--
-- SELECT phone, role, full_name FROM public.users WHERE phone = '+2348066025051';
-- Should show: +2348066025051 | admin | Admin
