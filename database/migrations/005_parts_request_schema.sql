-- Parts Request System Schema
-- Requirements: 25.1, 25.2, 25.3, 25.4, 25.5
-- Allows technicians to request parts not in the catalogue

-- =====================================================
-- PARTS_REQUESTS TABLE
-- Stores technician requests for unlisted parts
-- =====================================================

CREATE TABLE IF NOT EXISTS parts_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Requester Information
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Part Information
  device_brand VARCHAR(100) NOT NULL,
  device_model VARCHAR(200) NOT NULL,
  repair_category VARCHAR(100) NOT NULL,
  part_name VARCHAR(255) NOT NULL,
  part_description TEXT NOT NULL,
  estimated_price INTEGER NOT NULL, -- in kobo (Naira subunit)
  
  -- Request Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Admin Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Added Part Reference
  added_part_id UUID REFERENCES parts_catalogue(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_estimated_price CHECK (estimated_price > 0),
  CONSTRAINT valid_description CHECK (LENGTH(part_description) >= 10),
  CONSTRAINT rejection_reason_when_rejected CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL) OR 
    (status != 'rejected')
  ),
  CONSTRAINT reviewed_fields_when_reviewed CHECK (
    (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL) OR 
    (status = 'pending')
  )
);

-- Indexes
CREATE INDEX idx_parts_requests_technician ON parts_requests(technician_id);
CREATE INDEX idx_parts_requests_status ON parts_requests(status);
CREATE INDEX idx_parts_requests_created ON parts_requests(created_at DESC);
CREATE INDEX idx_parts_requests_device ON parts_requests(device_brand, device_model, repair_category);

-- Comments
COMMENT ON TABLE parts_requests IS 'Technician requests for parts not in the standard catalogue';
COMMENT ON COLUMN parts_requests.estimated_price IS 'Technician estimated price in kobo (Nigerian currency subunit)';
COMMENT ON COLUMN parts_requests.status IS 'Request status: pending (awaiting admin review), approved (added to catalogue), rejected';
COMMENT ON COLUMN parts_requests.rejection_reason IS 'Admin explanation when request is rejected';
COMMENT ON COLUMN parts_requests.added_part_id IS 'Reference to catalogue part if request was approved and added';

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE parts_requests ENABLE ROW LEVEL SECURITY;

-- Technicians can view their own requests
CREATE POLICY "Technicians can view own requests"
  ON parts_requests
  FOR SELECT
  USING (auth.uid() = technician_id);

-- Technicians can create their own requests
CREATE POLICY "Technicians can create requests"
  ON parts_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = technician_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'technician'
    )
  );

-- Technicians can update their own pending requests (before review)
CREATE POLICY "Technicians can update own pending requests"
  ON parts_requests
  FOR UPDATE
  USING (auth.uid() = technician_id AND status = 'pending')
  WITH CHECK (auth.uid() = technician_id AND status = 'pending');

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
  ON parts_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update requests (for review)
CREATE POLICY "Admins can update requests"
  ON parts_requests
  FOR UPDATE
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

-- Admins can delete requests
CREATE POLICY "Admins can delete requests"
  ON parts_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_parts_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for parts_requests
CREATE TRIGGER set_parts_requests_updated_at
  BEFORE UPDATE ON parts_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_parts_requests_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to approve a part request and add to catalogue
CREATE OR REPLACE FUNCTION approve_part_request(
  request_id UUID,
  admin_user_id UUID,
  final_price INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  part_id UUID,
  error_message TEXT
) AS $$
DECLARE
  request_data RECORD;
  new_part_id UUID;
BEGIN
  -- Get request details
  SELECT * INTO request_data
  FROM parts_requests
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Request not found or already reviewed';
    RETURN;
  END IF;
  
  -- Check if part already exists
  SELECT id INTO new_part_id
  FROM parts_catalogue
  WHERE 
    device_brand = request_data.device_brand AND
    device_model = request_data.device_model AND
    repair_category = request_data.repair_category AND
    part_name = request_data.part_name AND
    is_active = true;
  
  IF new_part_id IS NOT NULL THEN
    -- Part already exists, just link it
    UPDATE parts_requests
    SET 
      status = 'approved',
      reviewed_by = admin_user_id,
      reviewed_at = NOW(),
      added_part_id = new_part_id
    WHERE id = request_id;
    
    RETURN QUERY SELECT true, new_part_id, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Add new part to catalogue
  INSERT INTO parts_catalogue (
    device_brand,
    device_model,
    repair_category,
    part_name,
    part_price,
    is_active
  ) VALUES (
    request_data.device_brand,
    request_data.device_model,
    request_data.repair_category,
    request_data.part_name,
    final_price,
    true
  )
  RETURNING id INTO new_part_id;
  
  -- Update request status
  UPDATE parts_requests
  SET 
    status = 'approved',
    reviewed_by = admin_user_id,
    reviewed_at = NOW(),
    added_part_id = new_part_id
  WHERE id = request_id;
  
  RETURN QUERY SELECT true, new_part_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a part request
CREATE OR REPLACE FUNCTION reject_part_request(
  request_id UUID,
  admin_user_id UUID,
  reason TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) AS $$
