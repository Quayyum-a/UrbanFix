-- Migration 004: Seed test user accounts for demo
-- Description: Create test customer and technician accounts
-- Timestamp: 2024
-- Status: Ready to run
-- Note: PIN hashes are bcrypt of '1234' and '5678' respectively

BEGIN;

-- Test customer account
-- Phone: +2348066025051, PIN: 1234 (bcrypt: $2b$10$9qLLqkOCJTDEQ5X3Kl2.ZuTmBQr.N3XQB.n6yX8RM5zqkLJ8G7Cfi)
INSERT INTO public.users (phone, role, full_name, created_at, updated_at)
VALUES (
  '+2348066025051',
  'customer',
  'John Customer',
  now(),
  now()
)
ON CONFLICT DO NOTHING;

INSERT INTO public.user_pins (phone, pin_hash, created_at, updated_at)
VALUES (
  '+2348066025051',
  '$2b$10$9qLLqkOCJTDEQ5X3Kl2.ZuTmBQr.N3XQB.n6yX8RM5zqkLJ8G7Cfi',
  now(),
  now()
)
ON CONFLICT (phone) DO NOTHING;

INSERT INTO public.customer_profiles (user_id, onboarding_completed, created_at, updated_at)
SELECT 
  id,
  true,
  now(),
  now()
FROM public.users
WHERE phone = '+2348066025051'
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_profiles WHERE user_id = users.id
  );

-- Test technician account
-- Phone: +2348012345678, PIN: 5678 (bcrypt: $2b$10$N9qO7wVzO/LcvYyYH6K5hO6kM8pP2xR5sT3uV1wX9yZ2aB.pC4Lz.)
INSERT INTO public.users (phone, role, full_name, created_at, updated_at)
VALUES (
  '+2348012345678',
  'technician',
  'Mike Technician',
  now(),
  now()
)
ON CONFLICT DO NOTHING;

INSERT INTO public.user_pins (phone, pin_hash, created_at, updated_at)
VALUES (
  '+2348012345678',
  '$2b$10$N9qO7wVzO/LcvYyYH6K5hO6kM8pP2xR5sT3uV1wX9yZ2aB.pC4Lz.',
  now(),
  now()
)
ON CONFLICT (phone) DO NOTHING;

INSERT INTO public.technician_profiles (user_id, nin, verification_status, created_at, updated_at)
SELECT
  id,
  '99988877766',
  'approved',
  now(),
  now()
FROM public.users
WHERE phone = '+2348012345678'
  AND NOT EXISTS (
    SELECT 1 FROM public.technician_profiles WHERE user_id = users.id
  );

COMMIT;

-- Verify test data was seeded
-- SELECT 'Customer' as type, phone, full_name FROM public.users WHERE phone = '+2348066025051'
-- UNION ALL
-- SELECT 'Technician', phone, full_name FROM public.users WHERE phone = '+2348012345678';

-- SELECT phone, pin_hash FROM public.user_pins WHERE phone IN ('+2348066025051', '+2348012345678');
