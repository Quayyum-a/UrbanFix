-- UrbanFix Database Schema - Initial Migration
-- This implements the complete schema as specified in the design document
-- Includes 9 core tables with constraints, enums, and business logic

-- Enable PostGIS for spatial queries (customer locations)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Custom enum types for type safety
CREATE TYPE user_role AS ENUM ('customer', 'technician', 'admin');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE job_status AS ENUM (
  'booked', 
  'paid', 
  'pickup_scheduled', 
  'device_received', 
  'repair_started', 
  'awaiting_release', 
  'disputed', 
  'complete', 
  'cancelled'
);
CREATE TYPE payment_status AS ENUM ('pending', 'escrowed', 'released', 'refunded', 'disputed');

-- Base users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  role user_role NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT phone_format CHECK (phone ~ '^\+234[0-9]{10}$'),
  CONSTRAINT full_name_length CHECK (LENGTH(full_name) >= 2 OR full_name IS NULL)
);

-- Customer profile data with location support
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location GEOMETRY(POINT, 4326), -- PostGIS point for spatial queries
  address_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id),
  CONSTRAINT address_min_length CHECK (LENGTH(address_text) >= 10 OR address_text IS NULL)
);

-- Technician verification and business data
CREATE TABLE technician_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nin VARCHAR(11) NOT NULL,
  nin_doc_url TEXT,
  shop_address TEXT,
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(20),
  bank_account_name VARCHAR(255),
  paystack_recipient_code VARCHAR(50),
  verification_status verification_status DEFAULT 'pending',
  rejection_reason TEXT,
  is_available BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id),
  UNIQUE(nin),
  CONSTRAINT nin_format CHECK (nin ~ '^[0-9]{11}$'),
  CONSTRAINT shop_address_min_length CHECK (LENGTH(shop_address) >= 10 OR shop_address IS NULL),
  CONSTRAINT rejection_reason_when_rejected CHECK (
    verification_status != 'rejected' OR rejection_reason IS NOT NULL
  ),
  CONSTRAINT reviewed_fields_consistency CHECK (
    (reviewed_by IS NULL AND reviewed_at IS NULL) OR 
    (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

-- Parts catalogue for standardized pricing
CREATE TABLE parts_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_brand VARCHAR(100) NOT NULL,
  device_model VARCHAR(200) NOT NULL,
  repair_category VARCHAR(100) NOT NULL,
  part_name VARCHAR(255) NOT NULL,
  part_price INTEGER NOT NULL CHECK (part_price >= 0), -- kobo
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique parts per device/category combination
  UNIQUE(device_brand, device_model, repair_category, part_name)
);

-- Technician labor pricing configuration
CREATE TABLE technician_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES technician_profiles(user_id) ON DELETE CASCADE,
  repair_category VARCHAR(100) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  labour_price INTEGER NOT NULL CHECK (labour_price >= 0), -- kobo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One price per technician per category/device combination
  UNIQUE(technician_id, repair_category, device_type)
);

-- Core business transaction table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id),
  technician_id UUID REFERENCES users(id),
  
  -- Device information
  device_brand VARCHAR(100) NOT NULL,
  device_model VARCHAR(200) NOT NULL,
  repair_category VARCHAR(100) NOT NULL,
  
  -- Pricing breakdown (all in kobo)
  part_id UUID REFERENCES parts_catalogue(id),
  part_price INTEGER NOT NULL DEFAULT 0 CHECK (part_price >= 0),
  labour_price INTEGER NOT NULL DEFAULT 0 CHECK (labour_price >= 0),
  platform_fee INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  total_price INTEGER NOT NULL CHECK (total_price >= 0),
  payout_amount INTEGER NOT NULL CHECK (payout_amount >= 0), -- technician receives
  
  -- Logistics and metadata
  photo_urls TEXT[] DEFAULT '{}',
  pickup_address TEXT NOT NULL,
  status job_status DEFAULT 'booked',
  rider_name VARCHAR(255),
  rider_phone VARCHAR(15),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Business logic constraints
  CONSTRAINT pickup_address_min_length CHECK (LENGTH(pickup_address) >= 10),
  CONSTRAINT rider_phone_format CHECK (rider_phone ~ '^\+234[0-9]{10}$' OR rider_phone IS NULL),
  CONSTRAINT photo_urls_limit CHECK (array_length(photo_urls, 1) <= 3 OR photo_urls = '{}'),
  CONSTRAINT pricing_consistency CHECK (
    total_price = part_price + labour_price + platform_fee
  ),
  CONSTRAINT completed_at_when_complete CHECK (
    status != 'complete' OR completed_at IS NOT NULL
  ),
  CONSTRAINT technician_assignment_when_paid CHECK (
    status = 'booked' OR technician_id IS NOT NULL
  )
);

