-- UrbanFix Sample Data for Development and Testing
-- This provides realistic test data for the platform
-- Safe for development environment use

-- Sample parts catalogue data
INSERT INTO parts_catalogue (device_brand, device_model, repair_category, part_name, part_price, is_active) VALUES
-- iPhone parts
('Apple', 'iPhone 14 Pro', 'screen_replacement', 'OLED Display Assembly', 8500000, true), -- ₦85,000
('Apple', 'iPhone 14 Pro', 'battery_replacement', 'Lithium-Ion Battery', 2500000, true), -- ₦25,000
('Apple', 'iPhone 14', 'screen_replacement', 'LCD Display Assembly', 6500000, true), -- ₦65,000
('Apple', 'iPhone 13', 'screen_replacement', 'OLED Display Assembly', 5500000, true), -- ₦55,000
('Apple', 'iPhone 13', 'battery_replacement', 'Lithium-Ion Battery', 2200000, true), -- ₦22,000

-- Samsung parts
('Samsung', 'Galaxy S23 Ultra', 'screen_replacement', 'Dynamic AMOLED Display', 9500000, true), -- ₦95,000
('Samsung', 'Galaxy S23 Ultra', 'battery_replacement', 'Li-Ion Battery 5000mAh', 3000000, true), -- ₦30,000
('Samsung', 'Galaxy S23', 'screen_replacement', 'Dynamic AMOLED Display', 7000000, true), -- ₦70,000
('Samsung', 'Galaxy A54', 'screen_replacement', 'Super AMOLED Display', 3500000, true), -- ₦35,000
('Samsung', 'Galaxy A54', 'battery_replacement', 'Li-Ion Battery 5000mAh', 1800000, true), -- ₦18,000

-- Google Pixel parts
('Google', 'Pixel 7 Pro', 'screen_replacement', 'LTPO OLED Display', 8000000, true), -- ₦80,000
('Google', 'Pixel 7 Pro', 'battery_replacement', 'Li-Po Battery 5003mAh', 2800000, true), -- ₦28,000
('Google', 'Pixel 7', 'screen_replacement', 'AMOLED Display', 6000000, true), -- ₦60,000

-- Laptop parts
('Apple', 'MacBook Pro M2', 'screen_replacement', 'Retina Display 13.3"', 15000000, true), -- ₦150,000
('Apple', 'MacBook Pro M2', 'battery_replacement', 'Li-Po Battery 58.2Wh', 4500000, true), -- ₦45,000
('Dell', 'XPS 13', 'screen_replacement', 'InfinityEdge Display 13.4"', 12000000, true), -- ₦120,000
('HP', 'Pavilion 15', 'screen_replacement', 'HD Display 15.6"', 8000000, true), -- ₦80,000
('Lenovo', 'ThinkPad X1', 'battery_replacement', 'Li-Po Battery 57Wh', 3500000, true), -- ₦35,000

-- Tablet parts
('Apple', 'iPad Pro 12.9"', 'screen_replacement', 'Liquid Retina Display', 18000000, true), -- ₦180,000
('Samsung', 'Galaxy Tab S8', 'screen_replacement', 'TFT LCD Display', 10000000, true); -- ₦100,000

-- Sample admin user (for development only)
INSERT INTO users (id, phone, role, full_name, created_at) VALUES
('00000000-0000-0000-0000-000000000001', '+2348000000001', 'admin', 'System Administrator', NOW());

-- Sample customer users
INSERT INTO users (id, phone, role, full_name, avatar_url, created_at) VALUES
('11111111-1111-1111-1111-111111111111', '+2348111111111', 'customer', 'John Adebayo', null, NOW()),
('11111111-1111-1111-1111-111111111112', '+2348111111112', 'customer', 'Sarah Ibrahim', null, NOW()),
('11111111-1111-1111-1111-111111111113', '+2348111111113', 'customer', 'Michael Okafor', null, NOW());

-- Sample technician users
INSERT INTO users (id, phone, role, full_name, avatar_url, created_at) VALUES
('22222222-2222-2222-2222-222222222221', '+2348222222221', 'technician', 'David Oluwaseun', null, NOW()),
('22222222-2222-2222-2222-222222222222', '+2348222222222', 'technician', 'Grace Adetola', null, NOW()),
('22222222-2222-2222-2222-222222222223', '+2348222222223', 'technician', 'Ibrahim Muhammed', null, NOW());

