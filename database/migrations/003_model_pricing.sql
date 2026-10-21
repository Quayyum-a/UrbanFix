-- =============================================================================
-- 003: Prices by exact model and part grade, technician checks before payment,
--      part money released at payment, and warranty claims.
--
-- Run this whole file once in the Supabase SQL editor (after 002).
-- Safe to run again: it never overwrites prices or repair fees you've set.
--
-- What the customer sees:   Part (grade)  +  Service charge  =  Total
--   Service charge = technician's repair fee + UrbanFix fee (shown as one line).
--   UrbanFix fee   = ₦1,500 + 5% of the part price, rounded up to ₦500, max ₦15,000
--                    (half for repeat customers). Change it in public.settings.
--
-- New repair flow:
--   requested → accepted → (technician collects the device, records IMEI/photos,
--   confirms model, problem, part grade and final price) quoted → customer pays →
--   payment_submitted → admin confirms → in_repair (part money due to technician)
--   → awaiting_confirmation → completed (repair fee due) → [warranty claim] warranty
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New job states (unused by older jobs already in progress)
-- ---------------------------------------------------------------------------
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'quoted' AFTER 'accepted';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'warranty' AFTER 'completed';

DO $$ BEGIN
  CREATE TYPE public.part_grade AS ENUM ('standard', 'high', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. Catalog: brands, models, part grades, part prices, Jiji observations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.device_brands (
  device_type text NOT NULL,
  brand text NOT NULL CHECK (brand ~ '^[a-z0-9_]{2,30}$'),
  label text NOT NULL,
  is_android boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (device_type, brand)
);

CREATE TABLE IF NOT EXISTS public.device_models (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_type text NOT NULL,
  brand text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  hint text CHECK (hint IS NULL OR char_length(hint) <= 120),
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  FOREIGN KEY (device_type, brand) REFERENCES public.device_brands(device_type, brand),
  UNIQUE (device_type, brand, name)
);

CREATE TABLE IF NOT EXISTS public.part_grades (
  grade public.part_grade PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  warranty_days int NOT NULL CHECK (warranty_days BETWEEN 1 AND 90),
  sort_order int NOT NULL
);

-- How a repair is priced: 'catalog' (price list per model and grade),
-- 'inspection' (technician prices the part after checking), 'none' (no part).
ALTER TABLE public.repair_options
  ADD COLUMN IF NOT EXISTS part_mode text NOT NULL DEFAULT 'inspection',
  ADD COLUMN IF NOT EXISTS suggested_labour_kobo int;
DO $$ BEGIN
  ALTER TABLE public.repair_options ADD CONSTRAINT repair_options_part_mode CHECK (part_mode IN ('catalog', 'inspection', 'none'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.part_prices (
  model_id bigint NOT NULL REFERENCES public.device_models(id) ON DELETE CASCADE,
  category text NOT NULL,
  grade public.part_grade NOT NULL,
  price_kobo int NOT NULL CHECK (price_kobo BETWEEN 50000 AND 500000000 AND price_kobo % 100 = 0),
  market_label text CHECK (market_label IS NULL OR char_length(market_label) <= 40),
  source text NOT NULL CHECK (source IN ('jiji', 'admin')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  PRIMARY KEY (model_id, category, grade)
);

CREATE TABLE IF NOT EXISTS public.price_observations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  model_id bigint NOT NULL REFERENCES public.device_models(id) ON DELETE CASCADE,
  category text NOT NULL,
  grade public.part_grade NOT NULL,
  source text NOT NULL DEFAULT 'jiji',
  sample_size int NOT NULL CHECK (sample_size > 0),
  low_kobo int NOT NULL,
  median_kobo int NOT NULL,
  high_kobo int NOT NULL,
  url text,
  observed_on date NOT NULL,
  UNIQUE (model_id, category, grade, source, observed_on, url)
);

-- ---------------------------------------------------------------------------
-- 3. Settings and job columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS fee_base_kobo int NOT NULL DEFAULT 150000 CHECK (fee_base_kobo BETWEEN 0 AND 10000000),
  ADD COLUMN IF NOT EXISTS fee_rate_bps int NOT NULL DEFAULT 500 CHECK (fee_rate_bps BETWEEN 0 AND 3000),
  ADD COLUMN IF NOT EXISTS fee_cap_kobo int NOT NULL DEFAULT 1500000 CHECK (fee_cap_kobo BETWEEN 0 AND 50000000),
  ADD COLUMN IF NOT EXISTS fee_round_kobo int NOT NULL DEFAULT 50000 CHECK (fee_round_kobo BETWEEN 100 AND 500000),
  ADD COLUMN IF NOT EXISTS repeat_fee_discount_bps int NOT NULL DEFAULT 5000 CHECK (repeat_fee_discount_bps BETWEEN 0 AND 10000),
  ADD COLUMN IF NOT EXISTS max_quote_part_kobo int NOT NULL DEFAULT 200000000,
  ADD COLUMN IF NOT EXISTS price_stale_days int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS pricing_version int NOT NULL DEFAULT 1;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS model_id bigint REFERENCES public.device_models(id),
  ADD COLUMN IF NOT EXISTS grade public.part_grade,
  ADD COLUMN IF NOT EXISTS part_label text,
  ADD COLUMN IF NOT EXISTS part_kobo int NOT NULL DEFAULT 0 CHECK (part_kobo >= 0),
  ADD COLUMN IF NOT EXISTS part_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS labour_kobo int,
  ADD COLUMN IF NOT EXISTS estimate_kobo int,
  ADD COLUMN IF NOT EXISTS price_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS part_payout_status public.payout_status NOT NULL DEFAULT 'not_due',
  ADD COLUMN IF NOT EXISTS part_payout_reference text,
  ADD COLUMN IF NOT EXISTS part_payout_at timestamptz,
  ADD COLUMN IF NOT EXISTS warranty_days int NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS warranty_until timestamptz,
  ADD COLUMN IF NOT EXISTS warranty_reason text CHECK (warranty_reason IS NULL OR char_length(warranty_reason) <= 500),
  ADD COLUMN IF NOT EXISTS warranty_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS warranty_notes text CHECK (warranty_notes IS NULL OR char_length(warranty_notes) <= 500),
  ADD COLUMN IF NOT EXISTS warranty_photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS warranty_done_at timestamptz;

-- Jobs made before this migration: everything except the fee was the technician's.
UPDATE public.jobs SET labour_kobo = price_kobo - commission_kobo - part_kobo WHERE labour_kobo IS NULL;
UPDATE public.jobs SET estimate_kobo = price_kobo WHERE estimate_kobo IS NULL;
ALTER TABLE public.jobs ALTER COLUMN labour_kobo SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.jobs ADD CONSTRAINT price_parts CHECK (price_kobo = part_kobo + labour_kobo + commission_kobo);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.jobs ADD CONSTRAINT warranty_photo_limit CHECK (cardinality(warranty_photos) <= 4);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4. Seed: grades, how each repair is priced, suggested repair fees
-- ---------------------------------------------------------------------------
INSERT INTO public.part_grades (grade, label, description, warranty_days, sort_order) VALUES
  ('standard', 'Standard', 'Works well and costs least. Screens can be a little less bright or sharp than the original.', 7, 1),
  ('high', 'High quality', 'Better parts, close to the original look and feel.', 14, 2),
  ('premium', 'Premium', 'Top grade (e.g. GX OLED screens). The closest you can get to the original part.', 14, 3)
ON CONFLICT (grade) DO NOTHING;

UPDATE public.repair_options SET part_mode = CASE
  WHEN category IN ('software_issues', 'diagnosis') THEN 'none'
  WHEN device_type = 'smartphone' AND category IN ('screen_replacement', 'battery_replacement', 'charging_port', 'back_glass', 'camera', 'speaker') THEN 'catalog'
  WHEN device_type = 'tablet' AND category IN ('screen_replacement', 'battery_replacement', 'charging_port') THEN 'catalog'
  ELSE 'inspection' END;

UPDATE public.repair_options r SET suggested_labour_kobo = v.naira * 100
FROM (VALUES
  ('smartphone', 'screen_replacement', 5000), ('smartphone', 'battery_replacement', 5000), ('smartphone', 'charging_port', 4000),
  ('smartphone', 'water_damage', 8000), ('smartphone', 'camera', 4000), ('smartphone', 'speaker', 3000),
  ('smartphone', 'back_glass', 6000), ('smartphone', 'buttons', 3000), ('smartphone', 'software_issues', 5000), ('smartphone', 'diagnosis', 2000),
  ('laptop', 'screen_replacement', 8000), ('laptop', 'battery_replacement', 5000), ('laptop', 'charging_port', 6000),
  ('laptop', 'keyboard_replacement', 6000), ('laptop', 'hinge_repair', 8000), ('laptop', 'overheating', 6000),
  ('laptop', 'storage_upgrade', 5000), ('laptop', 'motherboard_repair', 15000), ('laptop', 'software_issues', 8000), ('laptop', 'diagnosis', 3000),
  ('tablet', 'screen_replacement', 7000), ('tablet', 'battery_replacement', 5000), ('tablet', 'charging_port', 5000),
  ('tablet', 'software_issues', 5000), ('tablet', 'diagnosis', 2000),
  ('desktop', 'power_supply', 8000), ('desktop', 'storage_upgrade', 5000), ('desktop', 'overheating', 5000),
  ('desktop', 'software_issues', 8000), ('desktop', 'diagnosis', 3000)
) AS v(device_type, category, naira)
WHERE r.device_type = v.device_type AND r.category = v.category AND r.suggested_labour_kobo IS NULL;

-- One time only: technicians' existing prices were "full price including parts".
-- They now mean "repair fee only", so reset them to the suggested fee (technicians can change it).
DO $$ BEGIN
  IF (SELECT pricing_version FROM public.settings WHERE id = 1) < 3 THEN
    UPDATE public.services s SET price_kobo = r.suggested_labour_kobo
      FROM public.repair_options r WHERE r.device_type = s.device_type AND r.category = s.category;
    UPDATE public.settings SET pricing_version = 3 WHERE id = 1;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Seed: brands and models (newest first). Add more any time:
--    SELECT public.admin_add_model('smartphone', 'samsung', 'Galaxy A57', NULL);  -- (admin in the app)
-- ---------------------------------------------------------------------------
INSERT INTO public.device_brands (device_type, brand, label, is_android, sort_order) VALUES
  ('smartphone', 'iphone', 'iPhone', false, 1), ('smartphone', 'samsung', 'Samsung', true, 2),
  ('smartphone', 'tecno', 'Tecno', true, 3), ('smartphone', 'infinix', 'Infinix', true, 4),
  ('smartphone', 'itel', 'itel', true, 5), ('smartphone', 'redmi', 'Redmi / Xiaomi', true, 6),
  ('smartphone', 'other_android', 'Other Android', true, 7),
  ('laptop', 'hp', 'HP', false, 1), ('laptop', 'dell', 'Dell', false, 2), ('laptop', 'lenovo', 'Lenovo', false, 3),
  ('laptop', 'macbook', 'MacBook', false, 4), ('laptop', 'asus', 'Asus', false, 5), ('laptop', 'acer', 'Acer', false, 6),
  ('laptop', 'other', 'Other', false, 7),
  ('tablet', 'ipad', 'iPad', false, 1), ('tablet', 'samsung', 'Samsung', true, 2), ('tablet', 'other', 'Other', false, 3),
  ('desktop', 'hp', 'HP', false, 1), ('desktop', 'dell', 'Dell', false, 2), ('desktop', 'lenovo', 'Lenovo', false, 3),
  ('desktop', 'imac', 'iMac', false, 4), ('desktop', 'other', 'Other / custom-built', false, 5)
ON CONFLICT (device_type, brand) DO NOTHING;

INSERT INTO public.device_models (device_type, brand, name, hint, sort_order)
SELECT 'smartphone', 'iphone', v.name, v.hint, v.ord FROM (VALUES
  ('iPhone 18 Pro Max', '3 cameras', 400), ('iPhone 18 Pro', '3 cameras', 399),
  ('iPhone 17 Pro Max', '3 cameras · 6.9″', 390), ('iPhone 17 Pro', '3 cameras · 6.3″', 389), ('iPhone Air', '1 camera, very thin', 388), ('iPhone 17', '2 cameras · 6.3″', 387),
  ('iPhone 16e', '1 camera · 6.1″', 381), ('iPhone 16 Pro Max', '3 cameras · 6.9″', 380), ('iPhone 16 Pro', '3 cameras · 6.3″', 379),
  ('iPhone 16 Plus', '2 cameras · 6.7″', 378), ('iPhone 16', '2 cameras · 6.1″', 377),
  ('iPhone 15 Pro Max', '3 cameras · 6.7″', 370), ('iPhone 15 Pro', '3 cameras · 6.1″', 369), ('iPhone 15 Plus', '2 cameras · 6.7″', 368), ('iPhone 15', '2 cameras · 6.1″', 367),
  ('iPhone 14 Pro Max', '3 cameras · 6.7″', 360), ('iPhone 14 Pro', '3 cameras · 6.1″', 359), ('iPhone 14 Plus', '2 cameras · 6.7″', 358), ('iPhone 14', '2 cameras · 6.1″', 357),
  ('iPhone 13 Pro Max', '3 cameras · 6.7″', 350), ('iPhone 13 Pro', '3 cameras · 6.1″', 349), ('iPhone 13', '2 cameras · 6.1″', 348), ('iPhone 13 mini', '2 cameras · 5.4″', 347),
  ('iPhone 12 Pro Max', '3 cameras · 6.7″', 340), ('iPhone 12 Pro', '3 cameras · 6.1″', 339), ('iPhone 12', '2 cameras · 6.1″', 338), ('iPhone 12 mini', '2 cameras · 5.4″', 337),
  ('iPhone 11 Pro Max', '3 cameras · 6.5″', 330), ('iPhone 11 Pro', '3 cameras · 5.8″', 329), ('iPhone 11', '2 cameras · 6.1″', 328),
  ('iPhone XS Max', '2 cameras · 6.5″', 320), ('iPhone XS', '2 cameras · 5.8″', 319), ('iPhone XR', '1 camera · 6.1″', 318), ('iPhone X', '2 cameras · 5.8″', 317),
  ('iPhone SE (2022)', 'Home button', 316), ('iPhone SE (2020)', 'Home button', 315),
  ('iPhone 8 Plus', 'Home button · 5.5″', 310), ('iPhone 8', 'Home button · 4.7″', 309),
  ('iPhone 7 Plus', 'Home button · 5.5″', 300), ('iPhone 7', 'Home button · 4.7″', 299)
) AS v(name, hint, ord)
ON CONFLICT (device_type, brand, name) DO NOTHING;

INSERT INTO public.device_models (device_type, brand, name, sort_order)
SELECT 'smartphone', v.brand, v.name, v.ord FROM (VALUES
  ('samsung', 'Galaxy S25 Ultra', 290), ('samsung', 'Galaxy S25', 289), ('samsung', 'Galaxy S24 Ultra', 280), ('samsung', 'Galaxy S24', 279),
  ('samsung', 'Galaxy S23 Ultra', 270), ('samsung', 'Galaxy S23', 269), ('samsung', 'Galaxy S22 Ultra', 260), ('samsung', 'Galaxy S22', 259),
  ('samsung', 'Galaxy S21 Ultra', 250), ('samsung', 'Galaxy S21', 249), ('samsung', 'Galaxy Note 20 Ultra', 245),
  ('samsung', 'Galaxy A56', 240), ('samsung', 'Galaxy A55', 239), ('samsung', 'Galaxy A54', 238), ('samsung', 'Galaxy A36', 230),
  ('samsung', 'Galaxy A35', 229), ('samsung', 'Galaxy A34', 228), ('samsung', 'Galaxy A26', 220), ('samsung', 'Galaxy A25', 219),
  ('samsung', 'Galaxy A24', 218), ('samsung', 'Galaxy A16', 210), ('samsung', 'Galaxy A15', 209), ('samsung', 'Galaxy A14', 208),
  ('samsung', 'Galaxy A06', 200), ('samsung', 'Galaxy A05s', 199), ('samsung', 'Galaxy A05', 198),
  ('tecno', 'Camon 40 Pro', 290), ('tecno', 'Camon 40', 289), ('tecno', 'Camon 30 Pro', 280), ('tecno', 'Camon 30', 279),
  ('tecno', 'Camon 20 Pro', 270), ('tecno', 'Camon 20', 269), ('tecno', 'Spark 40 Pro', 260), ('tecno', 'Spark 40', 259),
  ('tecno', 'Spark 30 Pro', 250), ('tecno', 'Spark 30', 249), ('tecno', 'Spark 20 Pro', 240), ('tecno', 'Spark 20', 239),
  ('tecno', 'Spark 10 Pro', 230), ('tecno', 'Spark 10', 229), ('tecno', 'Pova 7', 220), ('tecno', 'Pova 6', 219), ('tecno', 'Pova 5', 218),
  ('tecno', 'Phantom X2', 210),
  ('infinix', 'Note 50', 290), ('infinix', 'Note 40 Pro', 280), ('infinix', 'Note 40', 279), ('infinix', 'Note 30', 270),
  ('infinix', 'Hot 50', 260), ('infinix', 'Hot 50i', 259), ('infinix', 'Hot 40', 250), ('infinix', 'Hot 40i', 249),
  ('infinix', 'Hot 30', 240), ('infinix', 'Hot 30i', 239), ('infinix', 'Smart 9', 230), ('infinix', 'Smart 8', 229),
  ('infinix', 'Smart 7', 228), ('infinix', 'Zero 40', 220), ('infinix', 'Zero 30', 219),
  ('itel', 'A80', 290), ('itel', 'A70', 280), ('itel', 'S24', 270), ('itel', 'S23', 260), ('itel', 'P55', 250),
  ('redmi', 'Redmi Note 14 Pro', 290), ('redmi', 'Redmi Note 14', 289), ('redmi', 'Redmi Note 13 Pro', 280), ('redmi', 'Redmi Note 13', 279),
  ('redmi', 'Redmi Note 12', 270), ('redmi', 'Redmi 14C', 260), ('redmi', 'Redmi 13C', 250), ('redmi', 'Redmi 13', 249), ('redmi', 'Redmi 12', 240)
) AS v(brand, name, ord)
ON CONFLICT (device_type, brand, name) DO NOTHING;

INSERT INTO public.device_models (device_type, brand, name, hint, sort_order)
SELECT v.device_type, v.brand, v.name, v.hint, v.ord FROM (VALUES
  ('laptop', 'hp', 'Pavilion', NULL, 10), ('laptop', 'hp', 'ProBook', NULL, 9), ('laptop', 'hp', 'EliteBook', NULL, 8),
  ('laptop', 'hp', 'HP 14 / 15 (14s, 15s, 250 G)', NULL, 7), ('laptop', 'hp', 'Envy', NULL, 6), ('laptop', 'hp', 'Spectre', NULL, 5),
  ('laptop', 'hp', 'Victus / Omen', 'Gaming', 4),
  ('laptop', 'dell', 'Inspiron', NULL, 10), ('laptop', 'dell', 'Latitude', NULL, 9), ('laptop', 'dell', 'Vostro', NULL, 8),
  ('laptop', 'dell', 'XPS', NULL, 7), ('laptop', 'dell', 'G series / Alienware', 'Gaming', 6),
  ('laptop', 'lenovo', 'IdeaPad', NULL, 10), ('laptop', 'lenovo', 'ThinkPad', NULL, 9), ('laptop', 'lenovo', 'ThinkBook', NULL, 8),
  ('laptop', 'lenovo', 'Yoga', NULL, 7), ('laptop', 'lenovo', 'Legion / LOQ', 'Gaming', 6),
  ('laptop', 'macbook', 'MacBook Air (M1 or newer)', 'Apple menu → About This Mac', 10), ('laptop', 'macbook', 'MacBook Air (Intel)', 'Before 2020', 9),
  ('laptop', 'macbook', 'MacBook Pro (M1 or newer)', 'Apple menu → About This Mac', 8), ('laptop', 'macbook', 'MacBook Pro (Intel)', 'Before 2021', 7),
  ('laptop', 'asus', 'VivoBook', NULL, 10), ('laptop', 'asus', 'ZenBook', NULL, 9), ('laptop', 'asus', 'TUF / ROG', 'Gaming', 8),
  ('laptop', 'acer', 'Aspire', NULL, 10), ('laptop', 'acer', 'Swift', NULL, 9), ('laptop', 'acer', 'Nitro / Predator', 'Gaming', 8),
  ('tablet', 'ipad', 'iPad (9th gen or newer)', 'Settings → General → About', 10), ('tablet', 'ipad', 'iPad (8th gen or older)', NULL, 9),
  ('tablet', 'ipad', 'iPad Air', NULL, 8), ('tablet', 'ipad', 'iPad Pro', NULL, 7), ('tablet', 'ipad', 'iPad mini', NULL, 6),
  ('tablet', 'samsung', 'Galaxy Tab A', NULL, 10), ('tablet', 'samsung', 'Galaxy Tab S', NULL, 9),
  ('desktop', 'hp', 'HP All-in-One', NULL, 10), ('desktop', 'hp', 'HP desktop tower', NULL, 9),
  ('desktop', 'dell', 'Dell OptiPlex', NULL, 10), ('desktop', 'dell', 'Dell Inspiron desktop', NULL, 9),
  ('desktop', 'lenovo', 'Lenovo ThinkCentre', NULL, 10), ('desktop', 'lenovo', 'Lenovo IdeaCentre', NULL, 9),
  ('desktop', 'imac', 'iMac (M1 or newer)', NULL, 10), ('desktop', 'imac', 'iMac (Intel)', NULL, 9)
) AS v(device_type, brand, name, hint, ord)
ON CONFLICT (device_type, brand, name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Seed: Jiji price observations (asking prices seen on 21 Oct 2026) and
--    the first approved prices. Approve the rest in the app: Admin → Prices.
-- ---------------------------------------------------------------------------
INSERT INTO public.price_observations (model_id, category, grade, sample_size, low_kobo, median_kobo, high_kobo, url, observed_on)
SELECT m.id, v.cat, v.grade::public.part_grade, v.n, v.lo * 100, v.med * 100, v.hi * 100, v.url, DATE '2026-10-21'
FROM (VALUES
  ('iPhone X', 'screen_replacement', 'standard', 3, 14000, 16000, 25000, 'https://jiji.ng/11-phone-screens/apple-iphone-x'),
  ('iPhone X', 'screen_replacement', 'high', 7, 22000, 30000, 35000, 'https://jiji.ng/11-phone-screens/apple-iphone-x'),
  ('iPhone X', 'screen_replacement', 'premium', 3, 20000, 37000, 48000, 'https://jiji.ng/11-phone-screens/apple-iphone-x'),
  ('iPhone XR', 'screen_replacement', 'standard', 3, 18000, 35000, 60000, 'https://jiji.ng/11-phone-screens/apple-iphone-xr'),
  ('iPhone XR', 'screen_replacement', 'high', 1, 30000, 30000, 30000, 'https://jiji.ng/11-phone-screens/apple-iphone-xr'),
  ('iPhone XR', 'screen_replacement', 'premium', 5, 18000, 30000, 32000, 'https://jiji.ng/11-phone-screens/apple-iphone-xr'),
  ('iPhone XS Max', 'screen_replacement', 'standard', 4, 25000, 37500, 40000, 'https://jiji.ng/11-phone-screens/apple-iphone-xs-max'),
  ('iPhone XS Max', 'screen_replacement', 'high', 4, 31000, 37500, 55000, 'https://jiji.ng/11-phone-screens/apple-iphone-xs-max'),
  ('iPhone XS Max', 'screen_replacement', 'premium', 9, 27000, 50000, 70000, 'https://jiji.ng/11-phone-screens/apple-iphone-xs-max'),
  ('iPhone 11', 'screen_replacement', 'standard', 1, 60000, 60000, 60000, 'https://jiji.ng/11-phone-screens/apple-iphone-11'),
  ('iPhone 11', 'screen_replacement', 'high', 2, 24000, 27000, 30000, 'https://jiji.ng/11-phone-screens/apple-iphone-11'),
  ('iPhone 11', 'screen_replacement', 'premium', 1, 35000, 35000, 35000, 'https://jiji.ng/11-phone-screens/apple-iphone-11'),
  ('iPhone 11 Pro', 'screen_replacement', 'standard', 1, 40000, 40000, 40000, 'https://jiji.ng/11-phone-screens/apple-iphone-11-pro'),
  ('iPhone 11 Pro', 'screen_replacement', 'high', 1, 40000, 40000, 40000, 'https://jiji.ng/11-phone-screens/apple-iphone-11-pro'),
  ('iPhone 11 Pro', 'screen_replacement', 'premium', 6, 30000, 65000, 75000, 'https://jiji.ng/11-phone-screens/apple-iphone-11-pro'),
  ('iPhone 11 Pro Max', 'screen_replacement', 'standard', 2, 27000, 46000, 65000, 'https://jiji.ng/11-phone-screens/apple-iphone-11-pro-max'),
  ('iPhone 11 Pro Max', 'screen_replacement', 'high', 3, 36000, 40000, 60000, 'https://jiji.ng/11-phone-screens/apple-iphone-11-pro-max'),
  ('iPhone 11 Pro Max', 'screen_replacement', 'premium', 7, 35000, 60000, 69500, 'https://jiji.ng/11-phone-screens/apple-iphone-11-pro-max'),
  ('iPhone 12', 'screen_replacement', 'standard', 2, 50000, 55000, 60000, 'https://jiji.ng/11-phone-screens/apple-iphone-12'),
  ('iPhone 12', 'screen_replacement', 'high', 1, 28000, 28000, 28000, 'https://jiji.ng/11-phone-screens/apple-iphone-12'),
  ('iPhone 12', 'screen_replacement', 'premium', 4, 35000, 60000, 70000, 'https://jiji.ng/11-phone-screens/apple-iphone-12'),
  ('iPhone 12 Pro', 'screen_replacement', 'standard', 2, 50000, 55000, 60000, 'https://jiji.ng/11-phone-screens/apple-iphone-12'),
  ('iPhone 12 Pro', 'screen_replacement', 'high', 1, 28000, 28000, 28000, 'https://jiji.ng/11-phone-screens/apple-iphone-12'),
  ('iPhone 12 Pro', 'screen_replacement', 'premium', 4, 35000, 60000, 70000, 'https://jiji.ng/11-phone-screens/apple-iphone-12'),
  ('iPhone 12 Pro Max', 'screen_replacement', 'standard', 3, 28000, 30000, 80000, 'https://jiji.ng/11-phone-screens/apple-iphone-12-pro-max'),
  ('iPhone 12 Pro Max', 'screen_replacement', 'high', 4, 50000, 85000, 100000, 'https://jiji.ng/11-phone-screens/apple-iphone-12-pro-max'),
  ('iPhone 12 Pro Max', 'screen_replacement', 'premium', 10, 50000, 75000, 120000, 'https://jiji.ng/11-phone-screens/apple-iphone-12-pro-max'),
  ('iPhone 13', 'screen_replacement', 'high', 1, 70000, 70000, 70000, 'https://jiji.ng/11-phone-screens/apple-iphone-13'),
  ('iPhone 13', 'screen_replacement', 'premium', 1, 70000, 70000, 70000, 'https://jiji.ng/ikeja/11-phone-screens/apple'),
  ('iPhone 13 Pro', 'screen_replacement', 'standard', 1, 55000, 55000, 55000, 'https://jiji.ng/11-phone-screens/apple-iphone-13-pro'),
  ('iPhone 13 Pro', 'screen_replacement', 'high', 3, 70000, 90000, 95000, 'https://jiji.ng/11-phone-screens/apple-iphone-13-pro'),
  ('iPhone 13 Pro', 'screen_replacement', 'premium', 2, 75000, 77500, 80000, 'https://jiji.ng/11-phone-screens/apple-iphone-13-pro'),
  ('iPhone 13 Pro Max', 'screen_replacement', 'standard', 3, 30000, 45000, 70000, 'https://jiji.ng/11-phone-screens/apple-iphone-13-pro-max'),
  ('iPhone 13 Pro Max', 'screen_replacement', 'high', 2, 45000, 62500, 80000, 'https://jiji.ng/11-phone-screens/apple-iphone-13-pro-max'),
  ('iPhone 13 Pro Max', 'screen_replacement', 'premium', 8, 70000, 85000, 110000, 'https://jiji.ng/11-phone-screens/apple-iphone-13-pro-max'),
  ('iPhone 14 Plus', 'screen_replacement', 'high', 1, 75000, 75000, 75000, 'https://jiji.ng/ikeja/11-phone-screens/apple'),
  ('iPhone 14 Pro Max', 'screen_replacement', 'standard', 3, 70000, 80000, 85000, 'https://jiji.ng/11-phone-screens/apple-iphone-14-pro-max'),
  ('iPhone 14 Pro Max', 'screen_replacement', 'high', 3, 65000, 80000, 85000, 'https://jiji.ng/11-phone-screens/apple-iphone-14-pro-max'),
  ('iPhone 14 Pro Max', 'screen_replacement', 'premium', 5, 90000, 90000, 100000, 'https://jiji.ng/11-phone-screens/apple-iphone-14-pro-max'),
  ('iPhone 15 Plus', 'screen_replacement', 'high', 1, 95000, 95000, 95000, 'https://jiji.ng/ikeja/11-phone-screens/apple'),
  ('iPhone 16', 'screen_replacement', 'high', 1, 90000, 90000, 90000, 'https://jiji.ng/ikeja/11-phone-screens/apple'),
  ('iPhone 17', 'screen_replacement', 'high', 1, 130000, 130000, 130000, 'https://jiji.ng/ikeja/11-phone-screens/apple'),
  ('iPhone 7', 'battery_replacement', 'standard', 1, 10000, 10000, 10000, 'https://jiji.ng/11-mobile-phone-batteries/apple-iphone-7'),
  ('iPhone 7 Plus', 'battery_replacement', 'standard', 2, 12000, 13500, 15000, 'https://jiji.ng/11-mobile-phone-batteries/apple-iphone-7'),
  ('iPhone X', 'battery_replacement', 'standard', 3, 15000, 15000, 18000, 'https://jiji.ng/11-mobile-phone-batteries/apple-iphone-x'),
  ('iPhone X', 'battery_replacement', 'premium', 1, 12000, 12000, 12000, 'https://jiji.ng/11-mobile-phone-batteries/apple-iphone-x'),
  ('iPhone 11', 'battery_replacement', 'premium', 1, 16000, 16000, 16000, 'https://jiji.ng/11-mobile-phone-batteries/apple-iphone-11'),
  ('iPhone 12', 'battery_replacement', 'standard', 1, 22000, 22000, 22000, 'https://jiji.ng/11-mobile-phone-batteries/apple-iphone-12'),
  ('iPhone 12', 'battery_replacement', 'premium', 1, 15000, 15000, 15000, 'https://jiji.ng/11-mobile-phone-batteries/apple-iphone-12'),
  ('iPhone 13', 'battery_replacement', 'premium', 2, 15000, 16500, 18000, 'https://jiji.ng/11-mobile-phone-batteries/apple-iphone-13')
) AS v(model, cat, grade, n, lo, med, hi, url)
JOIN public.device_models m ON m.device_type = 'smartphone' AND m.brand = 'iphone' AND m.name = v.model
ON CONFLICT DO NOTHING;

-- Approved starting prices: your own figures (iPhone X screen, iPhone 7 battery) and
-- Jiji medians where the grades were consistent. Never overwrites later edits.
INSERT INTO public.part_prices (model_id, category, grade, price_kobo, market_label, source)
SELECT m.id, v.cat, v.grade::public.part_grade, v.naira * 100, v.label, v.src
FROM (VALUES
  ('iPhone X', 'screen_replacement', 'standard', 14000, 'Incell', 'admin'),
  ('iPhone X', 'screen_replacement', 'high', 25000, 'JK', 'admin'),
  ('iPhone X', 'screen_replacement', 'premium', 37000, 'GX OLED', 'admin'),
  ('iPhone 13 Pro Max', 'screen_replacement', 'standard', 45000, 'Incell', 'jiji'),
  ('iPhone 13 Pro Max', 'screen_replacement', 'high', 62500, 'Soft OLED', 'jiji'),
  ('iPhone 13 Pro Max', 'screen_replacement', 'premium', 85000, 'GX OLED', 'jiji'),
  ('iPhone 7', 'battery_replacement', 'standard', 8000, NULL, 'admin'),
  ('iPhone X', 'battery_replacement', 'standard', 15000, NULL, 'jiji')
) AS v(model, cat, grade, naira, label, src)
JOIN public.device_models m ON m.device_type = 'smartphone' AND m.brand = 'iphone' AND m.name = v.model
ON CONFLICT (model_id, category, grade) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Pricing helpers
-- ---------------------------------------------------------------------------
-- UrbanFix's share: base + a small % of the part price, rounded up, capped.
CREATE OR REPLACE FUNCTION public._platform_fee(p_part_kobo int, p_repeat boolean) RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.settings; v numeric;
BEGIN
  SELECT * INTO s FROM public.settings WHERE id = 1;
  v := s.fee_base_kobo + coalesce(p_part_kobo, 0)::numeric * s.fee_rate_bps / 10000;
  IF p_repeat THEN v := v * (10000 - s.repeat_fee_discount_bps) / 10000; END IF;
  v := ceil(v / s.fee_round_kobo) * s.fee_round_kobo;
  RETURN least(v, s.fee_cap_kobo)::int;
END $$;

CREATE OR REPLACE FUNCTION public._grade_or_null(p text) RETURNS public.part_grade
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p IS NULL OR p = '' THEN RETURN NULL; END IF;
  IF p NOT IN ('standard', 'high', 'premium') THEN PERFORM public._fail('Choose a part quality.'); END IF;
  RETURN p::public.part_grade;
END $$;

-- Grades for a model and repair, with the approved part price (NULL = not priced yet).
CREATE OR REPLACE FUNCTION public.grade_options(p_model_id bigint, p_category text)
RETURNS TABLE (grade public.part_grade, label text, description text, warranty_days int, market_label text,
               part_kobo int, price_updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public._uid();
  RETURN QUERY
  SELECT g.grade, g.label, g.description, g.warranty_days, pp.market_label, pp.price_kobo, pp.updated_at
  FROM public.part_grades g
  LEFT JOIN public.part_prices pp ON pp.model_id = p_model_id AND pp.category = p_category AND pp.grade = g.grade
  ORDER BY g.sort_order;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Booking
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.find_technicians(text, text);
CREATE OR REPLACE FUNCTION public.find_technicians(p_device_type text, p_category text, p_model_id bigint DEFAULT NULL, p_grade text DEFAULT NULL)
RETURNS TABLE (
  technician_id uuid, full_name text, shop_name text, area text, shop_address text, bio text,
  part_kobo int, service_charge_kobo int, total_kobo int, part_pending boolean,
  rating numeric, reviews int, jobs_done int, used_before boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._uid();
  v_grade public.part_grade := public._grade_or_null(p_grade);
  v_mode text;
  v_part int;
BEGIN
  SELECT part_mode INTO v_mode FROM public.repair_options WHERE device_type = p_device_type AND category = p_category;
  IF v_mode = 'catalog' AND p_model_id IS NOT NULL AND v_grade IS NOT NULL THEN
    SELECT price_kobo INTO v_part FROM public.part_prices WHERE model_id = p_model_id AND category = p_category AND grade = v_grade;
  END IF;
  RETURN QUERY
  WITH t AS (
    SELECT tc.id, pr.full_name, tc.shop_name, tc.area, tc.shop_address, tc.bio, s.price_kobo AS labour,
           EXISTS (SELECT 1 FROM public.jobs j WHERE j.technician_id = tc.id AND j.customer_id = v_uid AND j.status = 'completed') AS repeat
    FROM public.technicians tc
    JOIN public.profiles pr ON pr.id = tc.id
    JOIN public.services s ON s.technician_id = tc.id AND s.device_type = p_device_type AND s.category = p_category AND s.is_active
    WHERE tc.status = 'approved' AND tc.is_available AND tc.id <> v_uid
  )
  SELECT t.id, t.full_name, t.shop_name, t.area, t.shop_address, t.bio,
         coalesce(v_part, 0),
         t.labour + public._platform_fee(coalesce(v_part, 0), t.repeat),
         coalesce(v_part, 0) + t.labour + public._platform_fee(coalesce(v_part, 0), t.repeat),
         (v_mode <> 'none' AND v_part IS NULL),
         (SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r WHERE r.technician_id = t.id),
         (SELECT count(*)::int FROM public.reviews r WHERE r.technician_id = t.id),
         (SELECT count(*)::int FROM public.jobs j WHERE j.technician_id = t.id AND j.status = 'completed'),
         t.repeat
  FROM t
  ORDER BY 14 DESC, 11 DESC NULLS LAST, 9 ASC
  LIMIT 50;
END $$;

DROP FUNCTION IF EXISTS public.create_job(uuid, text, text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.create_job(
  p_technician_id uuid, p_device_type text, p_brand text, p_model_id bigint, p_model_text text,
  p_category text, p_grade text, p_issue_note text, p_service_mode text, p_address text
) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._require_role('customer');
  v_note text := public._clean(p_issue_note);
  v_addr text := public._clean(p_address);
  v_model_text text := public._clean(p_model_text);
  v_grade public.part_grade := public._grade_or_null(p_grade);
  v_mode public.service_mode;
  v_brand public.device_brands;
  v_model public.device_models;
  ro public.repair_options;
  t public.technicians;
  s public.services;
  pp public.part_prices;
  v_repeat boolean;
  v_part int := 0;
  v_pending boolean := false;
  v_fee int;
  v_code text;
  v_warranty int := 7;
  j public.jobs;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF p_service_mode IS NULL OR p_service_mode NOT IN ('visit', 'drop_off') THEN
    PERFORM public._fail('Choose whether the technician comes to you or you drop it off.');
  END IF;
  v_mode := p_service_mode::public.service_mode;
  IF v_mode = 'visit' AND (v_addr IS NULL OR char_length(v_addr) NOT BETWEEN 10 AND 200) THEN
    PERFORM public._fail('Enter the address the technician should come to (at least 10 characters).');
  END IF;
  IF v_mode = 'drop_off' THEN v_addr := NULL; END IF;
  IF v_note IS NOT NULL AND char_length(v_note) > 500 THEN PERFORM public._fail('Keep the description under 500 characters.'); END IF;

  SELECT * INTO v_brand FROM public.device_brands WHERE device_type = p_device_type AND brand = p_brand;
  IF NOT FOUND THEN PERFORM public._fail('Choose your device brand.'); END IF;
  IF p_model_id IS NOT NULL THEN
    SELECT * INTO v_model FROM public.device_models WHERE id = p_model_id AND is_active;
    IF NOT FOUND OR v_model.device_type <> p_device_type OR v_model.brand <> p_brand THEN PERFORM public._fail('Choose your model from the list.'); END IF;
  ELSIF v_model_text IS NULL OR char_length(v_model_text) NOT BETWEEN 2 AND 60 THEN
    PERFORM public._fail('Type your model name (2 to 60 characters).');
  END IF;

  SELECT * INTO ro FROM public.repair_options WHERE device_type = p_device_type AND category = p_category;
  IF NOT FOUND THEN PERFORM public._fail('Choose what''s wrong with the device.'); END IF;
  IF ro.part_mode = 'none' THEN v_grade := NULL;
  ELSIF v_grade IS NULL THEN PERFORM public._fail('Choose a part quality.');
  END IF;

  SELECT * INTO t FROM public.technicians WHERE id = p_technician_id;
  IF NOT FOUND OR t.status <> 'approved' OR NOT t.is_available THEN
    PERFORM public._fail('This technician isn''t taking jobs right now. Pick another one.');
  END IF;
  SELECT * INTO s FROM public.services
  WHERE technician_id = p_technician_id AND device_type = p_device_type AND category = p_category AND is_active;
  IF NOT FOUND THEN PERFORM public._fail('This technician doesn''t offer that repair.'); END IF;

  IF (SELECT count(*) FROM public.jobs WHERE customer_id = v_uid
      AND status IN ('requested', 'accepted', 'quoted', 'payment_submitted')) >= 3 THEN
    PERFORM public._fail('You have 3 repairs waiting. Finish or cancel one first.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.jobs WHERE customer_id = v_uid AND technician_id = p_technician_id
             AND device_type = p_device_type AND category = p_category
             AND status IN ('requested', 'accepted', 'quoted', 'payment_submitted')) THEN
    PERFORM public._fail('You already have this request open with this technician.');
  END IF;
  IF (SELECT count(*) FROM public.jobs WHERE customer_id = v_uid AND created_at > now() - interval '24 hours') >= 10 THEN
    PERFORM public._fail('Too many bookings today. Try again tomorrow.');
  END IF;

  IF v_grade IS NOT NULL THEN
    SELECT warranty_days INTO v_warranty FROM public.part_grades WHERE grade = v_grade;
    IF ro.part_mode = 'catalog' AND p_model_id IS NOT NULL THEN
      SELECT * INTO pp FROM public.part_prices WHERE model_id = p_model_id AND category = p_category AND grade = v_grade;
    END IF;
    IF pp.price_kobo IS NOT NULL THEN v_part := pp.price_kobo; ELSE v_pending := true; END IF;
  END IF;

  v_repeat := EXISTS (SELECT 1 FROM public.jobs WHERE customer_id = v_uid AND technician_id = p_technician_id AND status = 'completed');
  v_fee := public._platform_fee(v_part, v_repeat);

  LOOP
    v_code := 'UF-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.jobs WHERE code = v_code);
  END LOOP;

  INSERT INTO public.jobs (code, customer_id, technician_id, device_type, category, brand, model, model_id, issue_note,
                           service_mode, address, grade, part_label, part_kobo, part_pending, labour_kobo,
                           price_kobo, commission_kobo, payout_kobo, estimate_kobo, is_repeat, warranty_days)
  VALUES (v_code, v_uid, p_technician_id, p_device_type, p_category, v_brand.label,
          coalesce(v_model.name, v_model_text), p_model_id, v_note, v_mode, v_addr,
          v_grade, pp.market_label, v_part, v_pending, s.price_kobo,
          v_part + s.price_kobo + v_fee, v_fee, v_part + s.price_kobo, v_part + s.price_kobo + v_fee, v_repeat, v_warranty)
  RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'customer', NULL, 'requested', NULL);
  RETURN j;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Technician checks the device and confirms the price (before payment)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.record_intake(uuid, text, text, text[]);
CREATE OR REPLACE FUNCTION public.record_intake(
  p_job_id uuid, p_identifier text, p_notes text, p_photos text[],
  p_model_id bigint DEFAULT NULL, p_model_text text DEFAULT NULL, p_category text DEFAULT NULL,
  p_grade text DEFAULT NULL, p_part_kobo bigint DEFAULT NULL
) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._require_role('technician');
  j public.jobs;
  v_id text;
  v_notes text := public._clean(p_notes);
  v_model_text text := public._clean(p_model_text);
  v_cat text;
  v_grade public.part_grade;
  v_model public.device_models;
  ro public.repair_options;
  s public.services;
  pp public.part_prices;
  v_labour int;
  v_part int := 0;
  v_label text;
  v_fee int;
  v_warranty int := 7;
  v_max int := (SELECT max_quote_part_kobo FROM public.settings WHERE id = 1);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'technician');
  PERFORM public._expect(j, 'accepted', 'paid');
  v_id := public._normalize_identifier(p_identifier);
  IF v_notes IS NOT NULL AND char_length(v_notes) > 500 THEN PERFORM public._fail('Keep notes under 500 characters.'); END IF;

  -- Jobs paid before this update keep their price and go straight to repair.
  IF j.status = 'paid' THEN
    UPDATE public.jobs SET status = 'in_repair', intake_identifier = v_id, intake_notes = v_notes,
           intake_photos = public._check_job_photos(j.id, v_uid, p_photos), intake_at = now()
    WHERE id = j.id RETURNING * INTO j;
    PERFORM public._log(j.id, v_uid, 'technician', 'paid', 'in_repair', NULL);
    RETURN j;
  END IF;

  -- Model: from the list (same device type), or typed for unlisted models.
  IF p_model_id IS NOT NULL THEN
    SELECT * INTO v_model FROM public.device_models WHERE id = p_model_id AND is_active;
    IF NOT FOUND OR v_model.device_type <> j.device_type THEN PERFORM public._fail('Choose the device model from the list.'); END IF;
  ELSIF v_model_text IS NOT NULL THEN
    IF char_length(v_model_text) NOT BETWEEN 2 AND 60 THEN PERFORM public._fail('Model name must be 2 to 60 characters.'); END IF;
  ELSIF j.model_id IS NOT NULL THEN
    SELECT * INTO v_model FROM public.device_models WHERE id = j.model_id;
  END IF;

  -- Problem: may change after checking, but only to repairs this technician offers.
  v_cat := coalesce(nullif(p_category, ''), j.category);
  SELECT * INTO ro FROM public.repair_options WHERE device_type = j.device_type AND category = v_cat;
  IF NOT FOUND THEN PERFORM public._fail('Unknown repair type.'); END IF;
  IF v_cat = j.category THEN
    v_labour := j.labour_kobo;  -- the repair fee shown at booking is locked
  ELSE
    SELECT * INTO s FROM public.services WHERE technician_id = v_uid AND device_type = j.device_type AND category = v_cat AND is_active;
    IF NOT FOUND THEN PERFORM public._fail('Add this repair to your prices first (Account → Shop, prices, bank and ID).'); END IF;
    v_labour := s.price_kobo;
  END IF;

  -- Part: approved price list first; otherwise the technician's price, within limits.
  v_grade := public._grade_or_null(coalesce(nullif(p_grade, ''), j.grade::text));
  IF ro.part_mode = 'none' THEN
    v_grade := NULL;
  ELSE
    IF ro.part_mode = 'catalog' AND v_model.id IS NOT NULL AND v_grade IS NOT NULL THEN
      SELECT * INTO pp FROM public.part_prices WHERE model_id = v_model.id AND category = v_cat AND grade = v_grade;
    END IF;
    IF pp.price_kobo IS NOT NULL THEN
      v_part := pp.price_kobo; v_label := pp.market_label;
    ELSE
      IF p_part_kobo IS NULL THEN PERFORM public._fail('Enter the part price.'); END IF;
      IF p_part_kobo = 0 THEN
        v_grade := NULL;  -- no part needed after all
      ELSE
        IF v_grade IS NULL THEN PERFORM public._fail('Choose the part quality.'); END IF;
        IF p_part_kobo < 50000 OR p_part_kobo > v_max OR p_part_kobo % 100 <> 0 THEN
          PERFORM public._fail('Part price must be whole naira between ₦500 and ₦' || to_char(v_max / 100, 'FM999,999,999') || '.');
        END IF;
        v_part := p_part_kobo::int; v_label := 'Priced by technician';
      END IF;
    END IF;
  END IF;
  IF v_grade IS NOT NULL THEN SELECT warranty_days INTO v_warranty FROM public.part_grades WHERE grade = v_grade; END IF;

  v_fee := public._platform_fee(v_part, j.is_repeat);
  UPDATE public.jobs SET status = 'quoted', intake_identifier = v_id, intake_notes = v_notes,
         intake_photos = public._check_job_photos(j.id, v_uid, p_photos), intake_at = now(), quoted_at = now(),
         category = v_cat, model_id = v_model.id, model = coalesce(v_model.name, v_model_text, j.model),
         grade = v_grade, part_label = v_label, part_kobo = v_part, part_pending = false, labour_kobo = v_labour,
         commission_kobo = v_fee, price_kobo = v_part + v_labour + v_fee, payout_kobo = v_part + v_labour,
         price_confirmed = true, warranty_days = v_warranty, status_note = NULL
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'technician', 'accepted', 'quoted', 'Price confirmed: ₦' || to_char(j.price_kobo / 100, 'FM999,999,999'));
  RETURN j;
END $$;

CREATE OR REPLACE FUNCTION public.submit_payment(p_job_id uuid, p_reference text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('customer'); j public.jobs; v_ref text := public._clean(p_reference);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'customer');
  IF j.status = 'accepted' THEN
    PERFORM public._fail('Wait for the technician to check your device and confirm the price before paying.');
  END IF;
  PERFORM public._expect(j, 'quoted');
  IF v_ref IS NULL OR char_length(v_ref) NOT BETWEEN 4 AND 60 THEN
    PERFORM public._fail('Enter the name on the account you paid from, or the transfer reference.');
  END IF;
  UPDATE public.jobs SET status = 'payment_submitted', payment_reference = v_ref, payment_submitted_at = now(), status_note = NULL
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'customer', 'quoted', 'payment_submitted', v_ref);
  RETURN j;
END $$;

CREATE OR REPLACE FUNCTION public.decline_quote(p_job_id uuid, p_reason text DEFAULT NULL) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('customer'); j public.jobs; v_reason text := public._clean(p_reason);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'customer');
  PERFORM public._expect(j, 'quoted');
  IF v_reason IS NOT NULL AND char_length(v_reason) > 200 THEN PERFORM public._fail('Keep the reason under 200 characters.'); END IF;
  UPDATE public.jobs SET status = 'cancelled', status_note = coalesce('Price declined: ' || v_reason, 'Price declined by customer')
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'customer', 'quoted', 'cancelled', 'Price declined. Device to be returned.');
  RETURN j;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_job(p_job_id uuid, p_reason text DEFAULT NULL) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._uid();
  v_role public.user_role := public._role(v_uid);
  v_reason text := public._clean(p_reason);
  j public.jobs;
  v_from public.job_status;
BEGIN
  IF v_reason IS NOT NULL AND char_length(v_reason) > 200 THEN PERFORM public._fail('Keep the reason under 200 characters.'); END IF;
  IF v_role = 'customer' THEN
    j := public._lock_job(p_job_id, v_uid, 'customer');
    IF j.status = 'payment_submitted' THEN
      PERFORM public._fail('You''ve already sent payment. Raise an issue and UrbanFix will refund you.');
    END IF;
    PERFORM public._expect(j, 'requested', 'accepted', 'quoted');
  ELSIF v_role = 'technician' THEN
    j := public._lock_job(p_job_id, v_uid, 'technician');
    PERFORM public._expect(j, 'accepted', 'quoted');
    IF v_reason IS NULL OR char_length(v_reason) < 5 THEN PERFORM public._fail('Tell the customer why you are cancelling.'); END IF;
  ELSIF v_role = 'admin' THEN
    j := public._lock_job(p_job_id, v_uid, 'admin');
    PERFORM public._expect(j, 'requested', 'accepted', 'quoted', 'payment_submitted');
  ELSE
    PERFORM public._fail('Finish setting up your account first.');
  END IF;
  v_from := j.status;
  UPDATE public.jobs SET status = 'cancelled', status_note = v_reason WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, v_role::text, v_from, 'cancelled', v_reason);
  RETURN j;
