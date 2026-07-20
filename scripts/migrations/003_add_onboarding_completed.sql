-- Migration 003: Add onboarding_completed to customer_profiles
-- Description: Track whether customer has completed onboarding
-- Timestamp: 2024
-- Status: Ready to run

BEGIN;

-- Add onboarding_completed column
ALTER TABLE public.customer_profiles
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;

-- Mark existing profiles with data as completed
UPDATE public.customer_profiles
SET onboarding_completed = true
WHERE address_text IS NOT NULL OR location IS NOT NULL;

-- Add column comment
COMMENT ON COLUMN public.customer_profiles.onboarding_completed IS 
  'Flag indicating whether customer has completed address/location onboarding. 
   Set to true after successful profile creation.';

COMMIT;

-- Verify column was added
-- SELECT COUNT(*) as total, 
--        COUNT(CASE WHEN onboarding_completed = true THEN 1 END) as completed,
--        COUNT(CASE WHEN onboarding_completed = false THEN 1 END) as incomplete
-- FROM public.customer_profiles;
