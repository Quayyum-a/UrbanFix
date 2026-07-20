-- Migration 005: Fix RLS policies for PIN-based auth
-- Description: The PIN auth rebuild (migrations 001-004) replaced Supabase Auth
-- (OTP + auth.uid() sessions) with a custom, session-less PIN flow that talks to
-- Postgres directly using only the anon key. auth.uid() is now ALWAYS null, so
-- every existing policy gated on auth.uid() silently blocks all reads/writes -
-- e.g. "new row violates row-level security policy for table user_pins" when
-- creating a PIN, and the same failure mode on users/customer_profiles during
-- registration.
--
-- These are ADDITIVE permissive policies (existing auth.uid()-based policies are
-- left in place but are dead code until real Supabase Auth sessions come back).
-- This intentionally matches the already-documented demo-grade security model of
-- lib/auth/pin-service.ts (PIN hashing is a lookup table, not real bcrypt) - do not
-- treat this as production-ready without a server-side auth layer.
-- Status: Ready to run

BEGIN;

-- user_pins: allow the anon key to create/read/update PIN records.
DROP POLICY IF EXISTS "anon_can_create_pin" ON public.user_pins;
CREATE POLICY "anon_can_create_pin" ON public.user_pins
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon_can_read_pin" ON public.user_pins;
CREATE POLICY "anon_can_read_pin" ON public.user_pins
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_can_update_pin" ON public.user_pins;
CREATE POLICY "anon_can_update_pin" ON public.user_pins
  FOR UPDATE USING (true) WITH CHECK (true);

-- users: allow the anon key to register new users and look up/update profiles by phone.
DROP POLICY IF EXISTS "anon_can_register_user" ON public.users;
CREATE POLICY "anon_can_register_user" ON public.users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon_can_read_users" ON public.users;
CREATE POLICY "anon_can_read_users" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_can_update_users" ON public.users;
CREATE POLICY "anon_can_update_users" ON public.users
  FOR UPDATE USING (true) WITH CHECK (true);

-- customer_profiles: allow the anon key to create/read/update the profile row
-- created during registration.
DROP POLICY IF EXISTS "anon_can_create_customer_profile" ON public.customer_profiles;
CREATE POLICY "anon_can_create_customer_profile" ON public.customer_profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon_can_read_customer_profile" ON public.customer_profiles;
CREATE POLICY "anon_can_read_customer_profile" ON public.customer_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_can_update_customer_profile" ON public.customer_profiles;
CREATE POLICY "anon_can_update_customer_profile" ON public.customer_profiles
  FOR UPDATE USING (true) WITH CHECK (true);

COMMIT;

-- Verify policies were created
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('user_pins', 'users', 'customer_profiles') ORDER BY tablename, policyname;