END $$;

-- ---------------------------------------------------------------------------
-- 10. Payment, part money, repair, confirmation, warranty
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_confirm_payment(p_job_id uuid) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); j public.jobs; v_to public.job_status;
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'admin');
  PERFORM public._expect(j, 'payment_submitted');
  -- Device already checked in → repair starts and the part money is due to the technician.
  v_to := CASE WHEN j.intake_at IS NOT NULL THEN 'in_repair'::public.job_status ELSE 'paid'::public.job_status END;
  UPDATE public.jobs SET status = v_to, paid_at = now(), status_note = NULL,
         part_payout_status = CASE WHEN j.intake_at IS NOT NULL AND j.part_kobo > 0 THEN 'due'::public.payout_status ELSE part_payout_status END
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'admin', 'payment_submitted', v_to, NULL);
  RETURN j;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reject_payment(p_job_id uuid, p_note text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); j public.jobs; v_note text := public._clean(p_note); v_to public.job_status;
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'admin');
  PERFORM public._expect(j, 'payment_submitted');
  IF v_note IS NULL OR char_length(v_note) NOT BETWEEN 5 AND 300 THEN PERFORM public._fail('Tell the customer what''s wrong with the payment.'); END IF;
  v_to := CASE WHEN j.price_confirmed THEN 'quoted'::public.job_status ELSE 'accepted'::public.job_status END;
  UPDATE public.jobs SET status = v_to, status_note = v_note, payment_reference = NULL, payment_submitted_at = NULL
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'admin', 'payment_submitted', v_to, v_note);
  RETURN j;
