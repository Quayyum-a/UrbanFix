-- Migration 001: Create user_pins table
-- Description: Create table for PIN-based authentication (demo purposes)
-- Timestamp: 2024
-- Status: Ready to run

BEGIN;

-- Create the user_pins table
CREATE TABLE IF NOT EXISTS public.user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(14) UNIQUE NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast phone lookups
CREATE INDEX IF NOT EXISTS idx_user_pins_phone ON public.user_pins(phone);

-- Create index for lockout checks
CREATE INDEX IF NOT EXISTS idx_user_pins_locked_until ON public.user_pins(locked_until);

-- Add table comment
COMMENT ON TABLE public.user_pins IS 'Stores PIN credentials for demo authentication. PIN is bcrypt hashed.';
COMMENT ON COLUMN public.user_pins.phone IS 'Nigerian phone number in +234... format';
COMMENT ON COLUMN public.user_pins.pin_hash IS 'Bcrypt hashed 4-digit PIN';
COMMENT ON COLUMN public.user_pins.attempts IS 'Failed attempt counter (reset on success)';
COMMENT ON COLUMN public.user_pins.locked_until IS 'Timestamp until which this phone is locked due to rate limiting';

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to access their own PIN records
CREATE POLICY "users_own_pin_policy" ON public.user_pins
  FOR ALL
  USING (
    auth.uid() = (
      SELECT id FROM public.users WHERE phone = user_pins.phone LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT id FROM public.users WHERE phone = user_pins.phone LIMIT 1
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_pins_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_pins_update_timestamp
BEFORE UPDATE ON public.user_pins
FOR EACH ROW
EXECUTE FUNCTION public.update_user_pins_timestamp();

COMMIT;

-- Verify table was created
-- SELECT * FROM information_schema.tables WHERE table_name = 'user_pins';
