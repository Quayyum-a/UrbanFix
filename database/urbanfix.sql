-- =============================================================================
-- UrbanFix database: full rebuild
--
-- Run this whole file once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It DROPS the public schema and everything in it, then rebuilds it.
-- Only run it on a project whose data you are happy to lose.
--
-- Security model
--   * Clients (the app) can only SELECT, and only rows they are entitled to (RLS).
--   * Every write goes through a SECURITY DEFINER function below that checks
--     who is calling, what state the job is in, and validates all input.
--   * Prices, commission and payouts are computed here, never sent by the app.
--   * Job photos and ID documents are write-once (no update/delete policies),
--     so intake and repair evidence cannot be swapped after the fact.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Reset
-- ---------------------------------------------------------------------------
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- Remove every existing storage policy (old ones were permissive).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Types
-- ---------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('customer', 'technician', 'admin');
CREATE TYPE public.tech_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.job_status AS ENUM (
  'requested',             -- customer booked, waiting for technician
  'accepted',              -- technician accepted, waiting for customer payment
  'declined',              -- technician declined (terminal)
  'cancelled',             -- cancelled before payment (terminal)
  'payment_submitted',     -- customer says they transferred, admin to confirm
  'paid',                  -- admin confirmed, money held in escrow
  'in_repair',             -- technician recorded device intake
  'awaiting_confirmation', -- technician finished, customer to confirm
  'completed',             -- customer confirmed (or auto/admin release); payout due
  'disputed',              -- customer raised an issue, escrow frozen
  'refunded'               -- admin refunded customer (terminal)
);
CREATE TYPE public.service_mode AS ENUM ('visit', 'drop_off');
CREATE TYPE public.payout_status AS ENUM ('not_due', 'due', 'paid');

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 80),
  phone text NOT NULL UNIQUE CHECK (phone ~ '^\+234[789][01][0-9]{8}$'),
  area text CHECK (area IS NULL OR char_length(area) BETWEEN 2 AND 60),
  address text CHECK (address IS NULL OR char_length(address) BETWEEN 10 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.technicians (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_name text CHECK (shop_name IS NULL OR char_length(shop_name) BETWEEN 2 AND 80),
  shop_address text CHECK (shop_address IS NULL OR char_length(shop_address) BETWEEN 10 AND 200),
  area text CHECK (area IS NULL OR char_length(area) BETWEEN 2 AND 60),
  bio text CHECK (bio IS NULL OR char_length(bio) <= 300),
  status public.tech_status NOT NULL DEFAULT 'draft',
  status_reason text CHECK (status_reason IS NULL OR char_length(status_reason) <= 300),
  is_available boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT available_only_when_approved CHECK (NOT is_available OR status = 'approved')
);

-- Bank and identity details: visible only to the technician and admins.
CREATE TABLE public.technician_private (
  id uuid PRIMARY KEY REFERENCES public.technicians(id) ON DELETE CASCADE,
  bank_name text CHECK (bank_name IS NULL OR char_length(bank_name) BETWEEN 2 AND 60),
  account_number text CHECK (account_number IS NULL OR account_number ~ '^[0-9]{10}$'),
  account_name text CHECK (account_name IS NULL OR char_length(account_name) BETWEEN 2 AND 80),
  nin text CHECK (nin IS NULL OR nin ~ '^[0-9]{11}$'),
  id_document_path text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.repair_options (
  device_type text NOT NULL,
  category text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (device_type, category)
);

CREATE TABLE public.services (
  technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  device_type text NOT NULL,
  category text NOT NULL,
  price_kobo integer NOT NULL CHECK (price_kobo BETWEEN 50000 AND 500000000), -- ₦500 to ₦5,000,000
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (technician_id, device_type, category),
  FOREIGN KEY (device_type, category) REFERENCES public.repair_options(device_type, category)
);

CREATE TABLE public.settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  support_phone text,
  commission_bps int NOT NULL DEFAULT 1000 CHECK (commission_bps BETWEEN 0 AND 5000),
  repeat_commission_bps int NOT NULL DEFAULT 500 CHECK (repeat_commission_bps BETWEEN 0 AND 5000),
  auto_release_hours int NOT NULL DEFAULT 72 CHECK (auto_release_hours BETWEEN 1 AND 720)
);

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  technician_id uuid NOT NULL REFERENCES public.technicians(id),
  device_type text NOT NULL,
  category text NOT NULL,
  brand text CHECK (brand IS NULL OR char_length(brand) <= 40),
  model text CHECK (model IS NULL OR char_length(model) <= 60),
  issue_note text CHECK (issue_note IS NULL OR char_length(issue_note) <= 500),
  service_mode public.service_mode NOT NULL,
  address text CHECK (address IS NULL OR char_length(address) BETWEEN 10 AND 200),
  price_kobo integer NOT NULL CHECK (price_kobo > 0),
  commission_kobo integer NOT NULL CHECK (commission_kobo >= 0),
  payout_kobo integer NOT NULL CHECK (payout_kobo >= 0),
  is_repeat boolean NOT NULL DEFAULT false,
  status public.job_status NOT NULL DEFAULT 'requested',
  status_note text CHECK (status_note IS NULL OR char_length(status_note) <= 500),
  payment_reference text CHECK (payment_reference IS NULL OR char_length(payment_reference) BETWEEN 4 AND 60),
  payment_submitted_at timestamptz,
  paid_at timestamptz,
  intake_identifier text,
  intake_notes text CHECK (intake_notes IS NULL OR char_length(intake_notes) <= 500),
  intake_photos text[] NOT NULL DEFAULT '{}',
  intake_at timestamptz,
  repair_notes text CHECK (repair_notes IS NULL OR char_length(repair_notes) <= 500),
  parts_replaced text CHECK (parts_replaced IS NULL OR char_length(parts_replaced) <= 300),
  completion_photos text[] NOT NULL DEFAULT '{}',
  ready_at timestamptz,
  completed_at timestamptz,
  completed_by text CHECK (completed_by IS NULL OR completed_by IN ('customer', 'auto', 'admin')),
  dispute_reason text CHECK (dispute_reason IS NULL OR char_length(dispute_reason) <= 500),
  disputed_at timestamptz,
  refund_reference text,
  payout_status public.payout_status NOT NULL DEFAULT 'not_due',
  payout_reference text,
  payout_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (device_type, category) REFERENCES public.repair_options(device_type, category),
  CONSTRAINT payout_math CHECK (payout_kobo = price_kobo - commission_kobo),
  CONSTRAINT visit_needs_address CHECK (service_mode <> 'visit' OR address IS NOT NULL),
  CONSTRAINT not_own_job CHECK (customer_id <> technician_id),
  CONSTRAINT photo_limits CHECK (cardinality(intake_photos) <= 4 AND cardinality(completion_photos) <= 4)
);
CREATE INDEX jobs_customer_idx ON public.jobs (customer_id, created_at DESC);
CREATE INDEX jobs_technician_idx ON public.jobs (technician_id, created_at DESC);
CREATE INDEX jobs_status_idx ON public.jobs (status);

