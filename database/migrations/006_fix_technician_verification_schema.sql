-- Fix technician_verifications schema
-- Issue 1: Make BVN optional (form doesn't collect it)
-- Issue 2: Make bank_code optional (form doesn't collect it)  
-- Issue 3: Add guarantor fields that form collects but schema lacks

-- Make BVN optional
ALTER TABLE technician_verifications
ALTER COLUMN bvn DROP NOT NULL;

-- Make bank_code optional  
ALTER TABLE technician_verifications
ALTER COLUMN bank_code DROP NOT NULL;

-- Remove old format constraint on BVN (no longer required)
ALTER TABLE technician_verifications
DROP CONSTRAINT IF EXISTS valid_bvn_format;

-- Add updated constraint (BVN is now optional)
ALTER TABLE technician_verifications
ADD CONSTRAINT valid_bvn_format CHECK (bvn ~ '^\d{11}$' OR bvn IS NULL);

-- Add guarantor information columns
ALTER TABLE technician_verifications
ADD COLUMN IF NOT EXISTS guarantor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guarantor_phone VARCHAR(15),
ADD COLUMN IF NOT EXISTS guarantor_email VARCHAR(255);

-- Add constraint for guarantor phone format (optional field)
ALTER TABLE technician_verifications
ADD CONSTRAINT valid_guarantor_phone CHECK (
  guarantor_phone ~ '^\+234[0-9]{10}$' OR guarantor_phone IS NULL
);

-- Add constraint for guarantor email format (optional field)
ALTER TABLE technician_verifications
ADD CONSTRAINT valid_guarantor_email CHECK (
  guarantor_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' OR guarantor_email IS NULL
);

-- Add indexes for guarantor lookup
CREATE INDEX IF NOT EXISTS idx_technician_verifications_guarantor_phone 
  ON technician_verifications(guarantor_phone);
CREATE INDEX IF NOT EXISTS idx_technician_verifications_guarantor_name 
  ON technician_verifications(guarantor_name);