-- Sample customer profiles with Lagos locations
INSERT INTO customer_profiles (user_id, location, address_text, created_at) VALUES
('11111111-1111-1111-1111-111111111111', ST_GeomFromText('POINT(3.3792 6.5244)', 4326), '123 Victoria Island, Lagos', NOW()),
('11111111-1111-1111-1111-111111111112', ST_GeomFromText('POINT(3.3673 6.5200)', 4326), '456 Ikeja GRA, Lagos', NOW()),
('11111111-1111-1111-1111-111111111113', ST_GeomFromText('POINT(3.4106 6.4474)', 4326), '789 Lekki Phase 1, Lagos', NOW());

-- Sample technician profiles (approved and ready for work)
INSERT INTO technician_profiles (
  user_id, nin, shop_address, bank_name, bank_account_number, bank_account_name, 
  paystack_recipient_code, verification_status, is_available, reviewed_by, reviewed_at, created_at
) VALUES
('22222222-2222-2222-2222-222222222221', '12345678901', 'Computer Village, Ikeja, Lagos', 'GTBank', '0123456789', 'David Oluwaseun', 'RCP_test123', 'approved', true, '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', '12345678902', 'Alaba International Market, Lagos', 'First Bank', '2134567890', 'Grace Adetola', 'RCP_test456', 'approved', true, '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('22222222-2222-2222-2222-222222222223', '12345678903', 'Otigba Computer Village, Lagos', 'Access Bank', '3145678901', 'Ibrahim Muhammed', 'RCP_test789', 'pending', false, null, null, NOW());

-- Sample technician pricing (competitive rates)
INSERT INTO technician_pricing (technician_id, repair_category, device_type, labour_price, created_at) VALUES
-- David's pricing (premium technician)
('22222222-2222-2222-2222-222222222221', 'screen_replacement', 'smartphone', 1500000, NOW()), -- ₦15,000
('22222222-2222-2222-2222-222222222221', 'battery_replacement', 'smartphone', 800000, NOW()), -- ₦8,000
('22222222-2222-2222-2222-222222222221', 'screen_replacement', 'laptop', 2500000, NOW()), -- ₦25,000
('22222222-2222-2222-2222-222222222221', 'battery_replacement', 'laptop', 1200000, NOW()), -- ₦12,000

-- Grace's pricing (competitive rates)
('22222222-2222-2222-2222-222222222222', 'screen_replacement', 'smartphone', 1200000, NOW()), -- ₦12,000
('22222222-2222-2222-2222-222222222222', 'battery_replacement', 'smartphone', 700000, NOW()), -- ₦7,000
('22222222-2222-2222-2222-222222222222', 'screen_replacement', 'tablet', 2000000, NOW()), -- ₦20,000
('22222222-2222-2222-2222-222222222222', 'battery_replacement', 'tablet', 1000000, NOW()); -- ₦10,000

-- Sample jobs to demonstrate the workflow
INSERT INTO jobs (
  id, customer_id, technician_id, device_brand, device_model, repair_category,
  part_id, part_price, labour_price, platform_fee, total_price, payout_amount,
  pickup_address, status, created_at
) VALUES
-- Completed job with review
(
  '33333333-3333-3333-3333-333333333331',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222221',
  'Apple', 'iPhone 13', 'screen_replacement',
  (SELECT id FROM parts_catalogue WHERE device_brand = 'Apple' AND device_model = 'iPhone 13' AND repair_category = 'screen_replacement'),
  5500000, -- Part price
  1500000, -- Labor price  
  700000,  -- Platform fee (10%)
  7700000, -- Total (₦77,000)
  6300000, -- Payout to technician (total - platform fee)
  '123 Victoria Island, Lagos',
  'complete',
  NOW() - INTERVAL '7 days'
),

-- Job in progress
(
  '33333333-3333-3333-3333-333333333332',
  '11111111-1111-1111-1111-111111111112',
  '22222222-2222-2222-2222-222222222222',
  'Samsung', 'Galaxy A54', 'battery_replacement',
  (SELECT id FROM parts_catalogue WHERE device_brand = 'Samsung' AND device_model = 'Galaxy A54' AND repair_category = 'battery_replacement'),
  1800000, -- Part price
  700000,  -- Labor price
  250000,  -- Platform fee
  2750000, -- Total (₦27,500)
  2250000, -- Payout to technician
  '456 Ikeja GRA, Lagos',
  'repair_started',
  NOW() - INTERVAL '2 days'
),

-- New paid job awaiting technician assignment
(
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111113',
  null, -- No technician assigned yet
  'Google', 'Pixel 7', 'screen_replacement',
  (SELECT id FROM parts_catalogue WHERE device_brand = 'Google' AND device_model = 'Pixel 7' AND repair_category = 'screen_replacement'),
  6000000, -- Part price
  1200000, -- Labor price estimate
  720000,  -- Platform fee
  7920000, -- Total (₦79,200)
  6480000, -- Payout to technician
  '789 Lekki Phase 1, Lagos',
  'paid',
  NOW() - INTERVAL '1 hour'
);

-- Sample payments for the jobs
INSERT INTO payments (job_id, amount, status, paystack_ref, escrowed_at, released_at, created_at) VALUES
('33333333-3333-3333-3333-333333333331', 7700000, 'released', 'PAY_test_12345', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '7 days'),
('33333333-3333-3333-3333-333333333332', 2750000, 'escrowed', 'PAY_test_67890', NOW() - INTERVAL '2 days', null, NOW() - INTERVAL '2 days'),
('33333333-3333-3333-3333-333333333333', 7920000, 'escrowed', 'PAY_test_11111', NOW() - INTERVAL '1 hour', null, NOW() - INTERVAL '1 hour');

-- Sample messages for active jobs
INSERT INTO messages (job_id, sender_id, body, sent_at) VALUES
-- Messages for completed job
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Hi David, my iPhone screen is completely cracked. When can you pick it up?', NOW() - INTERVAL '7 days'),
('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', 'Hello John! I can pick it up today around 2pm. Will send the rider to your location.', NOW() - INTERVAL '7 days' + INTERVAL '30 minutes'),
('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', 'Device received successfully. Screen replacement will take 2-3 hours. Will update you shortly.', NOW() - INTERVAL '6 days'),
('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', 'Repair completed! Your iPhone is ready. Screen is working perfectly. Sending it back now.', NOW() - INTERVAL '6 days' + INTERVAL '3 hours'),

-- Messages for current job
('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111112', 'Hello Grace, the battery drains very fast. Sometimes shuts down at 30%', NOW() - INTERVAL '2 days'),
('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'Hi Sarah! That definitely sounds like a battery issue. I have the replacement part. Will pick up device today.', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes'),
('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'Device received. Running diagnostics now. Will replace the battery and test thoroughly.', NOW() - INTERVAL '1 day'),
('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'Battery replacement in progress. Should be ready in 1-2 hours. Will test for 30 minutes before sending back.', NOW() - INTERVAL '4 hours');

-- Sample review for completed job
INSERT INTO reviews (job_id, reviewer_id, reviewee_id, rating, comment, created_at) VALUES
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 5, 'Excellent work! David replaced my iPhone screen perfectly. Very professional and fast service. Highly recommended!', NOW() - INTERVAL '1 day');

-- Add some additional reviews to build technician reputation
INSERT INTO jobs (
  id, customer_id, technician_id, device_brand, device_model, repair_category,
  part_price, labour_price, platform_fee, total_price, payout_amount,
  pickup_address, status, completed_at, created_at
) VALUES
-- Historical completed jobs for reputation building
(
  '44444444-4444-4444-4444-444444444441',
  '11111111-1111-1111-1111-111111111112',
  '22222222-2222-2222-2222-222222222221',
  'Samsung', 'Galaxy S23', 'screen_replacement',
  7000000, 1500000, 850000, 9350000, 7650000,
  '456 Ikeja GRA, Lagos', 'complete',
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '20 days'
),
(
  '44444444-4444-4444-4444-444444444442',
  '11111111-1111-1111-1111-111111111113',
  '22222222-2222-2222-2222-222222222222',
  'Apple', 'iPhone 14', 'battery_replacement',
  2500000, 800000, 330000, 3630000, 2970000,
  '789 Lekki Phase 1, Lagos', 'complete',
  NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days'
);

INSERT INTO reviews (job_id, reviewer_id, reviewee_id, rating, comment, created_at) VALUES
('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222221', 4, 'Great service, screen works perfectly. Delivery was a bit delayed but overall satisfied.', NOW() - INTERVAL '14 days'),
('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111113', '22222222-2222-2222-2222-222222222222', 5, 'Amazing! Grace fixed my iPhone battery issue completely. Very professional and reliable.', NOW() - INTERVAL '9 days');

-- Add corresponding payments for historical jobs
INSERT INTO payments (job_id, amount, status, paystack_ref, escrowed_at, released_at, created_at) VALUES
('44444444-4444-4444-4444-444444444441', 9350000, 'released', 'PAY_hist_001', NOW() - INTERVAL '20 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '20 days'),
('44444444-4444-4444-4444-444444444442', 3630000, 'released', 'PAY_hist_002', NOW() - INTERVAL '12 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '12 days');