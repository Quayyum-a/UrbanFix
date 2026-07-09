-- Technician Pricing Management Schema
-- Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

-- =====================================================
-- REPAIR CATEGORIES TABLE
-- Defines standard repair types offered on the platform
-- =====================================================

CREATE TABLE IF NOT EXISTS repair_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Category Information
  category_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Device Type Applicability
  device_types TEXT[] NOT NULL DEFAULT ARRAY['smartphone', 'laptop', 'tablet', 'desktop'],
  -- device_types: which device types this repair applies to
  
  -- Platform Defaults
  suggested_min_price INTEGER NOT NULL, -- in Naira
  suggested_max_price INTEGER NOT NULL, -- in Naira
  estimated_duration_hours INTEGER, -- estimated repair time
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_price_range CHECK (suggested_max_price >= suggested_min_price),
  CONSTRAINT positive_prices CHECK (suggested_min_price > 0 AND suggested_max_price > 0)
);

-- Indexes
CREATE INDEX idx_repair_categories_active ON repair_categories(is_active);
CREATE INDEX idx_repair_categories_display_order ON repair_categories(display_order);

-- Comments
COMMENT ON TABLE repair_categories IS 'Standard repair categories offered on the platform';
COMMENT ON COLUMN repair_categories.device_types IS 'Array of device types this repair applies to';
COMMENT ON COLUMN repair_categories.suggested_min_price IS 'Platform suggested minimum labor price in Naira';
COMMENT ON COLUMN repair_categories.suggested_max_price IS 'Platform suggested maximum labor price in Naira';

-- =====================================================
-- TECHNICIAN PRICING TABLE
-- Stores individual technician labor prices per repair category
-- =====================================================

CREATE TABLE IF NOT EXISTS technician_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repair_category_id UUID NOT NULL REFERENCES repair_categories(id) ON DELETE CASCADE,
  
  -- Pricing
  labor_price INTEGER NOT NULL, -- in Naira, excludes parts cost
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  
  -- Performance Metrics (for sorting/recommendations)
  jobs_completed INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_labor_price CHECK (labor_price > 0),
  CONSTRAINT valid_rating CHECK (average_rating >= 0 AND average_rating <= 5),
  CONSTRAINT one_price_per_category UNIQUE(technician_id, repair_category_id)
);

-- Indexes
CREATE INDEX idx_technician_pricing_technician ON technician_pricing(technician_id);
CREATE INDEX idx_technician_pricing_category ON technician_pricing(repair_category_id);
CREATE INDEX idx_technician_pricing_available ON technician_pricing(is_available);
CREATE INDEX idx_technician_pricing_rating ON technician_pricing(average_rating DESC);

-- Comments
COMMENT ON TABLE technician_pricing IS 'Individual technician labor prices for each repair category';
COMMENT ON COLUMN technician_pricing.labor_price IS 'Technician labor charge in Naira (parts cost added separately)';
COMMENT ON COLUMN technician_pricing.jobs_completed IS 'Number of completed jobs for this category';
COMMENT ON COLUMN technician_pricing.average_rating IS 'Average customer rating for this category (0-5)';

-- =====================================================
-- SEED COMMON REPAIR CATEGORIES
-- =====================================================