END $$;

CREATE OR REPLACE FUNCTION public.admin_mark_part_payout_paid(p_job_id uuid, p_reference text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); j public.jobs; v_ref text := public._clean(p_reference);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'admin');
  IF j.part_payout_status <> 'due' THEN PERFORM public._fail('No part money is due on this repair.'); END IF;
  IF v_ref IS NULL OR char_length(v_ref) NOT BETWEEN 4 AND 60 THEN PERFORM public._fail('Enter the transfer reference.'); END IF;
  UPDATE public.jobs SET part_payout_status = 'paid', part_payout_reference = v_ref, part_payout_at = now()
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'admin', j.status, j.status, 'Part money sent: ' || v_ref);
  RETURN j;
END $$;

CREATE OR REPLACE FUNCTION public.mark_ready(p_job_id uuid, p_repair_notes text, p_parts_replaced text, p_photos text[]) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._require_role('technician');
  j public.jobs;
  v_notes text := public._clean(p_repair_notes);
  v_parts text := public._clean(p_parts_replaced);
  v_from public.job_status;
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'technician');
  PERFORM public._expect(j, 'in_repair', 'warranty');
  IF v_notes IS NULL OR char_length(v_notes) NOT BETWEEN 5 AND 500 THEN PERFORM public._fail('Describe what you fixed (at least 5 characters).'); END IF;
  IF v_parts IS NOT NULL AND char_length(v_parts) > 300 THEN PERFORM public._fail('Keep the parts list under 300 characters.'); END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_photos) x WHERE x = ANY (j.intake_photos) OR x = ANY (j.completion_photos)) THEN
    PERFORM public._fail('Use new photos of the repaired device.');
  END IF;
  v_from := j.status;
  IF j.status = 'warranty' THEN
    UPDATE public.jobs SET status = 'awaiting_confirmation', warranty_notes = v_notes,
           warranty_photos = public._check_job_photos(j.id, v_uid, p_photos), warranty_done_at = now(), ready_at = now()
    WHERE id = j.id RETURNING * INTO j;
  ELSE
    UPDATE public.jobs SET status = 'awaiting_confirmation', repair_notes = v_notes, parts_replaced = coalesce(v_parts, 'None'),
           completion_photos = public._check_job_photos(j.id, v_uid, p_photos), ready_at = now()
    WHERE id = j.id RETURNING * INTO j;
  END IF;
  PERFORM public._log(j.id, v_uid, 'technician', v_from, 'awaiting_confirmation', NULL);
  RETURN j;