CREATE TABLE public.job_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  actor_role text NOT NULL,
  from_status public.job_status,
  to_status public.job_status NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_events_job_idx ON public.job_events (job_id, id);

CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_job_idx ON public.messages (job_id, id);
CREATE INDEX messages_sender_idx ON public.messages (sender_id, created_at);

CREATE TABLE public.reviews (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.technicians(id),
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_technician_idx ON public.reviews (technician_id);

-- ---------------------------------------------------------------------------
-- 3. Seed data
-- ---------------------------------------------------------------------------
INSERT INTO public.repair_options (device_type, category, label, sort_order) VALUES
  ('smartphone', 'screen_replacement', 'Cracked or dead screen', 1),
  ('smartphone', 'battery_replacement', 'Battery drains fast', 2),
  ('smartphone', 'charging_port', 'Won''t charge', 3),
  ('smartphone', 'water_damage', 'Water damage', 4),
  ('smartphone', 'camera', 'Camera not working', 5),
  ('smartphone', 'speaker', 'Speaker or mic', 6),
  ('smartphone', 'back_glass', 'Broken back glass', 7),
  ('smartphone', 'buttons', 'Buttons not working', 8),
  ('smartphone', 'software_issues', 'Software, stuck or slow', 9),
  ('smartphone', 'diagnosis', 'Not sure, diagnose it', 10),
  ('laptop', 'screen_replacement', 'Cracked or dead screen', 1),
  ('laptop', 'battery_replacement', 'Battery problems', 2),
  ('laptop', 'charging_port', 'Won''t charge', 3),
  ('laptop', 'keyboard_replacement', 'Keyboard or touchpad', 4),
  ('laptop', 'hinge_repair', 'Broken hinge', 5),
  ('laptop', 'overheating', 'Overheating or loud fan', 6),
  ('laptop', 'storage_upgrade', 'Storage or RAM upgrade', 7),
  ('laptop', 'motherboard_repair', 'Won''t power on', 8),
  ('laptop', 'software_issues', 'Software, slow or virus', 9),
  ('laptop', 'diagnosis', 'Not sure, diagnose it', 10),
  ('tablet', 'screen_replacement', 'Cracked or dead screen', 1),
  ('tablet', 'battery_replacement', 'Battery drains fast', 2),
  ('tablet', 'charging_port', 'Won''t charge', 3),
  ('tablet', 'software_issues', 'Software, stuck or slow', 4),
  ('tablet', 'diagnosis', 'Not sure, diagnose it', 5),
  ('desktop', 'power_supply', 'Won''t power on', 1),
  ('desktop', 'storage_upgrade', 'Storage or RAM upgrade', 2),
  ('desktop', 'overheating', 'Overheating or loud fan', 3),
  ('desktop', 'software_issues', 'Software, slow or virus', 4),
  ('desktop', 'diagnosis', 'Not sure, diagnose it', 5);

-- EDIT THESE before going live: the account customers transfer to.
INSERT INTO public.settings (id, bank_name, account_number, account_name, support_phone)
VALUES (1, 'CHANGE ME Bank', '0000000000', 'UrbanFix Escrow (change me)', NULL);

-- ---------------------------------------------------------------------------
-- 4. Internal helpers (not callable by clients)
-- ---------------------------------------------------------------------------
CREATE FUNCTION public._touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
CREATE TRIGGER technicians_touch BEFORE UPDATE ON public.technicians FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
CREATE TRIGGER technician_private_touch BEFORE UPDATE ON public.technician_private FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
CREATE TRIGGER services_touch BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

CREATE FUNCTION public._fail(msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION USING MESSAGE = msg, ERRCODE = 'P0001'; END $$;

CREATE FUNCTION public._uid() RETURNS uuid LANGUAGE plpgsql STABLE AS $$
DECLARE v uuid := auth.uid();
BEGIN
  IF v IS NULL THEN PERFORM public._fail('Please sign in first.'); END IF;
  RETURN v;
END $$;

CREATE FUNCTION public._role(p_uid uuid) RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT role FROM public.profiles WHERE id = p_uid
$$;

CREATE FUNCTION public._require_role(p_role public.user_role) RETURNS uuid LANGUAGE plpgsql STABLE AS $$
DECLARE v uuid := public._uid(); r public.user_role := public._role(v);
BEGIN
  IF r IS NULL THEN PERFORM public._fail('Finish setting up your account first.'); END IF;
  IF r <> p_role THEN
    PERFORM public._fail(CASE p_role WHEN 'admin' THEN 'Only an UrbanFix admin can do that.'
                                     WHEN 'technician' THEN 'Only the technician can do that.'
                                     ELSE 'Only the customer can do that.' END);
  END IF;
  RETURN v;
END $$;

CREATE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$;

CREATE FUNCTION public.can_see_job(p_job_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = p_job_id AND (j.customer_id = auth.uid() OR j.technician_id = auth.uid())
  ) OR public.is_admin()
$$;

CREATE FUNCTION public._clean(p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  -- trim, collapse internal whitespace runs, and turn empty into NULL
  SELECT NULLIF(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'), '')
$$;

CREATE FUNCTION public._safe_uuid(p text) RETURNS uuid LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN p::uuid; END IF;
  RETURN NULL;
END $$;

-- Phone numbers are stored as accounts with a synthetic email:
--   +2348012345678  <->  2348012345678@phone.urbanfix.app
CREATE FUNCTION public._normalize_phone(p text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE d text := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
BEGIN
  IF d ~ '^0[789][01][0-9]{8}$' THEN d := '234' || substr(d, 2);
  ELSIF d ~ '^[789][01][0-9]{8}$' THEN d := '234' || d;
  END IF;
  IF d ~ '^234[789][01][0-9]{8}$' THEN RETURN '+' || d; END IF;
  RETURN NULL;
END $$;

CREATE FUNCTION public._phone_from_email(p_email text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_email ~ '^234[789][01][0-9]{8}@phone\.urbanfix\.app$'
              THEN '+' || split_part(p_email, '@', 1) END
$$;

CREATE FUNCTION public._valid_name(p text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  -- Letters (incl. accented Latin and Yoruba/Igbo tone marks), spaces, . ' -
  SELECT p IS NOT NULL AND char_length(p) BETWEEN 2 AND 80
     AND p ~ '^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF][A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF\u0300-\u036F .''-]*$'
     AND p ~ '[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF].*[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF]'
$$;

CREATE FUNCTION public._luhn_ok(d text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s int := 0; i int; n int; dbl boolean := false;
BEGIN
  FOR i IN REVERSE char_length(d)..1 LOOP
    n := substr(d, i, 1)::int;
    IF dbl THEN n := n * 2; IF n > 9 THEN n := n - 9; END IF; END IF;
    s := s + n; dbl := NOT dbl;
  END LOOP;
  RETURN s % 10 = 0;
END $$;

-- Device identifier: IMEI (15 digits, must pass the checksum) or a serial number.
CREATE FUNCTION public._normalize_identifier(p text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v text := upper(regexp_replace(coalesce(p, ''), '[\s]', '', 'g'));
BEGIN
  IF v !~ '^[A-Z0-9-]{4,30}$' THEN
    PERFORM public._fail('Enter the IMEI or serial number (4 to 30 letters or digits).');
  END IF;
  IF v ~ '^[0-9]{15}$' AND NOT public._luhn_ok(v) THEN
    PERFORM public._fail('That IMEI doesn''t look right. Dial *#06# on the phone to check it.');
  END IF;
  IF v ~ '^(.)\1+$' THEN
    PERFORM public._fail('Enter the real IMEI or serial number.');
  END IF;
  RETURN v;
END $$;

-- Photo paths must be "<job_id>/<name>.jpg|png", uploaded by the caller, and actually exist.
CREATE FUNCTION public._check_job_photos(p_job_id uuid, p_uid uuid, p_paths text[]) RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p text; n int := coalesce(cardinality(p_paths), 0);
BEGIN
  IF n < 1 THEN PERFORM public._fail('Add at least one photo.'); END IF;
  IF n > 4 THEN PERFORM public._fail('Add at most 4 photos.'); END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_paths) x) <> n THEN
    PERFORM public._fail('The same photo was added twice.');
  END IF;
  FOREACH p IN ARRAY p_paths LOOP
    IF p IS NULL OR p !~ ('^' || p_job_id::text || '/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png)$') THEN
      PERFORM public._fail('Invalid photo.');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects o
                   WHERE o.bucket_id = 'job-photos' AND o.name = p
                     AND (o.owner = p_uid OR o.owner_id = p_uid::text)) THEN
      PERFORM public._fail('A photo didn''t finish uploading. Please try again.');
    END IF;
  END LOOP;
  RETURN p_paths;
END $$;

CREATE FUNCTION public._log(p_job_id uuid, p_actor uuid, p_actor_role text,
                            p_from public.job_status, p_to public.job_status, p_note text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  INSERT INTO public.job_events (job_id, actor_id, actor_role, from_status, to_status, note)
  VALUES (p_job_id, p_actor, p_actor_role, p_from, p_to, p_note)
$$;

-- Lock a job row for update, checking the caller's relationship to it.
-- p_as: 'customer' | 'technician' | 'admin'
CREATE FUNCTION public._lock_job(p_job_id uuid, p_uid uuid, p_as text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE j public.jobs;
BEGIN
  SELECT * INTO j FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public._fail('Repair not found.'); END IF;
  IF p_as = 'customer' AND j.customer_id <> p_uid THEN PERFORM public._fail('Repair not found.'); END IF;
  IF p_as = 'technician' AND j.technician_id <> p_uid THEN PERFORM public._fail('Repair not found.'); END IF;
  IF p_as = 'admin' AND NOT public.is_admin() THEN PERFORM public._fail('Only an admin can do that.'); END IF;
  RETURN j;
END $$;

CREATE FUNCTION public._expect(j public.jobs, VARIADIC allowed public.job_status[]) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT (j.status = ANY (allowed)) THEN
    PERFORM public._fail('This repair is ' || replace(j.status::text, '_', ' ') || ', so that can''t be done now.');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Account functions
-- ---------------------------------------------------------------------------

-- Used by the sign-in screen (before login) to decide "create PIN" vs "enter PIN".
CREATE FUNCTION public.phone_registered(p_phone text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v text := public._normalize_phone(p_phone);
BEGIN
  IF v IS NULL THEN PERFORM public._fail('Enter a valid Nigerian mobile number.'); END IF;
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = substr(v, 2) || '@phone.urbanfix.app');
END $$;

CREATE FUNCTION public.complete_signup(p_role text, p_full_name text, p_area text DEFAULT NULL, p_address text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._uid();
  v_phone text;
  v_name text := public._clean(p_full_name);
  v_area text := public._clean(p_area);
  v_address text := public._clean(p_address);
  v_profile public.profiles;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    PERFORM public._fail('Your account is already set up.');
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('customer', 'technician') THEN
    PERFORM public._fail('Choose whether you need a repair or you are a technician.');
  END IF;
  IF NOT public._valid_name(v_name) THEN
    PERFORM public._fail('Enter your name (letters only, at least 2).');
  END IF;
  IF v_area IS NOT NULL AND char_length(v_area) NOT BETWEEN 2 AND 60 THEN
    PERFORM public._fail('Area should be 2 to 60 characters.');
  END IF;
  IF v_address IS NOT NULL AND char_length(v_address) NOT BETWEEN 10 AND 200 THEN
    PERFORM public._fail('Address should be 10 to 200 characters.');
  END IF;

  SELECT public._phone_from_email(email) INTO v_phone FROM auth.users WHERE id = v_uid;
  IF v_phone IS NULL THEN PERFORM public._fail('This account was not created with a phone number.'); END IF;

  INSERT INTO public.profiles (id, role, full_name, phone, area, address)
  VALUES (v_uid, p_role::public.user_role, v_name, v_phone, v_area, v_address)
  RETURNING * INTO v_profile;

  IF p_role = 'technician' THEN
    INSERT INTO public.technicians (id, area) VALUES (v_uid, v_area);
    INSERT INTO public.technician_private (id) VALUES (v_uid);
  END IF;
  RETURN v_profile;
END $$;

CREATE FUNCTION public.update_my_profile(p_full_name text, p_area text DEFAULT NULL, p_address text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._uid();
  v_name text := public._clean(p_full_name);
  v_area text := public._clean(p_area);
  v_address text := public._clean(p_address);
  v_profile public.profiles;
BEGIN
  IF NOT public._valid_name(v_name) THEN PERFORM public._fail('Enter your name (letters only, at least 2).'); END IF;
  IF v_area IS NOT NULL AND char_length(v_area) NOT BETWEEN 2 AND 60 THEN PERFORM public._fail('Area should be 2 to 60 characters.'); END IF;
  IF v_address IS NOT NULL AND char_length(v_address) NOT BETWEEN 10 AND 200 THEN PERFORM public._fail('Address should be 10 to 200 characters.'); END IF;
  UPDATE public.profiles SET full_name = v_name, area = v_area, address = v_address
  WHERE id = v_uid RETURNING * INTO v_profile;
  IF NOT FOUND THEN PERFORM public._fail('Finish setting up your account first.'); END IF;
  RETURN v_profile;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Technician setup
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.save_shop(p_shop_name text, p_shop_address text, p_area text, p_bio text DEFAULT NULL)
RETURNS public.technicians
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._require_role('technician');
  v_name text := public._clean(p_shop_name);
  v_addr text := public._clean(p_shop_address);
  v_area text := public._clean(p_area);
  v_bio text := public._clean(p_bio);
  t public.technicians;
BEGIN
  SELECT * INTO t FROM public.technicians WHERE id = v_uid FOR UPDATE;
  IF t.status = 'suspended' THEN PERFORM public._fail('Your account is suspended. Contact support.'); END IF;
  IF v_name IS NULL OR char_length(v_name) NOT BETWEEN 2 AND 80 THEN PERFORM public._fail('Enter your shop or business name.'); END IF;
  IF v_addr IS NULL OR char_length(v_addr) NOT BETWEEN 10 AND 200 THEN PERFORM public._fail('Enter your full shop address (at least 10 characters).'); END IF;
  IF v_area IS NULL OR char_length(v_area) NOT BETWEEN 2 AND 60 THEN PERFORM public._fail('Choose your area.'); END IF;
  IF v_bio IS NOT NULL AND char_length(v_bio) > 300 THEN PERFORM public._fail('Keep your bio under 300 characters.'); END IF;
  UPDATE public.technicians SET shop_name = v_name, shop_address = v_addr, area = v_area, bio = v_bio
  WHERE id = v_uid RETURNING * INTO t;
  RETURN t;
END $$;

CREATE FUNCTION public.save_service(p_device_type text, p_category text, p_price_kobo bigint, p_active boolean DEFAULT true)
RETURNS public.services
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('technician'); s public.services;
BEGIN
  IF (SELECT status FROM public.technicians WHERE id = v_uid) = 'suspended' THEN
    PERFORM public._fail('Your account is suspended. Contact support.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.repair_options WHERE device_type = p_device_type AND category = p_category) THEN
    PERFORM public._fail('Unknown repair type.');
  END IF;
  IF p_price_kobo IS NULL OR p_price_kobo < 50000 OR p_price_kobo > 500000000 THEN
    PERFORM public._fail('Price must be between ₦500 and ₦5,000,000.');
  END IF;
  IF p_price_kobo % 100 <> 0 THEN PERFORM public._fail('Use whole naira amounts.'); END IF;
  INSERT INTO public.services (technician_id, device_type, category, price_kobo, is_active)
  VALUES (v_uid, p_device_type, p_category, p_price_kobo::int, coalesce(p_active, true))
  ON CONFLICT (technician_id, device_type, category)
  DO UPDATE SET price_kobo = EXCLUDED.price_kobo, is_active = EXCLUDED.is_active
  RETURNING * INTO s;
  RETURN s;
END $$;

CREATE FUNCTION public.remove_service(p_device_type text, p_category text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('technician');
BEGIN
  DELETE FROM public.services WHERE technician_id = v_uid AND device_type = p_device_type AND category = p_category;
END $$;

CREATE FUNCTION public.save_payout_details(p_bank_name text, p_account_number text, p_account_name text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._require_role('technician');
  v_bank text := public._clean(p_bank_name);
  v_acct text := regexp_replace(coalesce(p_account_number, ''), '\s', '', 'g');
  v_name text := public._clean(p_account_name);
  v_status public.tech_status;
BEGIN
  SELECT status INTO v_status FROM public.technicians WHERE id = v_uid FOR UPDATE;
  IF v_status NOT IN ('draft', 'pending', 'rejected') THEN
    PERFORM public._fail('To change bank details after approval, contact UrbanFix support.');
  END IF;
  IF v_bank IS NULL OR char_length(v_bank) NOT BETWEEN 2 AND 60 THEN PERFORM public._fail('Choose your bank.'); END IF;
  IF v_acct !~ '^[0-9]{10}$' THEN PERFORM public._fail('Account number must be 10 digits.'); END IF;
  IF v_acct ~ '^(.)\1+$' THEN PERFORM public._fail('Enter your real account number.'); END IF;
  IF NOT public._valid_name(v_name) THEN PERFORM public._fail('Enter the account name exactly as your bank shows it.'); END IF;
  UPDATE public.technician_private SET bank_name = v_bank, account_number = v_acct, account_name = v_name WHERE id = v_uid;
END $$;

CREATE FUNCTION public.save_identity(p_nin text, p_document_path text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._require_role('technician');
  v_nin text := regexp_replace(coalesce(p_nin, ''), '\s', '', 'g');
  v_status public.tech_status;
BEGIN
  SELECT status INTO v_status FROM public.technicians WHERE id = v_uid FOR UPDATE;
  IF v_status NOT IN ('draft', 'pending', 'rejected') THEN
    PERFORM public._fail('Your identity is already verified. Contact support to change it.');
  END IF;
  IF v_nin !~ '^[0-9]{11}$' THEN PERFORM public._fail('NIN must be 11 digits.'); END IF;
  IF v_nin ~ '^(.)\1+$' THEN PERFORM public._fail('Enter your real NIN.'); END IF;
  IF p_document_path IS NULL OR p_document_path !~ ('^' || v_uid::text || '/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png)$') THEN
    PERFORM public._fail('Upload a photo of your ID.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'id-documents' AND name = p_document_path
                 AND (owner = v_uid OR owner_id = v_uid::text)) THEN
    PERFORM public._fail('Your ID photo didn''t finish uploading. Please try again.');
  END IF;
  UPDATE public.technician_private SET nin = v_nin, id_document_path = p_document_path WHERE id = v_uid;
END $$;

CREATE FUNCTION public.submit_for_review() RETURNS public.technicians
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('technician'); t public.technicians; p public.technician_private;
BEGIN
  SELECT * INTO t FROM public.technicians WHERE id = v_uid FOR UPDATE;
  SELECT * INTO p FROM public.technician_private WHERE id = v_uid;
  IF t.status NOT IN ('draft', 'rejected') THEN
    PERFORM public._fail(CASE t.status WHEN 'pending' THEN 'Your profile is already being reviewed.'
                                       WHEN 'approved' THEN 'You are already approved.'
                                       ELSE 'Your account is suspended. Contact support.' END);
  END IF;
  IF t.shop_name IS NULL OR t.shop_address IS NULL OR t.area IS NULL THEN PERFORM public._fail('Add your shop details first.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE technician_id = v_uid AND is_active) THEN
    PERFORM public._fail('Add at least one repair you offer, with a price.');
  END IF;
  IF p.account_number IS NULL OR p.bank_name IS NULL OR p.account_name IS NULL THEN PERFORM public._fail('Add your bank details so we can pay you.'); END IF;
  IF p.nin IS NULL OR p.id_document_path IS NULL THEN PERFORM public._fail('Add your NIN and a photo of your ID.'); END IF;
  UPDATE public.technicians SET status = 'pending', status_reason = NULL, submitted_at = now()
  WHERE id = v_uid RETURNING * INTO t;
  RETURN t;
END $$;

CREATE FUNCTION public.set_availability(p_available boolean) RETURNS public.technicians
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('technician'); t public.technicians;
BEGIN
  SELECT * INTO t FROM public.technicians WHERE id = v_uid FOR UPDATE;
  IF t.status <> 'approved' THEN PERFORM public._fail('You can go online once UrbanFix approves your profile.'); END IF;
  UPDATE public.technicians SET is_available = coalesce(p_available, false) WHERE id = v_uid RETURNING * INTO t;
  RETURN t;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Booking and the job lifecycle
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.find_technicians(p_device_type text, p_category text)
RETURNS TABLE (
  technician_id uuid, full_name text, shop_name text, area text, shop_address text, bio text,
  price_kobo int, rating numeric, reviews int, jobs_done int, used_before boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._uid();
BEGIN
  RETURN QUERY
  SELECT t.id, pr.full_name, t.shop_name, t.area, t.shop_address, t.bio, s.price_kobo,
         round(avg(r.rating)::numeric, 1), count(DISTINCT r.job_id)::int,
         (SELECT count(*)::int FROM public.jobs j WHERE j.technician_id = t.id AND j.status = 'completed'),
         EXISTS (SELECT 1 FROM public.jobs j WHERE j.technician_id = t.id AND j.customer_id = v_uid AND j.status = 'completed')
  FROM public.technicians t
  JOIN public.profiles pr ON pr.id = t.id
  JOIN public.services s ON s.technician_id = t.id AND s.device_type = p_device_type AND s.category = p_category AND s.is_active
  LEFT JOIN public.reviews r ON r.technician_id = t.id
  WHERE t.status = 'approved' AND t.is_available AND t.id <> v_uid
  GROUP BY t.id, pr.full_name, s.price_kobo
  ORDER BY 11 DESC, 8 DESC NULLS LAST, 7 ASC
  LIMIT 50;
END $$;

CREATE FUNCTION public.create_job(
  p_technician_id uuid, p_device_type text, p_category text,
  p_brand text, p_model text, p_issue_note text, p_service_mode text, p_address text
) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._require_role('customer');
  v_brand text := public._clean(p_brand);
  v_model text := public._clean(p_model);
  v_note text := public._clean(p_issue_note);
  v_addr text := public._clean(p_address);
  v_mode public.service_mode;
  t public.technicians;
  s public.services;
  cfg public.settings;
  v_repeat boolean;
  v_commission int;
  v_code text;
  j public.jobs;
BEGIN
  -- Serialize bookings per customer so the open-request limits can't be raced.
  PERFORM 1 FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF p_service_mode IS NULL OR p_service_mode NOT IN ('visit', 'drop_off') THEN
    PERFORM public._fail('Choose whether the technician comes to you or you drop it off.');
  END IF;
  v_mode := p_service_mode::public.service_mode;
  IF v_mode = 'visit' AND (v_addr IS NULL OR char_length(v_addr) NOT BETWEEN 10 AND 200) THEN
    PERFORM public._fail('Enter the address the technician should come to (at least 10 characters).');
  END IF;
  IF v_mode = 'drop_off' THEN v_addr := NULL; END IF;
  IF v_brand IS NOT NULL AND char_length(v_brand) > 40 THEN PERFORM public._fail('Brand is too long.'); END IF;
  IF v_model IS NOT NULL AND char_length(v_model) > 60 THEN PERFORM public._fail('Model is too long.'); END IF;
  IF v_note IS NOT NULL AND char_length(v_note) > 500 THEN PERFORM public._fail('Keep the description under 500 characters.'); END IF;

  SELECT * INTO t FROM public.technicians WHERE id = p_technician_id;
  IF NOT FOUND OR t.status <> 'approved' OR NOT t.is_available THEN
    PERFORM public._fail('This technician isn''t taking jobs right now. Pick another one.');
  END IF;
  SELECT * INTO s FROM public.services
  WHERE technician_id = p_technician_id AND device_type = p_device_type AND category = p_category AND is_active;
  IF NOT FOUND THEN PERFORM public._fail('This technician doesn''t offer that repair.'); END IF;

  IF (SELECT count(*) FROM public.jobs WHERE customer_id = v_uid
      AND status IN ('requested', 'accepted', 'payment_submitted')) >= 3 THEN
    PERFORM public._fail('You have 3 repairs waiting. Finish or cancel one first.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.jobs WHERE customer_id = v_uid AND technician_id = p_technician_id
             AND device_type = p_device_type AND category = p_category
             AND status IN ('requested', 'accepted', 'payment_submitted')) THEN
    PERFORM public._fail('You already have this request open with this technician.');
  END IF;
  IF (SELECT count(*) FROM public.jobs WHERE customer_id = v_uid AND created_at > now() - interval '24 hours') >= 10 THEN
    PERFORM public._fail('Too many bookings today. Try again tomorrow.');
  END IF;

  SELECT * INTO cfg FROM public.settings WHERE id = 1;
  v_repeat := EXISTS (SELECT 1 FROM public.jobs WHERE customer_id = v_uid AND technician_id = p_technician_id AND status = 'completed');
  v_commission := round(s.price_kobo::numeric * (CASE WHEN v_repeat THEN cfg.repeat_commission_bps ELSE cfg.commission_bps END) / 10000)::int;

  LOOP
    v_code := 'UF-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.jobs WHERE code = v_code);
  END LOOP;

  INSERT INTO public.jobs (code, customer_id, technician_id, device_type, category, brand, model, issue_note,
                           service_mode, address, price_kobo, commission_kobo, payout_kobo, is_repeat)
  VALUES (v_code, v_uid, p_technician_id, p_device_type, p_category, v_brand, v_model, v_note,
          v_mode, v_addr, s.price_kobo, v_commission, s.price_kobo - v_commission, v_repeat)
  RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'customer', NULL, 'requested', NULL);
  RETURN j;
END $$;

CREATE FUNCTION public.accept_job(p_job_id uuid) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('technician'); j public.jobs;
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'technician');
  PERFORM public._expect(j, 'requested');
  IF (SELECT status FROM public.technicians WHERE id = v_uid) <> 'approved' THEN
    PERFORM public._fail('Your account isn''t active. Contact support.');
  END IF;
  UPDATE public.jobs SET status = 'accepted', status_note = NULL WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'technician', 'requested', 'accepted', NULL);
  RETURN j;
END $$;

CREATE FUNCTION public.decline_job(p_job_id uuid, p_reason text DEFAULT NULL) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('technician'); j public.jobs; v_reason text := public._clean(p_reason);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'technician');
  PERFORM public._expect(j, 'requested');
  IF v_reason IS NOT NULL AND char_length(v_reason) > 200 THEN PERFORM public._fail('Keep the reason under 200 characters.'); END IF;
  UPDATE public.jobs SET status = 'declined', status_note = v_reason WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'technician', 'requested', 'declined', v_reason);
  RETURN j;
END $$;

-- Customer: before paying. Technician: after accepting, before payment is confirmed.
CREATE FUNCTION public.cancel_job(p_job_id uuid, p_reason text DEFAULT NULL) RETURNS public.jobs
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
    PERFORM public._expect(j, 'requested', 'accepted');
  ELSIF v_role = 'technician' THEN
    j := public._lock_job(p_job_id, v_uid, 'technician');
    PERFORM public._expect(j, 'accepted');
    IF v_reason IS NULL OR char_length(v_reason) < 5 THEN PERFORM public._fail('Tell the customer why you are cancelling.'); END IF;
  ELSIF v_role = 'admin' THEN
    j := public._lock_job(p_job_id, v_uid, 'admin');
    PERFORM public._expect(j, 'requested', 'accepted', 'payment_submitted');
  ELSE
    PERFORM public._fail('Finish setting up your account first.');
  END IF;
  v_from := j.status;
  UPDATE public.jobs SET status = 'cancelled', status_note = v_reason WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, v_role::text, v_from, 'cancelled', v_reason);
  RETURN j;
END $$;

CREATE FUNCTION public.submit_payment(p_job_id uuid, p_reference text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('customer'); j public.jobs; v_ref text := public._clean(p_reference);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'customer');
  PERFORM public._expect(j, 'accepted');
  IF v_ref IS NULL OR char_length(v_ref) NOT BETWEEN 4 AND 60 THEN
    PERFORM public._fail('Enter the name on the account you paid from, or the transfer reference.');
  END IF;
  UPDATE public.jobs SET status = 'payment_submitted', payment_reference = v_ref, payment_submitted_at = now(), status_note = NULL
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'customer', 'accepted', 'payment_submitted', v_ref);
  RETURN j;
END $$;

CREATE FUNCTION public.record_intake(p_job_id uuid, p_identifier text, p_notes text, p_photos text[]) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('technician'); j public.jobs; v_id text; v_notes text := public._clean(p_notes);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'technician');
  PERFORM public._expect(j, 'paid');
  v_id := public._normalize_identifier(p_identifier);
  IF v_notes IS NOT NULL AND char_length(v_notes) > 500 THEN PERFORM public._fail('Keep notes under 500 characters.'); END IF;
  UPDATE public.jobs SET status = 'in_repair', intake_identifier = v_id, intake_notes = v_notes,
         intake_photos = public._check_job_photos(j.id, v_uid, p_photos), intake_at = now()
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'technician', 'paid', 'in_repair', NULL);
  RETURN j;
END $$;

CREATE FUNCTION public.mark_ready(p_job_id uuid, p_repair_notes text, p_parts_replaced text, p_photos text[]) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._require_role('technician');
  j public.jobs;
  v_notes text := public._clean(p_repair_notes);
  v_parts text := public._clean(p_parts_replaced);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'technician');
  PERFORM public._expect(j, 'in_repair');
  IF v_notes IS NULL OR char_length(v_notes) NOT BETWEEN 5 AND 500 THEN PERFORM public._fail('Describe what you fixed (at least 5 characters).'); END IF;
  IF v_parts IS NOT NULL AND char_length(v_parts) > 300 THEN PERFORM public._fail('Keep the parts list under 300 characters.'); END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_photos) x WHERE x = ANY (j.intake_photos)) THEN
    PERFORM public._fail('Use new photos of the repaired device, not the intake photos.');
  END IF;
  UPDATE public.jobs SET status = 'awaiting_confirmation', repair_notes = v_notes, parts_replaced = coalesce(v_parts, 'None'),
         completion_photos = public._check_job_photos(j.id, v_uid, p_photos), ready_at = now()
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'technician', 'in_repair', 'awaiting_confirmation', NULL);
  RETURN j;
END $$;

CREATE FUNCTION public.confirm_completion(p_job_id uuid) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('customer'); j public.jobs;
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'customer');
  PERFORM public._expect(j, 'awaiting_confirmation');
  UPDATE public.jobs SET status = 'completed', completed_at = now(), completed_by = 'customer', payout_status = 'due'
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'customer', 'awaiting_confirmation', 'completed', NULL);
  RETURN j;
END $$;

CREATE FUNCTION public.raise_dispute(p_job_id uuid, p_reason text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('customer'); j public.jobs; v_reason text := public._clean(p_reason); v_from public.job_status;
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'customer');
  PERFORM public._expect(j, 'payment_submitted', 'paid', 'in_repair', 'awaiting_confirmation');
  IF v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 10 AND 500 THEN
    PERFORM public._fail('Tell us what went wrong (at least 10 characters).');
  END IF;
  v_from := j.status;
  UPDATE public.jobs SET status = 'disputed', dispute_reason = v_reason, disputed_at = now()
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'customer', v_from, 'disputed', v_reason);
  RETURN j;
