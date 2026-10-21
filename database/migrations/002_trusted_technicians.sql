-- =============================================================================
-- 002: Add technicians you already trust, skipping the in-app approval steps.
--
-- Run this whole file once in the Supabase SQL editor (after urbanfix.sql).
-- It is safe to run again. It only ADDS/UPDATES functions; no data is lost.
--
-- Then add each technician with one line, for example:
--   SELECT public.admin_add_trusted_technician(
--     '08012345678', 'Tobi Adeyemi', 'Tobi Phone Clinic', '7 Otigba Street, Computer Village, Ikeja', 'Ikeja',
--     '[["smartphone","screen_replacement",35000],["smartphone","diagnosis",3000]]');
--
-- The result shows the PIN they sign in with (only for newly created accounts).
-- Give it to them privately. Prices are in naira; they can change them in the
-- app under Account → "Shop, prices, bank and ID".
-- =============================================================================

-- A random 6-digit PIN that passes the app's "not too easy" rules.
CREATE OR REPLACE FUNCTION public._random_pin() RETURNS text
LANGUAGE plpgsql VOLATILE AS $$
DECLARE p text;
BEGIN
  LOOP
    p := lpad(floor(random() * 1000000)::int::text, 6, '0');
    EXIT WHEN p !~ '^(.)\1+$'
      AND p NOT IN ('012345', '123456', '234567', '345678', '456789', '987654', '876543', '765432', '654321', '543210',
                    '123123', '121212', '112233', '696969', '123321', '102030', '100200');
  END LOOP;
  RETURN p;
END $$;