END $$;

-- Finishing a job: first completion starts the warranty and makes the repair fee due.
CREATE OR REPLACE FUNCTION public._complete(j public.jobs, p_by text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.jobs;
BEGIN
  IF j.warranty_claimed_at IS NULL THEN
    UPDATE public.jobs SET status = 'completed', completed_at = now(), completed_by = p_by, payout_status = 'due',
           warranty_until = now() + make_interval(days => j.warranty_days)
    WHERE id = j.id RETURNING * INTO r;
  ELSE
    UPDATE public.jobs SET status = 'completed' WHERE id = j.id RETURNING * INTO r;  -- warranty fix accepted
  END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_completion(p_job_id uuid) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('customer'); j public.jobs;
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'customer');
  PERFORM public._expect(j, 'awaiting_confirmation');
  j := public._complete(j, 'customer');
  PERFORM public._log(j.id, v_uid, 'customer', 'awaiting_confirmation', 'completed', NULL);
  RETURN j;
END $$;

CREATE OR REPLACE FUNCTION public._auto_release() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.jobs; n int := 0; v_hours int := (SELECT auto_release_hours FROM public.settings WHERE id = 1);
BEGIN
  FOR r IN SELECT * FROM public.jobs
           WHERE status = 'awaiting_confirmation' AND ready_at < now() - make_interval(hours => v_hours)
           FOR UPDATE SKIP LOCKED LOOP
    PERFORM public._complete(r, 'auto');
    PERFORM public._log(r.id, NULL, 'system', 'awaiting_confirmation', 'completed', 'Auto-released after ' || v_hours || ' hours');
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.claim_warranty(p_job_id uuid, p_reason text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('customer'); j public.jobs; v_reason text := public._clean(p_reason);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'customer');
  PERFORM public._expect(j, 'completed');
  IF j.warranty_claimed_at IS NOT NULL THEN PERFORM public._fail('You''ve already used the warranty on this repair. Contact UrbanFix support.'); END IF;
  IF j.warranty_until IS NULL OR j.warranty_until < now() THEN PERFORM public._fail('The warranty on this repair has ended.'); END IF;
  IF v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 10 AND 500 THEN PERFORM public._fail('Tell us what went wrong (at least 10 characters).'); END IF;
  UPDATE public.jobs SET status = 'warranty', warranty_reason = v_reason, warranty_claimed_at = now()
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'customer', 'completed', 'warranty', v_reason);
  RETURN j;