INSERT INTO repair_categories (
  category_name, 
  display_name, 
  description, 
  device_types, 
  suggested_min_price, 
  suggested_max_price,
  estimated_duration_hours,
  display_order
) VALUES 
  (
    'screen_replacement',
    'Screen Replacement',
    'Replace cracked or damaged screen/display',
    ARRAY['smartphone', 'laptop', 'tablet'],
    5000,
    25000,
    2,
    1
  ),
  (
    'battery_replacement',
    'Battery Replacement',
    'Replace worn out or swollen battery',
    ARRAY['smartphone', 'laptop', 'tablet'],
    3000,
    15000,
    1,
    2
  ),
  (
    'charging_port_repair',
    'Charging Port Repair',
    'Fix or replace faulty charging port',
    ARRAY['smartphone', 'tablet'],
    2000,
    8000,
    1,
    3
  ),
  (
    'water_damage_repair',
    'Water Damage Repair',
    'Clean and repair water damaged device',
    ARRAY['smartphone', 'laptop', 'tablet'],
    5000,
    30000,
    4,
    4
  ),
  (
    'camera_repair',
    'Camera Repair/Replacement',
    'Fix or replace front/back camera',
    ARRAY['smartphone', 'tablet'],
    3000,
    12000,
    1,
    5
  ),
  (
    'speaker_repair',
    'Speaker Repair/Replacement',
    'Fix audio issues or replace speakers',
    ARRAY['smartphone', 'laptop', 'tablet'],
    2000,
    10000,
    1,
    6
  ),
  (
    'microphone_repair',
    'Microphone Repair',
    'Fix microphone or call audio issues',
    ARRAY['smartphone'],
    2000,
    8000,
    1,
    7
  ),
  (
    'button_repair',
    'Button Repair/Replacement',
    'Fix power, volume, or home button issues',
    ARRAY['smartphone', 'tablet'],
    2000,
    7000,
    1,
    8
  ),
  (
    'motherboard_repair',
    'Motherboard Repair',
    'Diagnose and repair motherboard issues',
    ARRAY['smartphone', 'laptop', 'desktop'],
    10000,
    50000,
    6,
    9
  ),
  (
    'software_issues',
    'Software Issues',
    'Fix software bugs, OS installation, virus removal',
    ARRAY['smartphone', 'laptop', 'tablet', 'desktop'],
    1500,
    10000,
    2,
    10
  ),
  (
    'data_recovery',
    'Data Recovery',
    'Recover lost or deleted data',
    ARRAY['smartphone', 'laptop', 'desktop'],
    5000,
    30000,
    3,
    11
  ),
  (
    'keyboard_replacement',
    'Keyboard Replacement',
    'Replace faulty laptop keyboard',
    ARRAY['laptop'],
    5000,
    15000,
    2,
    12
  ),
  (
    'touchpad_repair',
    'Touchpad Repair',
    'Fix or replace laptop touchpad',
    ARRAY['laptop'],
    3000,
    10000,
    1,
    13
  ),
  (
    'hinge_repair',
    'Hinge Repair',
    'Fix or replace broken laptop hinges',
    ARRAY['laptop'],
    5000,
    15000,
    2,
    14
  ),
  (
    'hard_drive_upgrade',
    'Hard Drive/SSD Upgrade',
    'Upgrade storage or replace faulty drive',
    ARRAY['laptop', 'desktop'],
    3000,
    10000,
    1,
    15
  ),
  (
    'ram_upgrade',
    'RAM Upgrade',
    'Upgrade system memory',
    ARRAY['laptop', 'desktop'],
    2000,
    8000,
    1,
    16
  ),
  (
    'back_glass_replacement',
    'Back Glass Replacement',
    'Replace cracked back glass/cover',
    ARRAY['smartphone'],
    3000,
    12000,
    1,
    17
  ),
  (
    'wifi_bluetooth_repair',
    'WiFi/Bluetooth Repair',
    'Fix connectivity issues',
    ARRAY['smartphone', 'laptop', 'tablet'],
    3000,
    12000,
    2,
    18
  ),
  (
    'face_id_repair',
    'Face ID/Touch ID Repair',
    'Fix biometric authentication issues',
    ARRAY['smartphone', 'tablet'],
    5000,
    20000,
    2,
    19
  ),
  (
    'general_diagnostic',
    'General Diagnostic',
    'Comprehensive device diagnosis',
    ARRAY['smartphone', 'laptop', 'tablet', 'desktop'],
    1000,
    5000,
    1,
    20
  )
ON CONFLICT (category_name) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE repair_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_pricing ENABLE ROW LEVEL SECURITY;

-- Anyone can view active repair categories
CREATE POLICY "Anyone can view active repair categories"
  ON repair_categories
  FOR SELECT
  USING (is_active = true);

-- Admins can manage repair categories
CREATE POLICY "Admins can manage repair categories"
  ON repair_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Technicians can view their own pricing
CREATE POLICY "Technicians can view own pricing"
  ON technician_pricing
  FOR SELECT
  USING (auth.uid() = technician_id);

-- Technicians can insert their own pricing
CREATE POLICY "Technicians can insert own pricing"
  ON technician_pricing
  FOR INSERT
  WITH CHECK (auth.uid() = technician_id);

-- Technicians can update their own pricing
CREATE POLICY "Technicians can update own pricing"
  ON technician_pricing
  FOR UPDATE
  USING (auth.uid() = technician_id)
  WITH CHECK (auth.uid() = technician_id);

-- Customers and admins can view all technician pricing
CREATE POLICY "Customers can view all technician pricing"
  ON technician_pricing
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('customer', 'admin')
    )
  );

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for repair_categories
CREATE TRIGGER set_repair_categories_updated_at
  BEFORE UPDATE ON repair_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_updated_at();

-- Trigger for technician_pricing
CREATE TRIGGER set_technician_pricing_updated_at
  BEFORE UPDATE ON technician_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get technician pricing for all categories