CREATE OR REPLACE FUNCTION public.admin_add_trusted_technician(
  p_phone text,
  p_full_name text,
  p_shop_name text,
  p_shop_address text,
  p_area text,
  p_services jsonb,                    -- [["device_type","category",price_in_naira], ...]
  p_bank_name text DEFAULT NULL,
  p_account_number text DEFAULT NULL,
  p_account_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE
  v_phone text := public._normalize_phone(p_phone);
  v_email text;
  v_name text := public._clean(p_full_name);
  v_shop text := coalesce(public._clean(p_shop_name), public._clean(p_full_name));
  v_addr text := public._clean(p_shop_address);
  v_area text := public._clean(p_area);
  v_uid uuid;
  v_pin text;
  v_role public.user_role;
  v_item jsonb;
  v_dev text; v_cat text; v_naira numeric;
  v_count int := 0;
  v_acct text := nullif(regexp_replace(coalesce(p_account_number, ''), '\s', '', 'g'), '');
  col text;
BEGIN
  -- ---- validate everything before touching anything
  IF v_phone IS NULL THEN PERFORM public._fail('Invalid Nigerian phone number: ' || coalesce(p_phone, 'null')); END IF;
  IF NOT public._valid_name(v_name) THEN PERFORM public._fail('Invalid name (letters only, at least 2): ' || coalesce(p_full_name, 'null')); END IF;
  IF char_length(v_shop) NOT BETWEEN 2 AND 80 THEN PERFORM public._fail('Shop name must be 2 to 80 characters.'); END IF;
  IF v_addr IS NULL OR char_length(v_addr) NOT BETWEEN 10 AND 200 THEN PERFORM public._fail('Shop address must be 10 to 200 characters.'); END IF;
  IF v_area IS NULL OR char_length(v_area) NOT BETWEEN 2 AND 60 THEN PERFORM public._fail('Area must be 2 to 60 characters.'); END IF;
  IF p_services IS NULL OR jsonb_typeof(p_services) <> 'array' OR jsonb_array_length(p_services) = 0 THEN
    PERFORM public._fail('Give at least one repair and price, like [["smartphone","diagnosis",3000]].');
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_services) LOOP
    IF jsonb_typeof(v_item) <> 'array' OR jsonb_array_length(v_item) <> 3 THEN
      PERFORM public._fail('Each repair must look like ["smartphone","screen_replacement",35000]. Got: ' || v_item::text);
    END IF;
    v_dev := v_item ->> 0; v_cat := v_item ->> 1;
    IF NOT EXISTS (SELECT 1 FROM public.repair_options WHERE device_type = v_dev AND category = v_cat) THEN
      PERFORM public._fail('Unknown repair: ' || v_item::text || '. See the list in public.repair_options.');
    END IF;
    IF jsonb_typeof(v_item -> 2) <> 'number' THEN PERFORM public._fail('Price must be a number in naira: ' || v_item::text); END IF;
    v_naira := (v_item ->> 2)::numeric;
    IF v_naira <> trunc(v_naira) OR v_naira < 500 OR v_naira > 5000000 THEN
      PERFORM public._fail('Price must be whole naira between 500 and 5,000,000: ' || v_item::text);
    END IF;
  END LOOP;
  IF v_acct IS NOT NULL OR p_bank_name IS NOT NULL OR p_account_name IS NOT NULL THEN
    IF public._clean(p_bank_name) IS NULL THEN PERFORM public._fail('Bank name missing.'); END IF;
    IF v_acct IS NULL OR v_acct !~ '^[0-9]{10}$' THEN PERFORM public._fail('Account number must be 10 digits.'); END IF;
    IF NOT public._valid_name(public._clean(p_account_name)) THEN PERFORM public._fail('Account name missing or invalid.'); END IF;
  END IF;

  -- ---- sign-in account: reuse if they already signed up in the app, else create one
  v_email := substr(v_phone, 2) || '@phone.urbanfix.app';
  SELECT id INTO v_uid FROM auth.users WHERE email = v_email;
  IF v_uid IS NULL THEN
    v_pin := public._random_pin();
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
            extensions.crypt('uf1:' || v_pin || ':' || substr(v_phone, 2), extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    -- Supabase Auth fails to sign in users whose token columns are NULL; set any that exist to ''.
    FOR col IN SELECT column_name FROM information_schema.columns
               WHERE table_schema = 'auth' AND table_name = 'users'
                 AND column_name IN ('confirmation_token', 'recovery_token', 'email_change_token_new', 'email_change',
                                     'email_change_token_current', 'phone_change', 'phone_change_token', 'reauthentication_token') LOOP
      EXECUTE format('UPDATE auth.users SET %I = '''' WHERE id = $1 AND %I IS NULL', col, col) USING v_uid;
    END LOOP;
    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, v_uid::text, 'email',
            jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
            now(), now(), now());
  END IF;

  -- ---- profile and technician record
  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NOT NULL AND v_role <> 'technician' THEN
    PERFORM public._fail('That number is already registered as a ' || v_role::text || '. Use a different number.');
  END IF;
  INSERT INTO public.profiles (id, role, full_name, phone, area)
  VALUES (v_uid, 'technician', v_name, v_phone, v_area)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, area = EXCLUDED.area;
  INSERT INTO public.technicians (id) VALUES (v_uid) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.technician_private (id) VALUES (v_uid) ON CONFLICT (id) DO NOTHING;

  UPDATE public.technicians
     SET shop_name = v_shop, shop_address = v_addr, area = v_area,
         status = 'approved', status_reason = 'Added directly by UrbanFix admin', is_available = true,
         submitted_at = coalesce(submitted_at, now()), reviewed_at = now(), reviewed_by = NULL
   WHERE id = v_uid;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_services) LOOP
    INSERT INTO public.services (technician_id, device_type, category, price_kobo, is_active)
    VALUES (v_uid, v_item ->> 0, v_item ->> 1, ((v_item ->> 2)::numeric * 100)::int, true)
    ON CONFLICT (technician_id, device_type, category)
    DO UPDATE SET price_kobo = EXCLUDED.price_kobo, is_active = true;
    v_count := v_count + 1;
  END LOOP;

  IF v_acct IS NOT NULL THEN
    UPDATE public.technician_private
       SET bank_name = public._clean(p_bank_name), account_number = v_acct, account_name = public._clean(p_account_name)
     WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'name', v_name,
    'phone', v_phone,
    'pin', coalesce(v_pin, '(existing account: they keep the PIN they created)'),
    'repairs_listed', v_count,
    'bank_details', CASE WHEN v_acct IS NOT NULL THEN 'saved' ELSE 'not yet: they add it in the app before their first payout' END
  );
END $$;

-- Trusted technicians may have been added without bank details. Let any approved
-- technician add bank details ONCE (when none are saved); changing them later
-- still needs support, so a stolen account can't redirect payouts.
CREATE OR REPLACE FUNCTION public.save_payout_details(p_bank_name text, p_account_number text, p_account_name text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._require_role('technician');
  v_bank text := public._clean(p_bank_name);
  v_acct text := regexp_replace(coalesce(p_account_number, ''), '\s', '', 'g');
  v_name text := public._clean(p_account_name);
  v_status public.tech_status;
  v_existing text;
BEGIN
  SELECT t.status, p.account_number INTO v_status, v_existing
    FROM public.technicians t JOIN public.technician_private p ON p.id = t.id
   WHERE t.id = v_uid FOR UPDATE OF t;
  IF NOT (v_status IN ('draft', 'pending', 'rejected') OR (v_status = 'approved' AND v_existing IS NULL)) THEN
    PERFORM public._fail('To change bank details after approval, contact UrbanFix support.');
  END IF;
  IF v_bank IS NULL OR char_length(v_bank) NOT BETWEEN 2 AND 60 THEN PERFORM public._fail('Choose your bank.'); END IF;
  IF v_acct !~ '^[0-9]{10}$' THEN PERFORM public._fail('Account number must be 10 digits.'); END IF;
  IF v_acct ~ '^(.)\1+$' THEN PERFORM public._fail('Enter your real account number.'); END IF;
  IF NOT public._valid_name(v_name) THEN PERFORM public._fail('Enter the account name exactly as your bank shows it.'); END IF;
  UPDATE public.technician_private SET bank_name = v_bank, account_number = v_acct, account_name = v_name WHERE id = v_uid;
END $$;

-- New functions are executable by everyone by default in Postgres; these are
-- SQL-editor-only (admin_add_trusted_technician) or internal (_random_pin).
REVOKE ALL ON FUNCTION public._random_pin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_add_trusted_technician(text, text, text, text, text, jsonb, text, text, text) FROM PUBLIC, anon, authenticated;
-- save_payout_details keeps its existing grant (authenticated only).
REVOKE ALL ON FUNCTION public.save_payout_details(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_payout_details(text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
