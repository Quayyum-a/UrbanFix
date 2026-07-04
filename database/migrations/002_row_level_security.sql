-- UrbanFix Row Level Security Policies
-- This implements comprehensive RLS policies for data protection
-- Validates Requirements 28.3: Row Level Security enforcement

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Anyone can create user profile during registration" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all users" ON users
  FOR ALL USING (get_user_role() = 'admin');

-- CUSTOMER_PROFILES table policies
CREATE POLICY "Customers can manage their own profile" ON customer_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Technicians can view customer profiles for assigned jobs" ON customer_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE customer_id = customer_profiles.user_id 
      AND technician_id = auth.uid()
      AND status IN ('paid', 'pickup_scheduled', 'device_received', 'repair_started', 'awaiting_release')
    )
  );

CREATE POLICY "Admins can view all customer profiles" ON customer_profiles
  FOR ALL USING (get_user_role() = 'admin');

-- TECHNICIAN_PROFILES table policies
CREATE POLICY "Technicians can manage their own profile" ON technician_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Customers can view approved technician profiles" ON technician_profiles
  FOR SELECT USING (
    verification_status = 'approved' AND 
    get_user_role() = 'customer'
  );

CREATE POLICY "Admins can manage all technician profiles" ON technician_profiles
  FOR ALL USING (get_user_role() = 'admin');

-- PARTS_CATALOGUE table policies
CREATE POLICY "Anyone can view active parts" ON parts_catalogue
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage parts catalogue" ON parts_catalogue
  FOR ALL USING (get_user_role() = 'admin');

-- TECHNICIAN_PRICING table policies
CREATE POLICY "Technicians can manage their own pricing" ON technician_pricing
  FOR ALL USING (technician_id = auth.uid());

CREATE POLICY "Customers can view technician pricing" ON technician_pricing
  FOR SELECT USING (get_user_role() = 'customer');

CREATE POLICY "Admins can view all technician pricing" ON technician_pricing
  FOR SELECT USING (get_user_role() = 'admin');

-- JOBS table policies
CREATE POLICY "Customers can manage their own jobs" ON jobs
  FOR ALL USING (customer_id = auth.uid());

CREATE POLICY "Technicians can view and update assigned jobs" ON jobs
  FOR SELECT USING (technician_id = auth.uid());

CREATE POLICY "Technicians can update assigned jobs" ON jobs
  FOR UPDATE USING (technician_id = auth.uid())
  WITH CHECK (technician_id = auth.uid());

CREATE POLICY "Technicians can view available jobs for assignment" ON jobs
  FOR SELECT USING (
    status = 'paid' AND 
    technician_id IS NULL AND
    get_user_role() = 'technician' AND
    EXISTS (
      SELECT 1 FROM technician_profiles 
      WHERE user_id = auth.uid() 
      AND verification_status = 'approved'
      AND is_available = true
    )
  );

CREATE POLICY "Admins can manage all jobs" ON jobs
  FOR ALL USING (get_user_role() = 'admin');

-- PAYMENTS table policies
CREATE POLICY "Customers can view payments for their jobs" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = payments.job_id 
      AND jobs.customer_id = auth.uid()
    )
  );

CREATE POLICY "Technicians can view payments for assigned jobs" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = payments.job_id 
      AND jobs.technician_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payments" ON payments
  FOR ALL USING (get_user_role() = 'admin');

-- MESSAGES table policies
CREATE POLICY "Users can view messages for their jobs" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = messages.job_id 
      AND (jobs.customer_id = auth.uid() OR jobs.technician_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages for their jobs" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_id 
      AND (jobs.customer_id = auth.uid() OR jobs.technician_id = auth.uid())
    )
  );

CREATE POLICY "Users can update read status on their received messages" ON messages
  FOR UPDATE USING (
    sender_id != auth.uid() AND
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = messages.job_id 
      AND (jobs.customer_id = auth.uid() OR jobs.technician_id = auth.uid())
    )
  )
  WITH CHECK (
    -- Only allow updating read_at timestamp
    sender_id = OLD.sender_id AND
    job_id = OLD.job_id AND
    body = OLD.body AND
    attachment_url = OLD.attachment_url AND
    sent_at = OLD.sent_at
  );

CREATE POLICY "Admins can view all messages" ON messages
  FOR SELECT USING (get_user_role() = 'admin');

-- REVIEWS table policies
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT TO authenticated;

CREATE POLICY "Users can create reviews for completed jobs" ON reviews
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_id 
      AND jobs.status = 'complete'
      AND (jobs.customer_id = auth.uid() OR jobs.technician_id = auth.uid())
      AND reviewee_id IN (jobs.customer_id, jobs.technician_id)
      AND reviewee_id != auth.uid()
    )
  );

CREATE POLICY "Admins can manage all reviews" ON reviews
  FOR ALL USING (get_user_role() = 'admin');

-- Security functions for data access validation
CREATE OR REPLACE FUNCTION validate_job_participant(job_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM jobs 
    WHERE id = job_uuid 
    AND (customer_id = auth.uid() OR technician_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_technician_approved()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM technician_profiles 
    WHERE user_id = auth.uid() 
    AND verification_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit logging function for sensitive operations
CREATE OR REPLACE FUNCTION log_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive data (payments, personal info)
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit logs table for compliance tracking
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable audit logging on sensitive tables
CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

CREATE TRIGGER audit_technician_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON technician_profiles
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

-- RLS policy for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- Security views for safe data access
CREATE VIEW safe_technician_public_profiles AS
SELECT 
  tp.user_id,
  u.full_name,
  u.avatar_url,
  tp.shop_address,
  tp.verification_status,
  tp.is_available,
  technician_avg_rating(tp.user_id) as avg_rating,
  technician_job_count(tp.user_id) as completed_jobs
FROM technician_profiles tp
JOIN users u ON tp.user_id = u.id
WHERE tp.verification_status = 'approved';

-- Grant appropriate permissions
GRANT SELECT ON safe_technician_public_profiles TO authenticated;

-- Performance monitoring for RLS policies
CREATE OR REPLACE FUNCTION rls_performance_check()
RETURNS TABLE(
  table_name TEXT,
  policy_count BIGINT,
  avg_execution_time DOUBLE PRECISION
) AS $$
BEGIN
  -- This function can be used to monitor RLS policy performance
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename as table_name,
    COUNT(*) as policy_count,
    0.0 as avg_execution_time -- Placeholder for actual monitoring
  FROM pg_policies 
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;