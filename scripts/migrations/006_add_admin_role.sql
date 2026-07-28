-- Migration 006: Add admin role back to user_role enum
-- Description: Restore 'admin' role to the user_role enum type
-- Reason: We removed it in migration 002, but now need it for admin dashboard
-- Status: Ready to run

BEGIN;

-- Step 1: Create a new enum type with admin included
CREATE TYPE public.user_role_new AS ENUM ('customer', 'technician', 'admin');

-- Step 2: Rename the old enum to a backup (we'll drop it later)
ALTER TYPE public.user_role RENAME TO user_role_old;

-- Step 3: Rename the new enum to the official name
ALTER TYPE public.user_role_new RENAME TO user_role;

-- Step 4: Update all tables that use the old enum type
-- This is done implicitly by Postgres when we use USING clause
-- But since we're just extending the enum, existing values are preserved

-- Step 5: Update any functions or policies that reference the enum
-- (get_user_role() function will automatically work with new enum)

-- Step 6: Drop the old enum type
DROP TYPE public.user_role_old;

-- Step 7: Verify the change
-- Run this manually to verify:
-- SELECT * FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype;

COMMIT;

-- Verification queries (run after migration):
-- SELECT typname, enumlabel FROM pg_type, pg_enum WHERE pg_type.oid = pg_enum.enumtypid AND typname = 'user_role' ORDER BY enumlabel;
-- This should show: admin, customer, technician