END $$;

CREATE OR REPLACE FUNCTION public.raise_dispute(p_job_id uuid, p_reason text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('customer'); j public.jobs; v_reason text := public._clean(p_reason); v_from public.job_status;
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'customer');
  PERFORM public._expect(j, 'payment_submitted', 'paid', 'in_repair', 'awaiting_confirmation', 'warranty');
  IF v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 10 AND 500 THEN
    PERFORM public._fail('Tell us what went wrong (at least 10 characters).');
  END IF;
  v_from := j.status;
  UPDATE public.jobs SET status = 'disputed', dispute_reason = v_reason, disputed_at = now()
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'customer', v_from, 'disputed', v_reason);
  RETURN j;
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(p_job_id uuid, p_outcome text, p_note text, p_refund_reference text DEFAULT NULL)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); j public.jobs; v_note text := public._clean(p_note); v_ref text := public._clean(p_refund_reference);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'admin');
  PERFORM public._expect(j, 'disputed');
  IF v_note IS NULL OR char_length(v_note) NOT BETWEEN 5 AND 500 THEN PERFORM public._fail('Explain the decision (5 to 500 characters).'); END IF;
  IF p_outcome = 'release' THEN
    j := public._complete(j, 'admin');
    UPDATE public.jobs SET status_note = v_note WHERE id = j.id RETURNING * INTO j;
    PERFORM public._log(j.id, v_uid, 'admin', 'disputed', 'completed', v_note);
  ELSIF p_outcome = 'refund' THEN
    IF v_ref IS NULL OR char_length(v_ref) < 4 THEN PERFORM public._fail('Enter the refund transfer reference.'); END IF;
    -- Money already sent to the technician stays recorded as sent (recover it offline).
    UPDATE public.jobs SET status = 'refunded', refund_reference = v_ref, status_note = v_note,
           payout_status = CASE WHEN payout_status = 'paid' THEN 'paid'::public.payout_status ELSE 'not_due'::public.payout_status END,
           part_payout_status = CASE WHEN part_payout_status = 'paid' THEN 'paid'::public.payout_status ELSE 'not_due'::public.payout_status END
    WHERE id = j.id RETURNING * INTO j;
    PERFORM public._log(j.id, v_uid, 'admin', 'disputed', 'refunded', v_note);
  ELSE
    PERFORM public._fail('Choose release or refund.');
  END IF;
  RETURN j;
