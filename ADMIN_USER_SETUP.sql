-- ============================================
-- Create Admin User for UrbanFix
-- Phone: +2348066025051
-- PIN: 5555
-- Role: admin
-- ============================================
-- Instructions:
-- 1. Go to Supabase Dashboard → Your Project → SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" to execute
-- 4. Admin user will be created and ready to use
-- ============================================

-- First, check if this phone number already exists
-- (If it does, skip the users table insert below)

-- Step 1: Create or update the user_pins record
-- PIN hash for "5555" using bcrypt (rounds=10)
-- This is a pre-computed hash: bcrypt("5555", rounds=10)
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

-- Step 2: Create the admin user (if not already created)
-- This will be inserted automatically on first login, but we can create it now for convenience
INSERT INTO public.users (phone, role, full_name, avatar_url, created_at, updated_at)
VALUES (
  '+2348066025051',
  'admin',
  'Admin',
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Step 3: Verify the setup
SELECT 'User created/updated successfully' as status;
SELECT phone, role, full_name, created_at FROM public.users WHERE phone = '+2348066025051';
SELECT phone, attempts, locked_until FROM public.user_pins WHERE phone = '+2348066025051';
