-- Migration 002: Update users table - Remove admin role
-- Description: Modify users.role to only allow 'customer' and 'technician'
-- Timestamp: 2024
-- Status: Ready to run
-- Note: This migration converts any 'admin' roles to 'customer'

BEGIN;

-- First, migrate any admin records to customer (data preservation)
UPDATE public.users
SET role = 'customer'
WHERE role = 'admin';

-- Drop policies/views that depend on users.role so the column can be dropped.
-- Admin-only policies are intentionally NOT recreated below (admin role is being
-- removed app-wide); customer/technician-only policies and the leaderboard view
-- are recreated after the type swap.
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.technician_verifications;
DROP POLICY IF EXISTS "Admins can update verification status" ON public.technician_verifications;
DROP POLICY IF EXISTS "Admins can view all documents" ON public.verification_documents;
DROP POLICY IF EXISTS "Admins can manage repair categories" ON public.repair_categories;
DROP POLICY IF EXISTS "Customers can view all technician pricing" ON public.technician_pricing;
DROP POLICY IF EXISTS "Admins can view all earnings" ON public.technician_earnings;
DROP POLICY IF EXISTS "Technicians can create requests" ON public.parts_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.parts_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.parts_requests;
DROP POLICY IF EXISTS "Admins can delete requests" ON public.parts_requests;
DROP VIEW IF EXISTS public.technician_performance_leaderboard;

-- get_user_role() returns user_role, so every policy calling it also blocks the
-- type drop. Drop them all here; the admin-only ones are not recreated, the
-- customer/technician ones and the function are recreated after the type swap.
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all customer profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can view approved technician profiles" ON public.technician_profiles;
DROP POLICY IF EXISTS "Admins can manage all technician profiles" ON public.technician_profiles;
DROP POLICY IF EXISTS "Admins can manage parts catalogue" ON public.parts_catalogue;
DROP POLICY IF EXISTS "Technicians can view available jobs for assignment" ON public.jobs;
DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP FUNCTION IF EXISTS public.get_user_role();

-- Create new enum type without admin
CREATE TYPE public.user_role_new AS ENUM ('customer', 'technician');

-- Add new column with new enum type
ALTER TABLE public.users
ADD COLUMN role_new public.user_role_new;

-- Migrate data to new column
UPDATE public.users
SET role_new = role::text::public.user_role_new
WHERE role_new IS NULL;

-- Verify migration success
-- SELECT role, role_new, COUNT(*) FROM public.users GROUP BY role, role_new;

-- Drop old column
ALTER TABLE public.users DROP COLUMN role;

-- Rename new column to role
ALTER TABLE public.users RENAME COLUMN role_new TO role;

-- Drop old enum type
DROP TYPE public.user_role;

-- Rename new enum type
ALTER TYPE public.user_role_new RENAME TO user_role;

-- Add constraint to ensure role is always set
ALTER TABLE public.users
ALTER COLUMN role SET NOT NULL;

-- Update column comment
COMMENT ON COLUMN public.users.role IS 'User role: customer or technician (admin moved to separate system)';

-- Recreate get_user_role(), unchanged, now bound to the new enum type.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT role FROM users
    WHERE id = auth.uid()
  );
END;
$function$;

CREATE POLICY "Customers can view approved technician profiles" ON public.technician_profiles
  FOR SELECT
  USING (
    verification_status = 'approved'::public.verification_status
    AND get_user_role() = 'customer'::public.user_role
  );

CREATE POLICY "Technicians can view available jobs for assignment" ON public.jobs
  FOR SELECT
  USING (
    status = 'paid'::public.job_status
    AND technician_id IS NULL
    AND get_user_role() = 'technician'::public.user_role
    AND EXISTS (
      SELECT 1 FROM public.technician_profiles
      WHERE technician_profiles.user_id = auth.uid()
        AND technician_profiles.verification_status = 'approved'::public.verification_status
        AND technician_profiles.is_available = true
    )
  );

-- Recreate the customer/technician-facing policies dropped above, without the
-- now-nonexistent admin branch.
CREATE POLICY "Customers can view all technician pricing" ON public.technician_pricing
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'customer'::public.user_role
    )
  );

CREATE POLICY "Technicians can create requests" ON public.parts_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = technician_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'technician'::public.user_role
    )
  );

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
     JOIN public.technician_earnings te ON u.id = te.technician_id
     LEFT JOIN public.reviews r ON u.id = r.reviewee_id
  WHERE u.role = 'technician'::public.user_role
  GROUP BY u.id, u.full_name
  ORDER BY count(DISTINCT te.id) DESC;

COMMIT;

-- Verify all roles are valid
-- SELECT DISTINCT role FROM public.users;
-- SELECT COUNT(*) FROM public.users WHERE role NOT IN ('customer', 'technician');