END $$;

CREATE FUNCTION public.submit_review(p_job_id uuid, p_rating int, p_comment text DEFAULT NULL) RETURNS public.reviews
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('customer'); j public.jobs; r public.reviews; v_comment text := public._clean(p_comment);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'customer');
  PERFORM public._expect(j, 'completed');
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN PERFORM public._fail('Choose 1 to 5 stars.'); END IF;
  IF v_comment IS NOT NULL AND char_length(v_comment) > 500 THEN PERFORM public._fail('Keep your review under 500 characters.'); END IF;
  IF EXISTS (SELECT 1 FROM public.reviews WHERE job_id = j.id) THEN PERFORM public._fail('You''ve already rated this repair.'); END IF;
  INSERT INTO public.reviews (job_id, technician_id, customer_id, rating, comment)
  VALUES (j.id, j.technician_id, v_uid, p_rating, v_comment) RETURNING * INTO r;
  RETURN r;
END $$;

CREATE FUNCTION public.send_message(p_job_id uuid, p_body text) RETURNS public.messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._uid(); j public.jobs; m public.messages; v_body text := btrim(coalesce(p_body, ''));
BEGIN
  SELECT * INTO j FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND OR NOT (j.customer_id = v_uid OR j.technician_id = v_uid OR public.is_admin()) THEN
    PERFORM public._fail('Repair not found.');
  END IF;
  IF j.status IN ('declined', 'cancelled') THEN PERFORM public._fail('This repair is closed.'); END IF;
  IF char_length(v_body) < 1 THEN PERFORM public._fail('Type a message.'); END IF;
  IF char_length(v_body) > 1000 THEN PERFORM public._fail('Message is too long (1000 characters max).'); END IF;
  IF (SELECT count(*) FROM public.messages WHERE sender_id = v_uid AND created_at > now() - interval '1 minute') >= 20 THEN
    PERFORM public._fail('You''re sending messages too fast. Wait a moment.');
  END IF;
  INSERT INTO public.messages (job_id, sender_id, body) VALUES (j.id, v_uid, v_body) RETURNING * INTO m;
  RETURN m;
