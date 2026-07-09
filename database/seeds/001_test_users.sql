-- Seed file for test users
-- Run this in Supabase SQL Editor to create test users for development

-- Test User 1: Customer (Quayyum Ariyo)
-- Phone: +2348066025051
-- OTP: 123456

-- Insert into users table
INSERT INTO users (id, phone, role, full_name, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '+2348066025051',
  'customer',
  'Quayyum Ariyo',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- Insert into customer_profiles table
INSERT INTO customer_profiles (id, user_id, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- Test User 2: Technician
-- Phone: +2348012345678
-- OTP: 654321

INSERT INTO users (id, phone, role, full_name, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000003'::uuid,
  '+2348012345678',
  'technician',
  'John Technician',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- Note: Technician profile will be created during verification workflow
-- so we don't seed it here

-- Verify the insertions
SELECT * FROM users WHERE phone IN ('+2348066025051', '+2348012345678');
SELECT * FROM customer_profiles WHERE user_id = 'a0000000-0000-0000-0000-000000000001'::uuid;
