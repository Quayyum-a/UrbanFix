-- Technician Verification Schema
-- Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8

-- =====================================================
-- TECHNICIAN VERIFICATIONS TABLE
-- Stores technician verification data including NIN and bank details
-- =====================================================

CREATE TABLE IF NOT EXISTS technician_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Identity Information
  nin VARCHAR(11) NOT NULL,
  nin_verified BOOLEAN DEFAULT FALSE,
  
  -- Bank Account Details
  bvn VARCHAR(11) NOT NULL,
  account_number VARCHAR(10) NOT NULL,
  bank_code VARCHAR(10) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_name VARCHAR(255),
  
  -- Verification Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Status values: pending, approved, rejected
  
  -- Admin Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_nin_format CHECK (nin ~ '^\d{11}$'),
  CONSTRAINT valid_bvn_format CHECK (bvn ~ '^\d{11}$'),
  CONSTRAINT valid_account_number CHECK (account_number ~ '^\d{10}$'),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT one_verification_per_user UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX idx_technician_verifications_user_id ON technician_verifications(user_id);
CREATE INDEX idx_technician_verifications_status ON technician_verifications(status);
CREATE INDEX idx_technician_verifications_submitted_at ON technician_verifications(submitted_at);

-- Comments
COMMENT ON TABLE technician_verifications IS 'Stores technician identity and bank verification data';
COMMENT ON COLUMN technician_verifications.nin IS 'National Identification Number (11 digits)';
COMMENT ON COLUMN technician_verifications.bvn IS 'Bank Verification Number (11 digits)';
COMMENT ON COLUMN technician_verifications.account_number IS 'NUBAN account number (10 digits)';
COMMENT ON COLUMN technician_verifications.status IS 'Verification status: pending, approved, rejected';

-- =====================================================
-- VERIFICATION DOCUMENTS TABLE
-- Stores uploaded document references for verification
-- =====================================================

CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES technician_verifications(id) ON DELETE CASCADE,
  
  -- Document Details
  document_type VARCHAR(50) NOT NULL,
  -- Types: id_card, address_proof
  
  -- Storage Information
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- Metadata
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_document_type CHECK (document_type IN ('id_card', 'address_proof'))
);

-- Indexes
CREATE INDEX idx_verification_documents_verification_id ON verification_documents(verification_id);
CREATE INDEX idx_verification_documents_document_type ON verification_documents(document_type);

-- Comments
COMMENT ON TABLE verification_documents IS 'Stores uploaded verification documents';
COMMENT ON COLUMN verification_documents.document_type IS 'Type of document: id_card or address_proof';
COMMENT ON COLUMN verification_documents.file_url IS 'Public URL to access the document';
COMMENT ON COLUMN verification_documents.file_path IS 'Storage path in Supabase bucket';

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE technician_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- Technicians can view their own verification
CREATE POLICY "Technicians can view own verification"
  ON technician_verifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Technicians can insert their own verification (only if not exists)
CREATE POLICY "Technicians can submit verification"
  ON technician_verifications
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND NOT EXISTS (
      SELECT 1 FROM technician_verifications 
      WHERE user_id = auth.uid()
    )
  );

-- Technicians can update their own pending verification
CREATE POLICY "Technicians can update pending verification"
  ON technician_verifications
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
  ON technician_verifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update verification status
CREATE POLICY "Admins can update verification status"
  ON technician_verifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Technicians can view their own documents
CREATE POLICY "Technicians can view own documents"
  ON verification_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM technician_verifications 
      WHERE id = verification_documents.verification_id 
      AND user_id = auth.uid()
    )
  );

-- Technicians can insert documents for their verification
CREATE POLICY "Technicians can upload documents"
  ON verification_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM technician_verifications 
      WHERE id = verification_documents.verification_id 
      AND user_id = auth.uid()
      AND status = 'pending'
    )
  );

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
  ON verification_documents
  FOR SELECT
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
CREATE OR REPLACE FUNCTION update_technician_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on technician_verifications
CREATE TRIGGER set_technician_verification_updated_at
  BEFORE UPDATE ON technician_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_technician_verification_updated_at();

-- Function to update technician profile status when approved
CREATE OR REPLACE FUNCTION update_technician_status_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When verification is approved, update technician_profiles
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE technician_profiles
    SET 
      verification_status = 'verified',
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Set reviewed timestamp
    NEW.reviewed_at = NOW();
    NEW.reviewed_by = auth.uid();
  END IF;
  
  -- When verification is rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    UPDATE technician_profiles
    SET 
      verification_status = 'rejected',
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Set reviewed timestamp
    NEW.reviewed_at = NOW();
    NEW.reviewed_by = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update technician status
CREATE TRIGGER update_technician_on_verification_status_change
  BEFORE UPDATE ON technician_verifications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_technician_status_on_approval();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get verification status for a technician
CREATE OR REPLACE FUNCTION get_technician_verification_status(technician_user_id UUID)
RETURNS TABLE (
  verification_id UUID,
  status VARCHAR(20),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tv.id,
    tv.status,
    tv.submitted_at,
    tv.reviewed_at,
    tv.rejection_reason
  FROM technician_verifications tv
  WHERE tv.user_id = technician_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if technician can accept jobs (must be verified)
CREATE OR REPLACE FUNCTION can_accept_jobs(technician_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  verification_status VARCHAR(20);
BEGIN
  SELECT tv.status INTO verification_status
  FROM technician_verifications tv
  WHERE tv.user_id = technician_user_id;
  
  RETURN verification_status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STORAGE BUCKET POLICIES (Run in Supabase Dashboard)
-- =====================================================

/*
-- Create storage buckets (run these in Supabase Storage UI or via SQL):

-- 1. Create bucket for technician documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('technician-documents', 'technician-documents', false);

-- 2. Create bucket for job photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('job-photos', 'job-photos', false);

-- 3. Create bucket for profile photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', true);

-- Storage policies for technician-documents bucket:

-- Technicians can upload their own documents
CREATE POLICY "Technicians can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'technician-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Technicians can view their own documents
CREATE POLICY "Technicians can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'technician-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'technician-documents'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Storage policies for job-photos bucket:

-- Users can upload photos to their jobs
CREATE POLICY "Users can upload job photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view photos for their jobs
CREATE POLICY "Users can view job photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policies for profile-photos bucket (public):

-- Users can upload their own profile photo
CREATE POLICY "Users can upload own profile photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own profile photo
CREATE POLICY "Users can update own profile photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can view profile photos (public bucket)
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
*/

-- =====================================================
-- VERIFICATION STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW verification_statistics AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) as total_count,
  AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600) FILTER (WHERE status != 'pending') as avg_review_time_hours
FROM technician_verifications;

COMMENT ON VIEW verification_statistics IS 'Summary statistics for technician verifications';

-- Grant permissions
GRANT SELECT ON verification_statistics TO authenticated;