END $$;

-- Everything a job screen needs in one call. Phone numbers are shared only
-- once payment is confirmed, so contact happens inside UrbanFix until then.
CREATE FUNCTION public.get_job(p_job_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._uid();
  j public.jobs;
  v_admin boolean := public.is_admin();
  v_share boolean;
  c public.profiles; tp public.profiles; t public.technicians;
BEGIN
  SELECT * INTO j FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND OR NOT (j.customer_id = v_uid OR j.technician_id = v_uid OR v_admin) THEN
    PERFORM public._fail('Repair not found.');
  END IF;
  v_share := v_admin OR j.status IN ('paid', 'in_repair', 'awaiting_confirmation', 'disputed');
  SELECT * INTO c FROM public.profiles WHERE id = j.customer_id;
  SELECT * INTO tp FROM public.profiles WHERE id = j.technician_id;
  SELECT * INTO t FROM public.technicians WHERE id = j.technician_id;
  RETURN jsonb_build_object(
    'job', to_jsonb(j) - CASE WHEN v_admin OR j.technician_id = v_uid THEN 'x' ELSE 'payout_reference' END,
    'viewer_role', CASE WHEN j.customer_id = v_uid THEN 'customer' WHEN j.technician_id = v_uid THEN 'technician' ELSE 'admin' END,
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

CREATE FUNCTION public.my_jobs() RETURNS TABLE (
  id uuid, code text, status public.job_status, device_type text, category text, brand text, model text,
  price_kobo int, payout_kobo int, service_mode public.service_mode, other_party text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT j.id, j.code, j.status, j.device_type, j.category, j.brand, j.model, j.price_kobo, j.payout_kobo, j.service_mode,
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

CREATE FUNCTION public.my_earnings() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('technician');
BEGIN
  RETURN jsonb_build_object(
    'paid_kobo', coalesce((SELECT sum(payout_kobo) FROM public.jobs WHERE technician_id = v_uid AND payout_status = 'paid'), 0),
    'due_kobo', coalesce((SELECT sum(payout_kobo) FROM public.jobs WHERE technician_id = v_uid AND payout_status = 'due'), 0),
    'in_escrow_kobo', coalesce((SELECT sum(payout_kobo) FROM public.jobs WHERE technician_id = v_uid
                                AND status IN ('paid', 'in_repair', 'awaiting_confirmation', 'disputed')), 0),
    'completed_jobs', (SELECT count(*) FROM public.jobs WHERE technician_id = v_uid AND status = 'completed'),
    'rating', (SELECT round(avg(rating)::numeric, 1) FROM public.reviews WHERE technician_id = v_uid),
    'reviews', (SELECT count(*) FROM public.reviews WHERE technician_id = v_uid)
  );
END $$;

-- ---------------------------------------------------------------------------
-- 8. Admin functions
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.admin_review_technician(p_technician_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS public.technicians
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); t public.technicians; v_reason text := public._clean(p_reason);
BEGIN
  SELECT * INTO t FROM public.technicians WHERE id = p_technician_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public._fail('Technician not found.'); END IF;
  IF p_approve THEN
    IF t.status NOT IN ('pending', 'suspended') THEN PERFORM public._fail('Only pending or suspended technicians can be approved.'); END IF;
    UPDATE public.technicians SET status = 'approved', status_reason = NULL, is_available = true,
           reviewed_at = now(), reviewed_by = v_uid WHERE id = t.id RETURNING * INTO t;
  ELSE
    IF t.status NOT IN ('pending', 'approved') THEN PERFORM public._fail('Only pending or approved technicians can be rejected or suspended.'); END IF;
    IF v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 5 AND 300 THEN PERFORM public._fail('Give a reason (5 to 300 characters).'); END IF;
    UPDATE public.technicians
       SET status = CASE WHEN t.status = 'approved' THEN 'suspended'::public.tech_status ELSE 'rejected'::public.tech_status END,
           status_reason = v_reason, is_available = false, reviewed_at = now(), reviewed_by = v_uid
     WHERE id = t.id RETURNING * INTO t;
  END IF;
  RETURN t;
END $$;

CREATE FUNCTION public.admin_confirm_payment(p_job_id uuid) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); j public.jobs;
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'admin');
  PERFORM public._expect(j, 'payment_submitted');
  UPDATE public.jobs SET status = 'paid', paid_at = now(), status_note = NULL WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'admin', 'payment_submitted', 'paid', NULL);
  RETURN j;
