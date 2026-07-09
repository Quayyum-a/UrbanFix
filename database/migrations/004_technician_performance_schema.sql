-- Technician Performance Tracking Schema
-- Requirements: 18.1, 18.2, 18.3, 18.4, 18.5

-- =====================================================
-- TECHNICIAN EARNINGS TABLE
-- Tracks all earnings from completed jobs for payout history
-- =====================================================

CREATE TABLE IF NOT EXISTS technician_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Earnings breakdown (in Naira)
  labor_amount INTEGER NOT NULL CHECK (labor_amount >= 0),
  parts_amount INTEGER NOT NULL DEFAULT 0 CHECK (parts_amount >= 0),
  platform_fee INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  net_earnings INTEGER NOT NULL CHECK (net_earnings >= 0), -- amount paid to technician
  
  -- Payment status
  paid_out BOOLEAN DEFAULT FALSE,
  payout_reference VARCHAR(100),
  paid_out_at TIMESTAMPTZ,
  
  -- Job completion context
  job_completed_at TIMESTAMPTZ NOT NULL,
  repair_category_id UUID REFERENCES repair_categories(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(job_id), -- One earning record per job
  CONSTRAINT net_earnings_calculation CHECK (
    net_earnings = labor_amount + parts_amount - platform_fee
  ),
  CONSTRAINT payout_consistency CHECK (
    (paid_out = FALSE AND payout_reference IS NULL AND paid_out_at IS NULL) OR
    (paid_out = TRUE AND payout_reference IS NOT NULL AND paid_out_at IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_technician_earnings_technician ON technician_earnings(technician_id);
CREATE INDEX idx_technician_earnings_completed ON technician_earnings(job_completed_at DESC);
CREATE INDEX idx_technician_earnings_payout_status ON technician_earnings(paid_out);
CREATE INDEX idx_technician_earnings_repair_category ON technician_earnings(repair_category_id);

-- Comments
COMMENT ON TABLE technician_earnings IS 'Tracks all earnings from completed jobs for technician payout history';
COMMENT ON COLUMN technician_earnings.net_earnings IS 'Final amount paid to technician after platform fee';
COMMENT ON COLUMN technician_earnings.platform_fee IS 'Platform commission deducted from gross earnings';

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE technician_earnings ENABLE ROW LEVEL SECURITY;

-- Technicians can view their own earnings
CREATE POLICY "Technicians can view own earnings"
  ON technician_earnings
  FOR SELECT
  USING (auth.uid() = technician_id);

-- Admins can view all earnings
CREATE POLICY "Admins can view all earnings"
  ON technician_earnings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert earnings (through Edge Functions)
CREATE POLICY "System can insert earnings"
  ON technician_earnings
  FOR INSERT
  WITH CHECK (TRUE); -- Will be restricted by Edge Function auth

-- System can update payout status
CREATE POLICY "System can update earnings"
  ON technician_earnings
  FOR UPDATE
  USING (TRUE); -- Will be restricted by Edge Function auth

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_earnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for technician_earnings
CREATE TRIGGER set_technician_earnings_updated_at
  BEFORE UPDATE ON technician_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_earnings_updated_at();

-- Function to automatically create earnings record when job completes
CREATE OR REPLACE FUNCTION create_earnings_on_job_complete()
RETURNS TRIGGER AS $$
DECLARE
  tech_labor_price INTEGER;
  tech_parts_price INTEGER;
  tech_platform_fee INTEGER;
  tech_net_amount INTEGER;
  repair_cat_id UUID;
BEGIN
  -- Only create earnings when job status changes to 'complete'
  IF NEW.status = 'complete' AND OLD.status != 'complete' THEN
    -- Get repair category ID if exists
    SELECT id INTO repair_cat_id
    FROM repair_categories
    WHERE category_name = NEW.repair_category
    LIMIT 1;
    
    -- Calculate amounts
    tech_labor_price := COALESCE(NEW.labour_price, 0);
    tech_parts_price := COALESCE(NEW.part_price, 0);
    tech_platform_fee := COALESCE(NEW.platform_fee, 0);
    tech_net_amount := COALESCE(NEW.payout_amount, tech_labor_price + tech_parts_price - tech_platform_fee);
    
    -- Insert earnings record
    INSERT INTO technician_earnings (
      technician_id,
      job_id,
      labor_amount,
      parts_amount,
      platform_fee,
      net_earnings,
      job_completed_at,
      repair_category_id
    ) VALUES (
      NEW.technician_id,
      NEW.id,
      tech_labor_price,
      tech_parts_price,
      tech_platform_fee,
      tech_net_amount,
      NEW.completed_at,
      repair_cat_id
    )
    ON CONFLICT (job_id) DO NOTHING; -- Prevent duplicates
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create earnings when job completes
CREATE TRIGGER create_earnings_on_job_complete_trigger
  AFTER UPDATE ON jobs
  FOR EACH ROW
  WHEN (NEW.status = 'complete')
  EXECUTE FUNCTION create_earnings_on_job_complete();

-- =====================================================
-- HELPER FUNCTIONS FOR PERFORMANCE METRICS
-- =====================================================

-- Function to get technician total earnings
CREATE OR REPLACE FUNCTION get_technician_total_earnings(technician_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT SUM(net_earnings)
      FROM technician_earnings
      WHERE technician_id = technician_user_id
    ),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get technician pending payouts
CREATE OR REPLACE FUNCTION get_technician_pending_payouts(technician_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT SUM(net_earnings)
      FROM technician_earnings
      WHERE technician_id = technician_user_id
        AND paid_out = FALSE
    ),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get technician average job completion time
CREATE OR REPLACE FUNCTION get_technician_avg_completion_time(technician_user_id UUID)
RETURNS INTERVAL AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT AVG(completed_at - created_at)
      FROM jobs
      WHERE technician_id = technician_user_id
        AND status = 'complete'
        AND completed_at IS NOT NULL
    ),
    INTERVAL '0 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get technician performance summary
CREATE OR REPLACE FUNCTION get_technician_performance(technician_user_id UUID)
RETURNS TABLE (
  total_earnings INTEGER,
  pending_payouts INTEGER,
  total_jobs INTEGER,
  completed_jobs INTEGER,
  average_rating DECIMAL,
  avg_completion_time_hours INTEGER,
  total_reviews INTEGER,
  this_month_earnings INTEGER,
  this_month_jobs INTEGER
) AS $$
DECLARE
  avg_time INTERVAL;
BEGIN
  -- Get average completion time
  SELECT get_technician_avg_completion_time(technician_user_id) INTO avg_time;
  
  RETURN QUERY
  SELECT 
    -- Total earnings
    COALESCE(
      (SELECT SUM(net_earnings) FROM technician_earnings WHERE technician_id = technician_user_id),
      0
    )::INTEGER,
    
    -- Pending payouts
    COALESCE(
      (SELECT SUM(net_earnings) FROM technician_earnings WHERE technician_id = technician_user_id AND paid_out = FALSE),
      0
    )::INTEGER,
    
    -- Total jobs (all statuses)
    COALESCE(
      (SELECT COUNT(*) FROM jobs WHERE technician_id = technician_user_id),
      0
    )::INTEGER,
    
    -- Completed jobs
    COALESCE(
      (SELECT COUNT(*) FROM jobs WHERE technician_id = technician_user_id AND status = 'complete'),
      0
    )::INTEGER,
    
    -- Average rating
    COALESCE(
      (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE reviewee_id = technician_user_id),
      0.0
    )::DECIMAL,
    
    -- Average completion time in hours
    EXTRACT(EPOCH FROM avg_time)::INTEGER / 3600,
    
    -- Total reviews
    COALESCE(
      (SELECT COUNT(*) FROM reviews WHERE reviewee_id = technician_user_id),
      0
    )::INTEGER,
    
    -- This month earnings
    COALESCE(
      (
        SELECT SUM(net_earnings) 
        FROM technician_earnings 
        WHERE technician_id = technician_user_id
          AND job_completed_at >= DATE_TRUNC('month', CURRENT_DATE)
      ),
      0
    )::INTEGER,
    
    -- This month jobs
    COALESCE(
      (
        SELECT COUNT(*) 
        FROM jobs 
        WHERE technician_id = technician_user_id
          AND status = 'complete'
          AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)
      ),
      0
    )::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get technician earnings history with pagination
CREATE OR REPLACE FUNCTION get_technician_earnings_history(
  technician_user_id UUID,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  job_id UUID,
  labor_amount INTEGER,
  parts_amount INTEGER,
  platform_fee INTEGER,
  net_earnings INTEGER,
  paid_out BOOLEAN,
  payout_reference VARCHAR,
  paid_out_at TIMESTAMPTZ,
  job_completed_at TIMESTAMPTZ,
  repair_category_name VARCHAR,
  device_brand VARCHAR,
  device_model VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    te.id,
    te.job_id,
    te.labor_amount,
    te.parts_amount,
    te.platform_fee,
    te.net_earnings,
    te.paid_out,
    te.payout_reference,
    te.paid_out_at,
    te.job_completed_at,
    rc.display_name,
    j.device_brand,
    j.device_model
  FROM technician_earnings te
  INNER JOIN jobs j ON te.job_id = j.id
  LEFT JOIN repair_categories rc ON te.repair_category_id = rc.id
  WHERE te.technician_id = technician_user_id
  ORDER BY te.job_completed_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get technician recent reviews
CREATE OR REPLACE FUNCTION get_technician_recent_reviews(
  technician_user_id UUID,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  job_id UUID,
  reviewer_name VARCHAR,
  rating INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ,
  device_brand VARCHAR,
  repair_category VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.job_id,
    u.full_name,
    r.rating,
    r.comment,
    r.created_at,
    j.device_brand,
    j.repair_category
  FROM reviews r
  INNER JOIN users u ON r.reviewer_id = u.id
  INNER JOIN jobs j ON r.job_id = j.id
  WHERE r.reviewee_id = technician_user_id
  ORDER BY r.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- View: Technician earnings by category
CREATE OR REPLACE VIEW technician_earnings_by_category AS
SELECT 
  te.technician_id,
  u.full_name as technician_name,
  rc.display_name as category_name,
  COUNT(te.id) as jobs_count,
  SUM(te.net_earnings) as total_earnings,
  AVG(te.net_earnings)::INTEGER as avg_earnings_per_job,
  SUM(CASE WHEN te.paid_out = TRUE THEN te.net_earnings ELSE 0 END) as paid_earnings,
  SUM(CASE WHEN te.paid_out = FALSE THEN te.net_earnings ELSE 0 END) as pending_earnings
FROM technician_earnings te
INNER JOIN users u ON te.technician_id = u.id
LEFT JOIN repair_categories rc ON te.repair_category_id = rc.id
GROUP BY te.technician_id, u.full_name, rc.display_name
ORDER BY total_earnings DESC;

COMMENT ON VIEW technician_earnings_by_category IS 'Breakdown of technician earnings by repair category';

-- View: Technician performance leaderboard
CREATE OR REPLACE VIEW technician_performance_leaderboard AS
SELECT 
  u.id as technician_id,
  u.full_name as technician_name,
  COUNT(DISTINCT te.id) as total_jobs,
  SUM(te.net_earnings) as total_earnings,
  AVG(r.rating)::DECIMAL(3,2) as average_rating,
  COUNT(DISTINCT r.id) as review_count,
  RANK() OVER (ORDER BY COUNT(DISTINCT te.id) DESC) as jobs_rank,
  RANK() OVER (ORDER BY SUM(te.net_earnings) DESC) as earnings_rank,
  RANK() OVER (ORDER BY AVG(r.rating) DESC, COUNT(DISTINCT r.id) DESC) as rating_rank
FROM users u
INNER JOIN technician_earnings te ON u.id = te.technician_id
LEFT JOIN reviews r ON u.id = r.reviewee_id
WHERE u.role = 'technician'
GROUP BY u.id, u.full_name
ORDER BY total_jobs DESC;

COMMENT ON VIEW technician_performance_leaderboard IS 'Leaderboard showing top technicians by jobs, earnings, and ratings';

-- Grant permissions
GRANT SELECT ON technician_earnings TO authenticated;
GRANT SELECT ON technician_earnings_by_category TO authenticated;
GRANT SELECT ON technician_performance_leaderboard TO authenticated;