CREATE OR REPLACE FUNCTION get_technician_pricing(technician_user_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_name VARCHAR,
  display_name VARCHAR,
  description TEXT,
  device_types TEXT[],
  suggested_min_price INTEGER,
  suggested_max_price INTEGER,
  technician_price INTEGER,
  is_available BOOLEAN,
  jobs_completed INTEGER,
  average_rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.id,
    rc.category_name,
    rc.display_name,
    rc.description,
    rc.device_types,
    rc.suggested_min_price,
    rc.suggested_max_price,
    tp.labor_price,
    COALESCE(tp.is_available, false),
    COALESCE(tp.jobs_completed, 0),
    COALESCE(tp.average_rating, 0.00)
  FROM repair_categories rc
  LEFT JOIN technician_pricing tp 
    ON rc.id = tp.repair_category_id 
    AND tp.technician_id = technician_user_id
  WHERE rc.is_active = true
  ORDER BY rc.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find available technicians for a repair category
CREATE OR REPLACE FUNCTION find_technicians_for_category(
  category_id UUID,
  min_rating DECIMAL DEFAULT 0.0,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  technician_id UUID,
  technician_name VARCHAR,
  labor_price INTEGER,
  jobs_completed INTEGER,
  average_rating DECIMAL,
  phone VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.technician_id,
    u.full_name,
    tp.labor_price,
    tp.jobs_completed,
    tp.average_rating,
    u.phone
  FROM technician_pricing tp
  INNER JOIN users u ON tp.technician_id = u.id
  INNER JOIN technician_verifications tv ON u.id = tv.user_id
  WHERE 
    tp.repair_category_id = category_id
    AND tp.is_available = true
    AND tp.average_rating >= min_rating
    AND tv.status = 'approved'
    AND u.role = 'technician'
  ORDER BY 
    tp.average_rating DESC,
    tp.jobs_completed DESC,
    tp.labor_price ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update technician pricing statistics (called after job completion)
CREATE OR REPLACE FUNCTION update_technician_pricing_stats(
  technician_user_id UUID,
  category_id UUID,
  new_rating DECIMAL
)
RETURNS VOID AS $$
DECLARE
  current_jobs INTEGER;
  current_rating DECIMAL;
  new_avg_rating DECIMAL;
BEGIN
  -- Get current stats
  SELECT jobs_completed, average_rating 
  INTO current_jobs, current_rating
  FROM technician_pricing
  WHERE technician_id = technician_user_id 
    AND repair_category_id = category_id;
  
  -- Calculate new average
  IF current_jobs = 0 THEN
    new_avg_rating := new_rating;
  ELSE
    new_avg_rating := ((current_rating * current_jobs) + new_rating) / (current_jobs + 1);
  END IF;
  
  -- Update stats
  UPDATE technician_pricing
  SET 
    jobs_completed = jobs_completed + 1,
    average_rating = new_avg_rating,
    updated_at = NOW()
  WHERE technician_id = technician_user_id 
    AND repair_category_id = category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- View: Most popular repair categories
CREATE OR REPLACE VIEW popular_repair_categories AS
SELECT 
  rc.id,
  rc.display_name,
  COUNT(tp.id) as technician_count,
  AVG(tp.labor_price)::INTEGER as average_price,
  SUM(tp.jobs_completed) as total_jobs_completed
FROM repair_categories rc
LEFT JOIN technician_pricing tp ON rc.id = tp.repair_category_id
WHERE rc.is_active = true
GROUP BY rc.id, rc.display_name
ORDER BY total_jobs_completed DESC;

COMMENT ON VIEW popular_repair_categories IS 'Analytics view of repair category popularity';

-- View: Top rated technicians per category
CREATE OR REPLACE VIEW top_technicians_by_category AS
SELECT 
  rc.display_name as category_name,
  u.full_name as technician_name,
  tp.labor_price,
  tp.average_rating,
  tp.jobs_completed,
  ROW_NUMBER() OVER (
    PARTITION BY rc.id 
    ORDER BY tp.average_rating DESC, tp.jobs_completed DESC
  ) as rank
FROM technician_pricing tp
INNER JOIN users u ON tp.technician_id = u.id
INNER JOIN repair_categories rc ON tp.repair_category_id = rc.id
WHERE tp.is_available = true AND tp.jobs_completed > 0
ORDER BY rc.display_name, rank;

COMMENT ON VIEW top_technicians_by_category IS 'Top rated technicians for each repair category';

-- Grant permissions
GRANT SELECT ON repair_categories TO authenticated;
GRANT SELECT ON technician_pricing TO authenticated;
GRANT SELECT ON popular_repair_categories TO authenticated;
GRANT SELECT ON top_technicians_by_category TO authenticated;