BEGIN
  -- Update request status
  UPDATE parts_requests
  SET 
    status = 'rejected',
    reviewed_by = admin_user_id,
    reviewed_at = NOW(),
    rejection_reason = reason
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Request not found or already reviewed';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get parts requests with technician details
CREATE OR REPLACE FUNCTION get_parts_requests_with_details(
  filter_status VARCHAR DEFAULT NULL,
  filter_technician_id UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  technician_id UUID,
  technician_name VARCHAR,
  technician_phone VARCHAR,
  device_brand VARCHAR,
  device_model VARCHAR,
  repair_category VARCHAR,
  part_name VARCHAR,
  part_description TEXT,
  estimated_price INTEGER,
  status VARCHAR,
  reviewed_by UUID,
  reviewer_name VARCHAR,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  added_part_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.technician_id,
    u.full_name AS technician_name,
    u.phone AS technician_phone,
    pr.device_brand,
    pr.device_model,
    pr.repair_category,
    pr.part_name,
    pr.part_description,
    pr.estimated_price,
    pr.status,
    pr.reviewed_by,
    reviewer.full_name AS reviewer_name,
    pr.reviewed_at,
    pr.rejection_reason,
    pr.added_part_id,
    pr.created_at
  FROM parts_requests pr
  INNER JOIN users u ON pr.technician_id = u.id
  LEFT JOIN users reviewer ON pr.reviewed_by = reviewer.id
  WHERE 
    (filter_status IS NULL OR pr.status = filter_status) AND
    (filter_technician_id IS NULL OR pr.technician_id = filter_technician_id)
  ORDER BY 
    CASE 
      WHEN pr.status = 'pending' THEN 0
      ELSE 1
    END,
    pr.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- View: Parts request statistics
CREATE OR REPLACE VIEW parts_request_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
  COUNT(DISTINCT technician_id) as unique_technicians,
  COUNT(DISTINCT device_brand) as unique_brands,
  COUNT(DISTINCT repair_category) as unique_categories
FROM parts_requests;

COMMENT ON VIEW parts_request_stats IS 'Summary statistics for parts requests';

-- View: Most requested parts
CREATE OR REPLACE VIEW most_requested_parts AS
SELECT 
  device_brand,
  device_model,
  repair_category,
  part_name,
  COUNT(*) as request_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count
FROM parts_requests
GROUP BY device_brand, device_model, repair_category, part_name
HAVING COUNT(*) > 1
ORDER BY request_count DESC;

COMMENT ON VIEW most_requested_parts IS 'Parts with multiple requests (indicates high demand)';

-- Grant permissions
GRANT SELECT ON parts_requests TO authenticated;
GRANT SELECT ON parts_request_stats TO authenticated;
GRANT SELECT ON most_requested_parts TO authenticated;

-- =====================================================
-- NOTIFICATION SYSTEM
-- =====================================================

-- Create a simple in-app notifications table for part requests
CREATE TABLE IF NOT EXISTS part_request_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES parts_requests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('approved', 'rejected')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_part_request_notifications_user ON part_request_notifications(user_id, read, created_at DESC);
CREATE INDEX idx_part_request_notifications_request ON part_request_notifications(request_id);

-- Enable RLS
ALTER TABLE part_request_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON part_request_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON part_request_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins and system can insert notifications
CREATE POLICY "System can insert notifications"
  ON part_request_notifications
  FOR INSERT
  WITH CHECK (true);

-- Function to create notification when part request is reviewed
CREATE OR REPLACE FUNCTION notify_part_request_reviewed()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Only trigger when status changes from pending to approved/rejected
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    
    IF NEW.status = 'approved' THEN
      notification_title := 'Part Request Approved ✓';
      notification_body := 'Your request for "' || NEW.part_name || '" has been approved and added to the catalogue.';
    ELSE
      notification_title := 'Part Request Update';
      notification_body := 'Your request for "' || NEW.part_name || '" has been reviewed. See details for more information.';
    END IF;
    
    -- Insert notification
    INSERT INTO part_request_notifications (
      user_id,
      request_id,
      title,
      body,
      type
    ) VALUES (
      NEW.technician_id,
      NEW.id,
      notification_title,
      notification_body,
      NEW.status
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to send notification when request is reviewed
CREATE TRIGGER part_request_reviewed_notification
  AFTER UPDATE ON parts_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_part_request_reviewed();

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_part_request_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM part_request_notifications
    WHERE user_id = user_uuid AND read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_part_request_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE part_request_notifications
  SET read = TRUE
  WHERE id = notification_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_part_request_notifications_read(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE part_request_notifications
  SET read = TRUE
  WHERE user_id = user_uuid AND read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE part_request_notifications IS 'In-app notifications for part request status updates';
COMMENT ON FUNCTION notify_part_request_reviewed() IS 'Automatically creates notification when part request is approved or rejected';
COMMENT ON FUNCTION get_unread_part_request_notification_count(UUID) IS 'Gets count of unread notifications for a user';

-- Grant permissions
GRANT SELECT ON part_request_notifications TO authenticated;
GRANT UPDATE ON part_request_notifications TO authenticated;