END $$;

CREATE FUNCTION public.admin_reject_payment(p_job_id uuid, p_note text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); j public.jobs; v_note text := public._clean(p_note);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'admin');
  PERFORM public._expect(j, 'payment_submitted');
  IF v_note IS NULL OR char_length(v_note) NOT BETWEEN 5 AND 300 THEN PERFORM public._fail('Tell the customer what''s wrong with the payment.'); END IF;
  UPDATE public.jobs SET status = 'accepted', status_note = v_note, payment_reference = NULL, payment_submitted_at = NULL
  WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'admin', 'payment_submitted', 'accepted', v_note);
  RETURN j;
END $$;

-- p_outcome: 'release' pays the technician, 'refund' returns money to the customer.
CREATE FUNCTION public.admin_resolve_dispute(p_job_id uuid, p_outcome text, p_note text, p_refund_reference text DEFAULT NULL)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); j public.jobs; v_note text := public._clean(p_note); v_ref text := public._clean(p_refund_reference);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'admin');
  PERFORM public._expect(j, 'disputed');
  IF v_note IS NULL OR char_length(v_note) NOT BETWEEN 5 AND 500 THEN PERFORM public._fail('Explain the decision (5 to 500 characters).'); END IF;
  IF p_outcome = 'release' THEN
    UPDATE public.jobs SET status = 'completed', completed_at = now(), completed_by = 'admin', payout_status = 'due', status_note = v_note
    WHERE id = j.id RETURNING * INTO j;
    PERFORM public._log(j.id, v_uid, 'admin', 'disputed', 'completed', v_note);
  ELSIF p_outcome = 'refund' THEN
    IF v_ref IS NULL OR char_length(v_ref) < 4 THEN PERFORM public._fail('Enter the refund transfer reference.'); END IF;
    UPDATE public.jobs SET status = 'refunded', refund_reference = v_ref, status_note = v_note, payout_status = 'not_due'
    WHERE id = j.id RETURNING * INTO j;
    PERFORM public._log(j.id, v_uid, 'admin', 'disputed', 'refunded', v_note);
  ELSE
    PERFORM public._fail('Choose release or refund.');
  END IF;
  RETURN j;
END $$;

CREATE FUNCTION public.admin_mark_payout_paid(p_job_id uuid, p_reference text) RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := public._require_role('admin'); j public.jobs; v_ref text := public._clean(p_reference);
BEGIN
  j := public._lock_job(p_job_id, v_uid, 'admin');
  PERFORM public._expect(j, 'completed');
  IF j.payout_status <> 'due' THEN PERFORM public._fail('This payout isn''t due.'); END IF;
  IF v_ref IS NULL OR char_length(v_ref) NOT BETWEEN 4 AND 60 THEN PERFORM public._fail('Enter the transfer reference.'); END IF;
  UPDATE public.jobs SET payout_status = 'paid', payout_reference = v_ref, payout_at = now() WHERE id = j.id RETURNING * INTO j;
  PERFORM public._log(j.id, v_uid, 'admin', 'completed', 'completed', 'Payout sent: ' || v_ref);
  RETURN j;
END $$;

-- Releases jobs the customer hasn't confirmed or disputed within the window.
CREATE FUNCTION public._auto_release() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r record; n int := 0; v_hours int := (SELECT auto_release_hours FROM public.settings WHERE id = 1);
BEGIN
  FOR r IN SELECT id FROM public.jobs
           WHERE status = 'awaiting_confirmation' AND ready_at < now() - make_interval(hours => v_hours)
           FOR UPDATE SKIP LOCKED LOOP
    UPDATE public.jobs SET status = 'completed', completed_at = now(), completed_by = 'auto', payout_status = 'due' WHERE id = r.id;
    PERFORM public._log(r.id, NULL, 'system', 'awaiting_confirmation', 'completed', 'Auto-released after ' || v_hours || ' hours');
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

CREATE FUNCTION public.admin_auto_release() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN PERFORM public._require_role('admin'); RETURN public._auto_release(); END $$;

CREATE FUNCTION public.admin_technician_details(p_technician_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public._require_role('admin');
  RETURN (
    SELECT jsonb_build_object('technician', to_jsonb(t), 'profile', to_jsonb(p), 'private', to_jsonb(x),
      'services', coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.device_type, s.category) FROM public.services s WHERE s.technician_id = t.id), '[]'::jsonb))
    FROM public.technicians t JOIN public.profiles p ON p.id = t.id JOIN public.technician_private x ON x.id = t.id
    WHERE t.id = p_technician_id
  );
END $$;

-- Run in the SQL editor to make someone an admin (they must have signed up first):
--   SELECT public.make_admin('08012345678');
CREATE FUNCTION public.make_admin(p_phone text) RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v text := public._normalize_phone(p_phone); v_uid uuid; pr public.profiles;
BEGIN
  IF v IS NULL THEN PERFORM public._fail('Invalid phone number.'); END IF;
  SELECT id INTO v_uid FROM auth.users WHERE email = substr(v, 2) || '@phone.urbanfix.app';
  IF v_uid IS NULL THEN PERFORM public._fail('No account with that phone. Sign up in the app first (create a PIN), then run this.'); END IF;
  DELETE FROM public.technicians WHERE id = v_uid AND NOT EXISTS (SELECT 1 FROM public.jobs WHERE technician_id = v_uid);
  INSERT INTO public.profiles (id, role, full_name, phone) VALUES (v_uid, 'admin', 'UrbanFix Admin', v)
  ON CONFLICT (id) DO UPDATE SET role = 'admin' RETURNING * INTO pr;
  RETURN pr;
