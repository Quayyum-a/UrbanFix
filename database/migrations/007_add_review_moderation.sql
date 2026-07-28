-- Add moderation and response fields to reviews table
-- Added fields for hiding, flagging, tracking moderation actions, and developer responses

-- Add moderation fields to reviews table
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS moderation_note TEXT;

-- Add response fields to reviews table
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS response TEXT,
ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Update RLS Policies for reviews table

-- Admins can view all reviews (including hidden ones for moderation)
CREATE POLICY "Admins can view all reviews" ON reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can moderate reviews (update moderation fields)
CREATE POLICY "Admins can moderate reviews" ON reviews
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can respond to reviews (update response fields)
CREATE POLICY "Admins can respond to reviews" ON reviews
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Regular users can only see non-hidden reviews
CREATE POLICY "Users can see non-hidden reviews" ON reviews
  FOR SELECT
  TO authenticated
  USING (
    NOT is_hidden OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );