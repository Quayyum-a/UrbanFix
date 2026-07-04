# UrbanFix Database Design
*Complete database schema, relationships, and data flow specifications*

## 1. Database Schema Overview

### 1.1 Entity Relationship Diagram
```
users (1:1) customer_profiles
users (1:1) technician_profiles
users (1:∞) jobs (as customer_id)
users (1:∞) jobs (as technician_id)
jobs (1:1) payments
jobs (1:∞) messages
jobs (1:∞) reviews
technician_profiles (1:∞) technician_pricing
parts_catalogue (1:∞) jobs (via part_id)
```

## 2. Core Tables

### 2.1 Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE NOT NULL, -- +234XXXXXXXXXX format
  role user_role NOT NULL DEFAULT 'customer',
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom enum for user roles
CREATE TYPE user_role AS ENUM ('customer', 'technician', 'admin');

-- Indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
```

### 2.2 Customer Profiles Table
```sql
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  location GEOMETRY(POINT, 4326), -- PostGIS for location data
  address_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_profiles_user_id ON customer_profiles(user_id);
CREATE INDEX idx_customer_profiles_location ON customer_profiles USING GIST(location);
```

### 2.3 Technician Profiles Table
```sql
CREATE TABLE technician_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Verification Documents
  nin VARCHAR(11) NOT NULL, -- National Identification Number
  nin_doc_url TEXT,
  
  -- Business Information
  shop_address TEXT,
  business_name VARCHAR(255),
  
  -- Banking Information
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(20),
  bank_account_name VARCHAR(255),
  paystack_recipient_code VARCHAR(50), -- For automated payouts
  
  -- Verification Status
  verification_status verification_status DEFAULT 'pending',
  rejection_reason TEXT,
  is_available BOOLEAN DEFAULT false,
  
  -- Admin Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom enum for verification status
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Indexes
CREATE INDEX idx_technician_profiles_user_id ON technician_profiles(user_id);
CREATE INDEX idx_technician_profiles_verification ON technician_profiles(verification_status);
CREATE INDEX idx_technician_profiles_availability ON technician_profiles(is_available);
```

### 2.4 Jobs Table (Core Business Entity)
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  customer_id UUID NOT NULL REFERENCES users(id),
  technician_id UUID REFERENCES users(id),
  
  -- Device Information
  device_brand VARCHAR(100) NOT NULL,
  device_model VARCHAR(200) NOT NULL,
  repair_category VARCHAR(100) NOT NULL,
  
  -- Pricing (stored in kobo - Nigerian currency subunit)
  part_id UUID REFERENCES parts_catalogue(id),
  part_price INTEGER NOT NULL DEFAULT 0, -- In kobo
  labour_price INTEGER NOT NULL DEFAULT 0, -- In kobo
  platform_fee INTEGER NOT NULL DEFAULT 0, -- In kobo
  total_price INTEGER NOT NULL, -- In kobo
  payout_amount INTEGER NOT NULL, -- Amount technician receives
  
  -- Logistics
  photo_urls TEXT[] DEFAULT '{}', -- Array of uploaded photos
  pickup_address TEXT NOT NULL,
  
  -- Workflow Status
  status job_status DEFAULT 'booked',
  
  -- Delivery Information
  rider_name VARCHAR(255),
  rider_phone VARCHAR(15),
  
  -- Additional Information
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Custom enum for job status
CREATE TYPE job_status AS ENUM (
  'booked',           -- Customer paid, waiting technician assignment
  'paid',             -- Payment confirmed
  'pickup_scheduled', -- Rider assigned for pickup
  'device_received',  -- Technician has device
  'repair_started',   -- Work in progress
  'awaiting_release', -- Complete, waiting customer approval
  'disputed',         -- Customer disputed completion
  'complete',         -- Payment released, job closed
  'cancelled'         -- Job cancelled
);

-- Indexes
CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX idx_jobs_technician_id ON jobs(technician_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_device_category ON jobs(device_brand, repair_category);
```

### 2.5 Payments Table (Escrow System)
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Payment Amount
  amount INTEGER NOT NULL, -- In kobo
  
  -- Payment Status
  status payment_status DEFAULT 'pending',
  
  -- Paystack Integration
  paystack_ref VARCHAR(100), -- Payment reference from Paystack
  paystack_transfer_ref VARCHAR(100), -- Payout reference to technician
  
  -- Timestamps
  escrowed_at TIMESTAMPTZ, -- When payment was held in escrow
  released_at TIMESTAMPTZ, -- When payment was released to technician
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom enum for payment status
CREATE TYPE payment_status AS ENUM (
  'pending',   -- Payment not yet received
  'escrowed',  -- Payment held in escrow
  'released',  -- Payment released to technician
  'refunded',  -- Payment refunded to customer
  'held'       -- Payment held due to dispute
);