END $$;

-- Support tool: reset a user's PIN when they forget it. Run in the SQL editor
-- after confirming who they are (e.g. they message from that same number):
--   SELECT public.reset_pin('08012345678', '482915');
CREATE FUNCTION public.reset_pin(p_phone text, p_new_pin text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v text := public._normalize_phone(p_phone); n int;
BEGIN
  IF v IS NULL THEN PERFORM public._fail('Invalid phone number.'); END IF;
  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{6}$' THEN PERFORM public._fail('The new PIN must be 6 digits.'); END IF;
  UPDATE auth.users
     SET encrypted_password = extensions.crypt('uf1:' || p_new_pin || ':' || substr(v, 2), extensions.gen_salt('bf'))
   WHERE email = substr(v, 2) || '@phone.urbanfix.app';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN PERFORM public._fail('No account with that phone number.'); END IF;
  RETURN 'PIN reset. Ask them to sign in with the new PIN, then keep it private.';
END $$;

-- ---------------------------------------------------------------------------
-- 9. Row level security (read access only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY technicians_read ON public.technicians FOR SELECT TO authenticated
  USING (id = auth.uid() OR status = 'approved' OR public.is_admin());
CREATE POLICY technician_private_read ON public.technician_private FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY repair_options_read ON public.repair_options FOR SELECT TO authenticated USING (true);
CREATE POLICY services_read ON public.services FOR SELECT TO authenticated
  USING (technician_id = auth.uid() OR public.is_admin()
         OR (is_active AND EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = technician_id AND t.status = 'approved')));
CREATE POLICY settings_read ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY jobs_read ON public.jobs FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR technician_id = auth.uid() OR public.is_admin());
CREATE POLICY job_events_read ON public.job_events FOR SELECT TO authenticated USING (public.can_see_job(job_id));
CREATE POLICY messages_read ON public.messages FOR SELECT TO authenticated USING (public.can_see_job(job_id));
CREATE POLICY reviews_read ON public.reviews FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR technician_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 11. Storage: private buckets, write-once evidence
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('job-photos', 'job-photos', false, 5242880, ARRAY['image/jpeg', 'image/png']),
       ('id-documents', 'id-documents', false, 5242880, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
                               allowed_mime_types = EXCLUDED.allowed_mime_types;

-- A technician may upload photos only for their own job, and only while it is at the
-- intake (paid) or repair (in_repair) stage. Path: "<job_id>/<file>".
CREATE FUNCTION public.storage_can_upload_job_photo(p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = public._safe_uuid(split_part(p_name, '/', 1))
      AND j.technician_id = auth.uid()
      AND j.status IN ('paid', 'in_repair')
  ) AND p_name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png)$'
$$;

CREATE FUNCTION public.storage_can_upload_id_document(p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT split_part(p_name, '/', 1) = auth.uid()::text
     AND p_name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png)$'
     AND EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = auth.uid() AND t.status IN ('draft', 'pending', 'rejected'))
$$;

CREATE POLICY urbanfix_job_photos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-photos' AND public.storage_can_upload_job_photo(name));
CREATE POLICY urbanfix_job_photos_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'job-photos' AND public.can_see_job(public._safe_uuid(split_part(name, '/', 1))));
CREATE POLICY urbanfix_id_documents_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'id-documents' AND public.storage_can_upload_id_document(name));
CREATE POLICY urbanfix_id_documents_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'id-documents' AND (split_part(name, '/', 1) = auth.uid()::text OR public.is_admin()));
-- No UPDATE or DELETE policies: uploaded evidence can't be replaced or removed from the app.

-- ---------------------------------------------------------------------------
-- 12. Auto-release schedule (only if pg_cron is enabled on the project)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'urbanfix-auto-release';
    PERFORM cron.schedule('urbanfix-auto-release', '*/30 * * * *', 'SELECT public._auto_release()');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 13. Privileges: start from nothing, then grant exactly what the app needs
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT ON public.profiles, public.technicians, public.technician_private, public.repair_options,
                public.services, public.settings, public.jobs, public.job_events, public.messages, public.reviews
TO authenticated;

-- Helpers used inside RLS policies must be executable by the querying role.
GRANT EXECUTE ON FUNCTION public.is_admin(), public.can_see_job(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.phone_registered(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.complete_signup(text, text, text, text),
  public.update_my_profile(text, text, text),
  public.save_shop(text, text, text, text),
  public.save_service(text, text, bigint, boolean),
  public.remove_service(text, text),
  public.save_payout_details(text, text, text),
  public.save_identity(text, text),
  public.submit_for_review(),
  public.set_availability(boolean),
  public.find_technicians(text, text),
  public.create_job(uuid, text, text, text, text, text, text, text),
  public.accept_job(uuid),
  public.decline_job(uuid, text),
  public.cancel_job(uuid, text),
  public.submit_payment(uuid, text),
  public.record_intake(uuid, text, text, text[]),
  public.mark_ready(uuid, text, text, text[]),
  public.confirm_completion(uuid),
  public.raise_dispute(uuid, text),
  public.submit_review(uuid, int, text),
  public.send_message(uuid, text),
  public.get_job(uuid),
  public.my_jobs(),
  public.my_earnings(),
  public.admin_review_technician(uuid, boolean, text),
  public.admin_confirm_payment(uuid),
  public.admin_reject_payment(uuid, text),
  public.admin_resolve_dispute(uuid, text, text, text),
  public.admin_mark_payout_paid(uuid, text),
  public.admin_auto_release(),
  public.admin_technician_details(uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.storage_can_upload_job_photo(text), public.storage_can_upload_id_document(text),
                          public._safe_uuid(text) TO authenticated;

-- Tell the Supabase API to pick up the new schema immediately.
NOTIFY pgrst, 'reload schema';
