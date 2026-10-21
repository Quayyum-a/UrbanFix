-- =============================================================================
-- 004: Version check between the app and the database.
--
-- The app compares these numbers at sign-in and shows "update the app" or
-- "run the database update" instead of wrong prices when the two don't match.
-- Safe to run again.
-- =============================================================================
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS min_app_build int NOT NULL DEFAULT 2 CHECK (min_app_build >= 1);

-- Raise this when a future update needs everyone on the newest app:
--   UPDATE public.settings SET min_app_build = 3 WHERE id = 1;

NOTIFY pgrst, 'reload schema';
