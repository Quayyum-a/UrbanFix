-- UrbanFix 005: part-quality wording that fits the part.
-- Before this, every repair (battery, keyboard, charging port...) showed the
-- screen wording ("Screens can be a little less bright..."). Now each kind of
-- part has its own Standard / High quality / Premium description.
-- Safe to run more than once. Wording you edit later in part_grade_texts is kept.

CREATE TABLE IF NOT EXISTS public.part_grade_texts (
  device_type text NOT NULL DEFAULT '',   -- '' = any device
  category    text NOT NULL,
  grade       public.part_grade NOT NULL,
  description text NOT NULL CHECK (length(description) BETWEEN 5 AND 200),
  PRIMARY KEY (device_type, category, grade)
);
ALTER TABLE public.part_grade_texts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.part_grade_texts FROM anon, authenticated;

INSERT INTO public.part_grade_texts (device_type, category, grade, description) VALUES
  -- Phone screens
  ('smartphone', 'screen_replacement', 'standard', 'Works well and costs least. Can be a little less bright or sharp than the original screen.'),
  ('smartphone', 'screen_replacement', 'high',     'Better screen, close to the original colour and touch.'),
  ('smartphone', 'screen_replacement', 'premium',  'Top grade (e.g. GX OLED). The closest you can get to the original screen.'),
  -- Other screens (laptops, tablets, or a model that isn't listed)
  ('', 'screen_replacement', 'standard', 'Compatible screen. Clear picture and costs least.'),
  ('', 'screen_replacement', 'high',     'Better screen with brighter, sharper colours.'),
  ('', 'screen_replacement', 'premium',  'Original-grade screen, the closest you can get to the one your device came with.'),
  -- Batteries
  ('', 'battery_replacement', 'standard', 'Regular replacement battery. Gets you through the day and costs least.'),
  ('', 'battery_replacement', 'high',     'Branded, higher-capacity battery. Lasts longer between charges.'),
  ('', 'battery_replacement', 'premium',  'Original-grade battery. Same capacity and battery health as new.'),
  -- Charging ports / power
  ('', 'charging_port', 'standard', 'Compatible charging port. Charges normally and costs least.'),
  ('', 'charging_port', 'high',     'Stronger port that holds the cable firmly and lasts longer.'),
  ('', 'charging_port', 'premium',  'Original-grade port with full fast charging.'),
  ('', 'power_supply', 'standard', 'Basic power supply. Powers your computer and costs least.'),
  ('', 'power_supply', 'high',     'Branded power supply, steadier power and quieter.'),
  ('', 'power_supply', 'premium',  'Top-grade power supply with extra protection for your parts.'),
  -- Phone parts
  ('', 'back_glass', 'standard', 'Compatible back glass. Looks right and costs least.'),
  ('', 'back_glass', 'high',     'Better glass with a closer colour and finish.'),
  ('', 'back_glass', 'premium',  'Original-grade glass with the original finish.'),
  ('', 'camera', 'standard', 'Compatible camera. Clear photos and costs least.'),
  ('', 'camera', 'high',     'Better camera with sharper photos, close to the original.'),
  ('', 'camera', 'premium',  'Original-grade camera, same photo quality as new.'),
  ('', 'speaker', 'standard', 'Compatible speaker or mic. Clear sound and costs least.'),
  ('', 'speaker', 'high',     'Better speaker or mic, louder and clearer.'),
  ('', 'speaker', 'premium',  'Original-grade speaker or mic, sounds like new.'),
  ('', 'buttons', 'standard', 'Compatible buttons. Work well and cost least.'),
  ('', 'buttons', 'high',     'Better buttons with a firmer click.'),
  ('', 'buttons', 'premium',  'Original-grade buttons, feel like new.'),
  -- Laptop parts
  ('', 'keyboard_replacement', 'standard', 'Compatible keyboard or touchpad. Works well and costs least.'),
  ('', 'keyboard_replacement', 'high',     'Better keyboard with firmer keys, close to the original feel.'),
  ('', 'keyboard_replacement', 'premium',  'Original-grade keyboard, same layout and backlight as new.'),
  ('', 'hinge_repair', 'standard', 'Compatible hinge. Opens and closes smoothly and costs least.'),
  ('', 'hinge_repair', 'high',     'Stronger hinge that stays firm longer.'),
  ('', 'hinge_repair', 'premium',  'Original-grade hinge, feels like new.'),
  ('', 'overheating', 'standard', 'Cleaning, fresh thermal paste and a compatible fan if needed.'),
  ('', 'overheating', 'high',     'Cleaning, better thermal paste and a quieter branded fan if needed.'),
  ('', 'overheating', 'premium',  'Cleaning, top thermal paste and an original-grade fan if needed.'),
  ('', 'storage_upgrade', 'standard', 'Budget SSD or RAM. Faster for everyday use and costs least.'),
  ('', 'storage_upgrade', 'high',     'Branded SSD or RAM (e.g. Samsung, Kingston, Crucial). Faster and more reliable.'),
  ('', 'storage_upgrade', 'premium',  'Top-tier SSD or RAM. The fastest and longest-lasting.'),
  ('', 'motherboard_repair', 'standard', 'Repair with compatible parts. Costs least.'),
  ('', 'motherboard_repair', 'high',     'Repair with better, branded parts.'),
  ('', 'motherboard_repair', 'premium',  'Repair with original-grade parts where available.'),
  ('', 'water_damage', 'standard', 'Cleaning and compatible parts for anything the water damaged.'),
  ('', 'water_damage', 'high',     'Cleaning and better quality parts for anything the water damaged.'),
  ('', 'water_damage', 'premium',  'Cleaning and original-grade parts for anything the water damaged.')
ON CONFLICT (device_type, category, grade) DO NOTHING;

-- The fallback wording no longer talks about screens. Only the old seeded text
-- is replaced, so a description an admin wrote stays.
UPDATE public.part_grades SET description = 'Compatible part. Works well and costs least.'
  WHERE grade = 'standard' AND description = 'Works well and costs least. Screens can be a little less bright or sharp than the original.';
UPDATE public.part_grades SET description = 'Better quality part, close to the original.'
  WHERE grade = 'high' AND description = 'Better parts, close to the original look and feel.';
UPDATE public.part_grades SET description = 'Original-grade part. The closest you can get to the original.'
  WHERE grade = 'premium' AND description = 'Top grade (e.g. GX OLED screens). The closest you can get to the original part.';

-- Description for one device, repair and grade: device-specific, then any device, then the fallback.
CREATE OR REPLACE FUNCTION public._grade_text(p_device_type text, p_category text, p_grade public.part_grade)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(
    (SELECT description FROM public.part_grade_texts WHERE device_type = COALESCE(p_device_type, '') AND category = p_category AND grade = p_grade),
    (SELECT description FROM public.part_grade_texts WHERE device_type = '' AND category = p_category AND grade = p_grade),
    (SELECT description FROM public.part_grades WHERE grade = p_grade))
$$;
REVOKE EXECUTE ON FUNCTION public._grade_text(text, text, public.part_grade) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.grade_options(p_model_id bigint, p_category text)
RETURNS TABLE (grade public.part_grade, label text, description text, warranty_days int, market_label text,
               part_kobo int, price_updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_device text;
BEGIN
  PERFORM public._uid();
  SELECT m.device_type INTO v_device FROM public.device_models m WHERE m.id = p_model_id;
  RETURN QUERY
  SELECT g.grade, g.label, public._grade_text(v_device, p_category, g.grade), g.warranty_days,
         pp.market_label, pp.price_kobo, pp.updated_at
  FROM public.part_grades g
  LEFT JOIN public.part_prices pp ON pp.model_id = p_model_id AND pp.category = p_category AND pp.grade = g.grade
  ORDER BY g.sort_order;
END $$;

NOTIFY pgrst, 'reload schema';