-- Escrow payment tracking
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0), -- kobo
  status payment_status DEFAULT 'pending',
  paystack_ref VARCHAR(100) UNIQUE,
  paystack_transfer_ref VARCHAR(100),
  escrowed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Business logic constraints
  CONSTRAINT escrow_timing CHECK (
    status != 'escrowed' OR escrowed_at IS NOT NULL
  ),
  CONSTRAINT release_timing CHECK (
    status NOT IN ('released', 'refunded') OR released_at IS NOT NULL
  ),
  CONSTRAINT paystack_ref_when_escrowed CHECK (
    status = 'pending' OR paystack_ref IS NOT NULL
  )
);

-- Job-scoped messaging between customers and technicians
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK (LENGTH(body) <= 1000 AND LENGTH(body) >= 1),
  attachment_url TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  -- Ensure sender is participant in the job
  CONSTRAINT sender_is_job_participant CHECK (
    sender_id IN (
      SELECT customer_id FROM jobs WHERE id = job_id
      UNION
      SELECT technician_id FROM jobs WHERE id = job_id AND technician_id IS NOT NULL
    )
  )
);

-- Trust and reputation system
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewee_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT CHECK (LENGTH(comment) <= 500 OR comment IS NULL),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Business logic constraints
  UNIQUE(job_id, reviewer_id), -- one review per job per reviewer
  CONSTRAINT no_self_review CHECK (reviewer_id != reviewee_id),
  CONSTRAINT review_after_completion CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE id = job_id AND status = 'complete'
    )
  )
);

-- Performance indexes for common query patterns
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_customer_profiles_user_id ON customer_profiles(user_id);
CREATE INDEX idx_customer_profiles_location ON customer_profiles USING GIST(location);
CREATE INDEX idx_technician_profiles_user_id ON technician_profiles(user_id);
CREATE INDEX idx_technician_profiles_verification_status ON technician_profiles(verification_status);
CREATE INDEX idx_technician_profiles_available ON technician_profiles(is_available) WHERE is_available = true;
CREATE INDEX idx_parts_catalogue_device_category ON parts_catalogue(device_brand, device_model, repair_category);
CREATE INDEX idx_parts_catalogue_active ON parts_catalogue(is_active) WHERE is_active = true;
CREATE INDEX idx_technician_pricing_technician ON technician_pricing(technician_id);
CREATE INDEX idx_jobs_customer_status ON jobs(customer_id, status);
CREATE INDEX idx_jobs_technician_status ON jobs(technician_id, status) WHERE technician_id IS NOT NULL;
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_desc ON jobs(created_at DESC);
CREATE INDEX idx_payments_job_id ON payments(job_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_messages_job_sent ON messages(job_id, sent_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_reviews_reviewee_rating ON reviews(reviewee_id, rating);
CREATE INDEX idx_reviews_job_id ON reviews(job_id);

-- Database functions for computed fields
CREATE OR REPLACE FUNCTION technician_avg_rating(t_user_id UUID)
RETURNS DECIMAL(3,2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE reviewee_id = t_user_id),
    0.0
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION technician_job_count(t_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT COUNT(*) FROM jobs WHERE technician_id = t_user_id AND status = 'complete'),
    0
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DOUBLE PRECISION, 
  lon1 DOUBLE PRECISION, 
  lat2 DOUBLE PRECISION, 
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN ST_Distance(
    ST_GeogFromText('POINT(' || lon1 || ' ' || lat1 || ')'),
    ST_GeogFromText('POINT(' || lon2 || ' ' || lat2 || ')')
  ) / 1000; -- Convert to kilometers
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_profiles_updated_at BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technician_profiles_updated_at BEFORE UPDATE ON technician_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_catalogue_updated_at BEFORE UPDATE ON parts_catalogue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technician_pricing_updated_at BEFORE UPDATE ON technician_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business logic triggers
CREATE OR REPLACE FUNCTION set_job_completion_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'complete' AND OLD.status != 'complete' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_job_completion_time_trigger BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_job_completion_time();

-- Function to automatically set payment escrow timestamp
CREATE OR REPLACE FUNCTION set_payment_escrow_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'escrowed' AND OLD.status != 'escrowed' THEN
    NEW.escrowed_at = NOW();
  END IF;
  
  IF NEW.status IN ('released', 'refunded') AND OLD.status NOT IN ('released', 'refunded') THEN
    NEW.released_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payment_escrow_time_trigger BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_payment_escrow_time();