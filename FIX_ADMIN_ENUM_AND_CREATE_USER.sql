-- Complete Admin Setup SQL
-- Step 1: Add 'admin' to user_role enum (if it doesn't exist)
-- Step 2: Create admin user with PIN
-- 
-- Instructions:
-- 1. Copy everything below
-- 2. Go to Supabase → SQL Editor
-- 3. Click "+ New Query"
-- 4. Paste this entire script
-- 5. Click "Run"

BEGIN;

-- Step 1: Fix the enum type to include 'admin'
-- We need to create a new type because PostgreSQL doesn't allow altering enums directly
-- First, backup existing policies that depend on user_role
DROP POLICY IF EXISTS "Customers can view approved technician profiles" ON public.technician_profiles;
DROP POLICY IF EXISTS "Technicians can view available jobs for assignment" ON public.jobs;
DROP POLICY IF EXISTS "Customers can view all technician pricing" ON public.technician_pricing;
DROP POLICY IF EXISTS "Technicians can create requests" ON public.parts_requests;
DROP VIEW IF EXISTS public.technician_performance_leaderboard;

-- Create new enum type with admin role included
CREATE TYPE public.user_role_new AS ENUM ('customer', 'technician', 'admin');

-- Now we need to drop the old user_role type and replace it
-- But first, we need to drop all constraints that reference it
-- This is a bit tricky, so we'll do it carefully

-- Add a temporary column with the new enum type
ALTER TABLE public.users ADD COLUMN role_new public.user_role_new;

-- Copy existing data (customer and technician will work fine)
UPDATE public.users SET role_new = role::text::public.user_role_new WHERE role_new IS NULL;

-- Drop the old column and type
ALTER TABLE public.users DROP COLUMN role;
ALTER TYPE public.user_role RENAME TO user_role_old;
ALTER TYPE public.user_role_new RENAME TO user_role;

-- Rename the new column back to role
ALTER TABLE public.users RENAME COLUMN role_new TO role;

-- Remove the old enum type
DROP TYPE public.user_role_old;

-- Ensure the column is not null
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

-- Step 2: Create the admin user
-- First, create the PIN record
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

-- Create the admin user record
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

-- Recreate the policies that were dropped earlier
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

-- Recreate the leaderboard view
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

COMMIT;

-- Verification queries (optional - check these succeeded):
-- SELECT * FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role');
-- Should show: admin, customer, technician
-- 
-- SELECT phone, role, full_name FROM public.users WHERE phone = '+2348066025051';
-- Should show: +2348066025051 | admin | Admin