END $$;

CREATE OR REPLACE FUNCTION public.admin_mark_payout_paid(p_job_id uuid, p_reference text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); j public.jobs; v_ref text := public._clean(p_reference);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'admin');
  PERFORM public._expect(j, 'completed', 'warranty');
  IF j.payout_status <> 'due' THEN PERFORM public._fail('This payout isn''t due.'); END IF;
  IF v_ref IS NULL OR char_length(v_ref) NOT BETWEEN 4 AND 60 THEN PERFORM public._fail('Enter the transfer reference.'); END IF;
  UPDATE public.jobs SET payout_status = 'paid', payout_reference = v_ref, payout_at = now() WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'admin', j.status, j.status, 'Repair fee sent: ' || v_ref);
  RETURN j;
END $$;

-- Photos can be added while checking the device, repairing it, or fixing it under warranty.
CREATE OR REPLACE FUNCTION public.storage_can_upload_job_photo(p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = public._safe_uuid(split_part(p_name, '/', 1))
      AND j.technician_id = auth.uid()
      AND j.status::text IN ('accepted', 'paid', 'in_repair', 'warranty')
  ) AND p_name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png)$'
$$;

-- ---------------------------------------------------------------------------
-- 11. What each person sees
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_job(p_job_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._uid();
  j public.jobs;
  v_admin boolean := public.is_admin();
  v_role text;
  v_share boolean;
  v_job jsonb;
  c public.profiles; tp public.profiles; t public.technicians; g public.part_grades;
BEGIN
  SELECT * INTO j FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND OR NOT (j.customer_id = v_uid OR j.technician_id = v_uid OR v_admin) THEN
    PERFORM public._fail('Repair not found.');
  END IF;
  v_role := CASE WHEN j.customer_id = v_uid THEN 'customer' WHEN j.technician_id = v_uid THEN 'technician' ELSE 'admin' END;
  -- Phones are shared once the technician accepts, so they can arrange collection.
  v_share := v_admin OR j.status::text IN ('accepted', 'quoted', 'payment_submitted', 'paid', 'in_repair', 'awaiting_confirmation', 'disputed', 'warranty');
  SELECT * INTO c FROM public.profiles WHERE id = j.customer_id;
  SELECT * INTO tp FROM public.profiles WHERE id = j.technician_id;
  SELECT * INTO t FROM public.technicians WHERE id = j.technician_id;
  SELECT * INTO g FROM public.part_grades WHERE grade = j.grade;

  v_job := to_jsonb(j);
  IF v_role = 'customer' THEN
    -- Customers see the part and one "service charge"; not how it's split.
    v_job := v_job - 'labour_kobo' - 'commission_kobo' - 'payout_kobo' - 'payout_reference' - 'part_payout_reference'
                   - 'payout_status' - 'part_payout_status';
  ELSIF v_role = 'technician' THEN
    v_job := v_job - 'commission_kobo';
  END IF;

  RETURN jsonb_build_object(
    'job', v_job,
    'viewer_role', v_role,
    'breakdown', jsonb_build_object(
      'part_kobo', j.part_kobo, 'part_pending', j.part_pending, 'part_label', j.part_label,
      'grade', j.grade, 'grade_label', g.label, 'grade_description', g.description,
      'service_charge_kobo', j.labour_kobo + j.commission_kobo, 'total_kobo', j.price_kobo,
      'estimate_kobo', j.estimate_kobo, 'price_confirmed', j.price_confirmed,
      'warranty_days', j.warranty_days, 'warranty_until', j.warranty_until),
    'customer', jsonb_build_object('name', c.full_name, 'phone', CASE WHEN v_share THEN c.phone END),
    'technician', jsonb_build_object('name', tp.full_name, 'shop_name', t.shop_name, 'shop_address', t.shop_address,
                                     'area', t.area, 'phone', CASE WHEN v_share THEN tp.phone END),
    'events', coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.job_events e WHERE e.job_id = j.id), '[]'::jsonb),
    'review', (SELECT to_jsonb(r) FROM public.reviews r WHERE r.job_id = j.id),
    'payment_account', CASE WHEN j.customer_id = v_uid OR v_admin THEN
        (SELECT jsonb_build_object('bank_name', s.bank_name, 'account_number', s.account_number,
                                   'account_name', s.account_name, 'support_phone', s.support_phone) FROM public.settings s WHERE id = 1) END,
    'auto_release_hours', (SELECT auto_release_hours FROM public.settings WHERE id = 1)
  );
