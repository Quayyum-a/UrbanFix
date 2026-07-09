-- Seed file for test users
-- Run this in Supabase SQL Editor to create test users for development

-- Test User 1: Customer (Quayyum Ariyo)
-- Phone: +2348066025051
-- OTP: 123456

-- Insert into users table (using auth.users UUID)
INSERT INTO public.users (id, phone, role, full_name, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
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
VALUES (
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- Test User 2: Verified Technician (for testing dashboard)
-- Phone: +2348012345678
-- OTP: 654321

INSERT INTO public.users (id, phone, role, full_name, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000003'::uuid,
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
VALUES (
  'a0000000-0000-0000-0000-000000000004'::uuid,
  'a0000000-0000-0000-0000-000000000003'::uuid,
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
)
ON CONFLICT (user_id) DO UPDATE SET
  verification_status = 'approved',
  is_available = true;

-- Test User 3: Pending Verification Technician
-- Phone: +2348098765432
-- OTP: 111222

INSERT INTO public.users (id, phone, role, full_name, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000005'::uuid,
  '+2348098765432',
  'technician',
  'Jane Tech',
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- Create pending technician profile
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
VALUES (
  'a0000000-0000-0000-0000-000000000006'::uuid,
  'a0000000-0000-0000-0000-000000000005'::uuid,
  '09876543210',
  'https://example.com/nin2.jpg',
  'Shop 45, Alaba International Market, Ojo, Lagos State',
  'Access Bank',
  '9876543210',
  'Jane Tech',
  'pending',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  verification_status = 'pending';

-- Test User 4: Admin User
-- Phone: +2349012345678
-- OTP: 999888

INSERT INTO public.users (id, phone, role, full_name, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000007'::uuid,
  '+2349012345678',
  'admin',
  'Admin User',
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  role = 'admin',
  full_name = EXCLUDED.full_name;

-- Verify the insertions
SELECT id, phone, role, full_name FROM public.users 
WHERE phone IN ('+2348066025051', '+2348012345678', '+2348098765432', '+2349012345678')
ORDER BY created_at;

SELECT user_id, verification_status, is_available FROM public.technician_profiles
WHERE user_id IN (
  'a0000000-0000-0000-0000-000000000003'::uuid,
  'a0000000-0000-0000-0000-000000000005'::uuid
);

-- Display test accounts info
SELECT 
  '=== TEST ACCOUNTS ===' as info,
  '' as phone,
  '' as role,
  '' as password
UNION ALL
SELECT 
  'Customer' as info,
  '+2348066025051' as phone,
  'customer' as role,
  '123456' as password
UNION ALL
SELECT 
  'Verified Technician' as info,
  '+2348012345678' as phone,
  'technician' as role,
  '654321' as password
UNION ALL
SELECT 
  'Pending Technician' as info,
  '+2348098765432' as phone,
  'technician' as role,
  '111222' as password
UNION ALL
SELECT 
  'Admin' as info,
  '+2349012345678' as phone,
  'admin' as role,
  '999888' as password;