-- Indexes
CREATE INDEX idx_payments_job_id ON payments(job_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paystack_ref ON payments(paystack_ref);
```

### 2.6 Messages Table (Chat System)
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  
  -- Message Content
  body TEXT NOT NULL,
  attachment_url TEXT, -- For image sharing
  
  -- Metadata
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_messages_job_id ON messages(job_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
```

### 2.7 Reviews Table (Rating System)
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id), -- Who is giving the review
  reviewee_id UUID NOT NULL REFERENCES users(id), -- Who is being reviewed
  
  -- Review Content
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reviews_job_id ON reviews(job_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

## 3. Support Tables

### 3.1 Parts Catalogue Table
```sql
CREATE TABLE parts_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Device Identification
  device_brand VARCHAR(100) NOT NULL,
  device_model VARCHAR(200) NOT NULL,
  repair_category VARCHAR(100) NOT NULL,
  
  -- Part Information
  part_name VARCHAR(255) NOT NULL,
  part_price INTEGER NOT NULL, -- In kobo
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_parts_catalogue_device ON parts_catalogue(device_brand, device_model, repair_category);
CREATE INDEX idx_parts_catalogue_active ON parts_catalogue(is_active);
```

### 3.2 Technician Pricing Table
```sql
CREATE TABLE technician_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES technician_profiles(user_id) ON DELETE CASCADE,
  
  -- Pricing Categories
  repair_category VARCHAR(100) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  labour_price INTEGER NOT NULL, -- In kobo
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique pricing per technician per category
  UNIQUE(technician_id, repair_category, device_type)
);

-- Indexes
CREATE INDEX idx_technician_pricing_technician ON technician_pricing(technician_id);
CREATE INDEX idx_technician_pricing_category ON technician_pricing(repair_category, device_type);
```

## 4. Database Functions

### 4.1 Technician Rating Function
```sql
CREATE OR REPLACE FUNCTION technician_avg_rating(t_user_id UUID)
RETURNS DECIMAL(3,2) AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating), 0.0)
    FROM reviews 
    WHERE reviewee_id = t_user_id
  );
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Technician Job Count Function
```sql
CREATE OR REPLACE FUNCTION technician_job_count(t_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM jobs 
    WHERE technician_id = t_user_id 
    AND status = 'complete'
  );
END;
$$ LANGUAGE plpgsql;
```

### 4.3 Auto-Update Timestamps Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_profiles_updated_at 
  BEFORE UPDATE ON customer_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technician_profiles_updated_at 
  BEFORE UPDATE ON technician_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
  BEFORE UPDATE ON jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 5. Row Level Security (RLS) Policies

### 5.1 Users Table Policies
```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### 5.2 Jobs Table Policies
```sql
-- Enable RLS on jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Customers can view their own jobs
CREATE POLICY "Customers can view own jobs" ON jobs
  FOR SELECT USING (auth.uid() = customer_id);

-- Technicians can view their assigned jobs
CREATE POLICY "Technicians can view assigned jobs" ON jobs
  FOR SELECT USING (auth.uid() = technician_id);

-- Customers can create new jobs
CREATE POLICY "Customers can create jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Technicians can update job status
CREATE POLICY "Technicians can update job status" ON jobs
  FOR UPDATE USING (auth.uid() = technician_id);
```

### 5.3 Messages Table Policies
```sql
-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Participants can view messages for their jobs
CREATE POLICY "Job participants can view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = messages.job_id 
      AND (jobs.customer_id = auth.uid() OR jobs.technician_id = auth.uid())
    )
  );

-- Participants can send messages
CREATE POLICY "Job participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_id 
      AND (jobs.customer_id = auth.uid() OR jobs.technician_id = auth.uid())
    )
  );
```

## 6. Data Migration Strategy

### 6.1 Migration Files Structure
```
migrations/
├── 20240101000000_initial_schema.sql
├── 20240101000001_rls_policies.sql
├── 20240101000002_functions_triggers.sql
├── 20240101000003_seed_data.sql
└── 20240101000004_indexes_optimization.sql
```

### 6.2 Seed Data Requirements
```sql
-- Insert default parts catalogue
INSERT INTO parts_catalogue (device_brand, device_model, repair_category, part_name, part_price) VALUES
('Apple', 'iPhone 15 Pro', 'screen_replacement', 'OLED Display Assembly', 15000000), -- ₦150,000 in kobo
('Samsung', 'Galaxy S24', 'battery_replacement', 'Li-ion Battery 4000mAh', 2500000), -- ₦25,000 in kobo
('Apple', 'MacBook Pro 13"', 'keyboard_replacement', 'Magic Keyboard', 8000000); -- ₦80,000 in kobo
```

## 7. Performance Optimization

### 7.1 Critical Indexes
```sql
-- Most frequently queried indexes
CREATE INDEX CONCURRENTLY idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_jobs_technician_status ON jobs(technician_id, status) WHERE technician_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_messages_job_sent ON messages(job_id, sent_at DESC);
CREATE INDEX CONCURRENTLY idx_reviews_reviewee_rating ON reviews(reviewee_id, rating);
```

### 7.2 Partitioning Strategy (Future)
```sql
-- Partition jobs table by creation month for better performance
-- Implementation when job volume exceeds 1M records
CREATE TABLE jobs_2024_01 PARTITION OF jobs 
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## 8. Backup and Recovery Strategy

### 8.1 Backup Requirements
- **Daily automated backups** via Supabase
- **Point-in-time recovery** capability
- **Cross-region backup** replication
- **Monthly backup verification** testing

### 8.2 Data Retention Policy
```sql
-- Archive completed jobs older than 2 years
-- Delete cancelled jobs older than 1 year
-- Retain payment records for 7 years (compliance)
-- Delete chat messages older than 1 year (GDPR compliance)
```

## 9. Monitoring and Maintenance

### 9.1 Database Health Monitoring
- Query performance monitoring
- Connection pool utilization
- Storage usage tracking
- Index usage analysis
- Slow query identification

### 9.2 Regular Maintenance Tasks
- **Weekly**: Analyze query performance
- **Monthly**: Update table statistics
- **Quarterly**: Review and optimize indexes
- **Annually**: Archive old data