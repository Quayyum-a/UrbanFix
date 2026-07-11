-- Seed file for test users
-- Run this in Supabase SQL Editor to create test users for development
-- This script is idempotent - can be run multiple times safely

-- Clean up existing test data first to avoid conflicts
-- Delete by phone number to avoid UUID/string ID conflicts
DELETE FROM public.technician_profiles 
WHERE user_id IN (
  SELECT id FROM public.users WHERE phone IN ('+2348012345678', '+2348098765432')
);

DELETE FROM public.customer_profiles 
WHERE user_id IN (
  SELECT id FROM public.users WHERE phone IN ('+2348066025051', '+2348012345678', '+2348098765432', '+2349012345678')
);

DELETE FROM public.users 
WHERE phone IN ('+2348066025051', '+2348012345678', '+2348098765432', '+2349012345678');

-- Test User 1: Customer (Quayyum Ariyo)
-- Phone: +2348066025051
-- OTP: 123456

INSERT INTO public.users (id, phone, role, full_name, created_at)
VALUES (
  gen_random_uuid(),
  '+2348066025051',
  'customer',
  'Quayyum Ariyo',
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- Insert into customer_profiles table
INSERT INTO public.customer_profiles (id, user_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  id,
  NOW(),
  NOW()
FROM public.users
WHERE phone = '+2348066025051'
ON CONFLICT (user_id) DO NOTHING;

-- Test User 2: Verified Technician (for testing dashboard)
-- Phone: +2348012345678
-- OTP: 654321

INSERT INTO public.users (id, phone, role, full_name, created_at)
VALUES (
  gen_random_uuid(),
  '+2348012345678',
  'technician',
  'John Technician',
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- Create verified technician profile
INSERT INTO public.technician_profiles (
  id,
  user_id,
  nin,
  nin_doc_url,
  shop_address,
  bank_name,
  bank_account_number,
  bank_account_name,
  verification_status,
  is_available,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id,
  '12345678901',
  'https://example.com/nin.jpg',
  'Shop 12, Computer Village, Ikeja, Lagos State',
  'GTBank',
  '0123456789',
  'John Technician',
  'approved',
  true,
  NOW(),
  NOW()
FROM public.users
WHERE phone = '+2348012345678'
ON CONFLICT (user_id) DO UPDATE SET
  verification_status = 'approved',
  is_available = true,
  updated_at = NOW();

-- Test User 3: Fresh Technician (needs to complete onboarding)
-- Phone: +2348098765432
-- OTP: 111222
-- NOTE: No technician_profile created - they will go through onboarding flow

INSERT INTO public.users (id, phone, role, full_name, created_at)
VALUES (
  gen_random_uuid(),
  '+2348098765432',
  'technician',
  'Jane Tech',
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- NO technician_profile inserted for this user - they need to onboard

-- Test User 4: Admin User
-- Phone: +2349012345678
-- OTP: 999888

INSERT INTO public.users (id, phone, role, full_name, created_at)
VALUES (
  gen_random_uuid(),
  '+2349012345678',
  'admin',
  'Admin User',
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  role = 'admin',
  full_name = EXCLUDED.full_name;

-- Verify the insertions
SELECT 
  '=== VERIFICATION ===' as check_type,
  id, 
  phone, 
  role, 
  full_name 
FROM public.users 
WHERE phone IN ('+2348066025051', '+2348012345678', '+2348098765432', '+2349012345678')
ORDER BY created_at;

SELECT 
  user_id, 
  nin,
  verification_status, 
  is_available 
FROM public.technician_profiles tp
JOIN public.users u ON u.id = tp.user_id
WHERE u.phone IN ('+2348012345678', '+2348098765432');

-- Display test accounts info
SELECT 
  '=== TEST ACCOUNTS ===' as info,
  '' as phone,
  '' as role,
  '' as password,
  '' as notes
UNION ALL
SELECT 
  'Customer' as info,
  '+2348066025051' as phone,
  'customer' as role,
  'OTP: 123456' as password,
  'Can book repairs' as notes
UNION ALL
SELECT 
  'Verified Technician' as info,
  '+2348012345678' as phone,
  'technician' as role,
  'OTP: 654321' as password,
  'Can access dashboard & accept jobs' as notes
UNION ALL
SELECT 
  'Fresh Technician' as info,
  '+2348098765432' as phone,
  'technician' as role,
  'OTP: 111222' as password,
  'Needs to complete onboarding' as notes
UNION ALL
SELECT 
  'Admin' as info,
  '+2349012345678' as phone,
  'admin' as role,
  'OTP: 999888' as password,
  'Can approve technicians & manage platform' as notes;