END $$;

CREATE OR REPLACE FUNCTION public.my_earnings() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('technician');
BEGIN
  RETURN jsonb_build_object(
    'paid_kobo', coalesce((SELECT sum(CASE WHEN payout_status = 'paid' THEN labour_kobo ELSE 0 END
                                    + CASE WHEN part_payout_status = 'paid' THEN part_kobo ELSE 0 END)
                           FROM public.jobs WHERE technician_id = v_uid), 0),
    'due_kobo', coalesce((SELECT sum(CASE WHEN payout_status = 'due' THEN labour_kobo ELSE 0 END
                                   + CASE WHEN part_payout_status = 'due' THEN part_kobo ELSE 0 END)
                          FROM public.jobs WHERE technician_id = v_uid), 0),
    'in_escrow_kobo', coalesce((SELECT sum(labour_kobo) FROM public.jobs WHERE technician_id = v_uid
                                AND status::text IN ('paid', 'in_repair', 'awaiting_confirmation', 'disputed')), 0),
    'completed_jobs', (SELECT count(*) FROM public.jobs WHERE technician_id = v_uid AND status = 'completed'),
    'rating', (SELECT round(avg(rating)::numeric, 1) FROM public.reviews WHERE technician_id = v_uid),
    'reviews', (SELECT count(*) FROM public.reviews WHERE technician_id = v_uid)
  );
END $$;

-- ---------------------------------------------------------------------------
-- 12. Admin: prices and models
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_price_board(p_device_type text, p_brand text)
RETURNS TABLE (model_id bigint, model_name text, category text, category_label text, grade public.part_grade, grade_label text,
               price_kobo int, market_label text, source text, updated_at timestamptz, stale boolean,
               obs_count int, obs_low_kobo int, obs_median_kobo int, obs_high_kobo int, obs_url text, obs_date date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_stale int := (SELECT price_stale_days FROM public.settings WHERE id = 1);
BEGIN
  PERFORM public._require_role('admin');
  RETURN QUERY
  SELECT m.id, m.name, ro.category, ro.label, g.grade, g.label, pp.price_kobo, pp.market_label, pp.source, pp.updated_at,
         (pp.updated_at IS NOT NULL AND pp.updated_at < now() - make_interval(days => v_stale)),
         o.sample_size, o.low_kobo, o.median_kobo, o.high_kobo, o.url, o.observed_on
  FROM public.device_models m
  JOIN public.repair_options ro ON ro.device_type = m.device_type AND ro.part_mode = 'catalog'
  CROSS JOIN public.part_grades g
  LEFT JOIN public.part_prices pp ON pp.model_id = m.id AND pp.category = ro.category AND pp.grade = g.grade
  LEFT JOIN LATERAL (SELECT * FROM public.price_observations po
                     WHERE po.model_id = m.id AND po.category = ro.category AND po.grade = g.grade
                     ORDER BY po.observed_on DESC, po.sample_size DESC LIMIT 1) o ON true
  WHERE m.device_type = p_device_type AND m.brand = p_brand AND m.is_active
  ORDER BY m.sort_order DESC, ro.sort_order, g.sort_order;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_part_price(p_model_id bigint, p_category text, p_grade text, p_price_kobo bigint, p_market_label text DEFAULT NULL)
RETURNS public.part_prices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); m public.device_models; v_grade public.part_grade := public._grade_or_null(p_grade);
        v_label text := public._clean(p_market_label); r public.part_prices;
BEGIN
  SELECT * INTO m FROM public.device_models WHERE id = p_model_id;
  IF NOT FOUND THEN PERFORM public._fail('Model not found.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.repair_options WHERE device_type = m.device_type AND category = p_category AND part_mode = 'catalog') THEN
    PERFORM public._fail('That repair isn''t priced from the price list.');
  END IF;
  IF v_grade IS NULL THEN PERFORM public._fail('Choose a part quality.'); END IF;
  IF p_price_kobo IS NULL OR p_price_kobo < 50000 OR p_price_kobo > 500000000 OR p_price_kobo % 100 <> 0 THEN
    PERFORM public._fail('Part price must be whole naira between ₦500 and ₦5,000,000.');
  END IF;
  IF v_label IS NOT NULL AND char_length(v_label) > 40 THEN PERFORM public._fail('Keep the part type under 40 characters.'); END IF;
  INSERT INTO public.part_prices (model_id, category, grade, price_kobo, market_label, source, updated_at, updated_by)
  VALUES (p_model_id, p_category, v_grade, p_price_kobo::int, v_label, 'admin', now(), v_uid)
  ON CONFLICT (model_id, category, grade) DO UPDATE
    SET price_kobo = EXCLUDED.price_kobo, market_label = EXCLUDED.market_label, source = 'admin', updated_at = now(), updated_by = v_uid
  RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_remove_part_price(p_model_id bigint, p_category text, p_grade text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public._require_role('admin');
  DELETE FROM public.part_prices WHERE model_id = p_model_id AND category = p_category AND grade = public._grade_or_null(p_grade);
END $$;

CREATE OR REPLACE FUNCTION public.admin_add_model(p_device_type text, p_brand text, p_name text, p_hint text DEFAULT NULL)
RETURNS public.device_models
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text := public._clean(p_name); v_hint text := public._clean(p_hint); r public.device_models;
BEGIN
  PERFORM public._require_role('admin');
  IF NOT EXISTS (SELECT 1 FROM public.device_brands WHERE device_type = p_device_type AND brand = p_brand) THEN PERFORM public._fail('Unknown brand.'); END IF;
  IF v_name IS NULL OR char_length(v_name) NOT BETWEEN 2 AND 60 THEN PERFORM public._fail('Model name must be 2 to 60 characters.'); END IF;
  IF v_hint IS NOT NULL AND char_length(v_hint) > 120 THEN PERFORM public._fail('Keep the hint under 120 characters.'); END IF;
  IF EXISTS (SELECT 1 FROM public.device_models WHERE device_type = p_device_type AND brand = p_brand AND lower(name) = lower(v_name)) THEN
    PERFORM public._fail('That model is already listed.');
  END IF;
  INSERT INTO public.device_models (device_type, brand, name, hint, sort_order)
  VALUES (p_device_type, p_brand, v_name, v_hint,
          coalesce((SELECT max(sort_order) + 1 FROM public.device_models WHERE device_type = p_device_type AND brand = p_brand), 1))
  RETURNING * INTO r;
  RETURN r;
END $$;

-- Lists: customers get the total only; technicians also get what they earn.
CREATE OR REPLACE FUNCTION public.my_jobs() RETURNS TABLE (
  id uuid, code text, status public.job_status, device_type text, category text, brand text, model text,
  price_kobo int, payout_kobo int, service_mode public.service_mode, other_party text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT j.id, j.code, j.status, j.device_type, j.category, j.brand, j.model, j.price_kobo,
         CASE WHEN j.technician_id = auth.uid() THEN j.payout_kobo END,
         j.service_mode,
         CASE WHEN j.customer_id = auth.uid() THEN coalesce(t.shop_name, tp.full_name) ELSE cp.full_name END,
         j.created_at, j.updated_at
  FROM public.jobs j
  JOIN public.profiles cp ON cp.id = j.customer_id
  JOIN public.profiles tp ON tp.id = j.technician_id
  JOIN public.technicians t ON t.id = j.technician_id
  WHERE j.customer_id = auth.uid() OR j.technician_id = auth.uid()
  ORDER BY j.updated_at DESC
  LIMIT 200
$$;

-- Admin queues. (Direct reads of the jobs table are closed so customers can't see the fee split.)
CREATE OR REPLACE FUNCTION public.admin_list_jobs(p_statuses text[] DEFAULT NULL, p_payout text DEFAULT NULL)
RETURNS SETOF public.jobs
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public._require_role('admin');
  IF p_payout IS NOT NULL AND p_payout NOT IN ('repair_fee', 'part') THEN PERFORM public._fail('Unknown payout type.'); END IF;
  RETURN QUERY
  SELECT * FROM public.jobs j
  WHERE (p_statuses IS NULL OR j.status::text = ANY (p_statuses))
    AND (p_payout IS NULL OR (p_payout = 'repair_fee' AND j.payout_status = 'due') OR (p_payout = 'part' AND j.part_payout_status = 'due'))
  ORDER BY j.updated_at ASC
  LIMIT 200;
END $$;

REVOKE SELECT ON public.jobs FROM authenticated;

-- ---------------------------------------------------------------------------
-- 13. Access
-- ---------------------------------------------------------------------------
ALTER TABLE public.device_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS device_brands_read ON public.device_brands;
CREATE POLICY device_brands_read ON public.device_brands FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS device_models_read ON public.device_models;
CREATE POLICY device_models_read ON public.device_models FOR SELECT TO authenticated USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS part_grades_read ON public.part_grades;
CREATE POLICY part_grades_read ON public.part_grades FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS part_prices_read ON public.part_prices;
CREATE POLICY part_prices_read ON public.part_prices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS price_observations_read ON public.price_observations;
CREATE POLICY price_observations_read ON public.price_observations FOR SELECT TO authenticated USING (public.is_admin());

REVOKE ALL ON public.device_brands, public.device_models, public.part_grades, public.part_prices, public.price_observations
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.device_brands, public.device_models, public.part_grades, public.part_prices, public.price_observations TO authenticated;
GRANT ALL ON public.device_brands, public.device_models, public.part_grades, public.part_prices, public.price_observations TO service_role;

-- Internal helpers: nobody calls these from the app.
REVOKE ALL ON FUNCTION public._platform_fee(int, boolean), public._grade_or_null(text), public._complete(public.jobs, text)
  FROM PUBLIC, anon, authenticated;

-- App functions (new or re-created with new arguments).
REVOKE ALL ON FUNCTION
  public.grade_options(bigint, text), public.find_technicians(text, text, bigint, text),
  public.create_job(uuid, text, text, bigint, text, text, text, text, text, text),
  public.record_intake(uuid, text, text, text[], bigint, text, text, text, bigint),
  public.decline_quote(uuid, text), public.claim_warranty(uuid, text), public.admin_mark_part_payout_paid(uuid, text),
  public.admin_price_board(text, text), public.admin_set_part_price(bigint, text, text, bigint, text),
  public.admin_remove_part_price(bigint, text, text), public.admin_add_model(text, text, text, text),
  public.admin_list_jobs(text[], text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.grade_options(bigint, text), public.find_technicians(text, text, bigint, text),
  public.create_job(uuid, text, text, bigint, text, text, text, text, text, text),
  public.record_intake(uuid, text, text, text[], bigint, text, text, text, bigint),
  public.decline_quote(uuid, text), public.claim_warranty(uuid, text), public.admin_mark_part_payout_paid(uuid, text),
  public.admin_price_board(text, text), public.admin_set_part_price(bigint, text, text, bigint, text),
  public.admin_remove_part_price(bigint, text, text), public.admin_add_model(text, text, text, text),
  public.admin_list_jobs(text[], text)
TO authenticated;

NOTIFY pgrst, 'reload schema';
