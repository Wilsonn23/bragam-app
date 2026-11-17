-- Shared GPS testing copy of P11. Run explicitly; never at API startup.
-- DML only: does not alter tables, policies, or the original CityWalk.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
SELECT pg_advisory_xact_lock(hashtext('bragam:shared-citywalk-gps'));

DO $check$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pois WHERE id = 'P11' AND name = 'Braga CityWalk') THEN
    RAISE EXCEPTION 'CityWalk source P11 is missing or has changed identity';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.pois WHERE id = 'TEST-LOCAL'
      AND (name IS DISTINCT FROM 'Braga CityWalk (Uji GPS)'
        OR latitude IS DISTINCT FROM -6.890389::double precision
        OR longitude IS DISTINCT FROM 107.609583::double precision)
  ) THEN
    RAISE EXCEPTION 'TEST-LOCAL is already occupied; refusing to overwrite it';
  END IF;
END;
$check$;

INSERT INTO public.pois (
  id, name, category, latitude, longitude, location, radius_meters, cooldown_seconds,
  description, address, history, image_url, audio_guide_url, opening_hours,
  time_category, environment, avg_duration_minutes, price_min, price_max,
  menu_highlights, rating, reviews_count, notification_title, notification_body
)
SELECT
  'TEST-LOCAL', 'Braga CityWalk (Uji GPS)', category, -6.890389, 107.609583,
  ST_SetSRID(ST_MakePoint(107.609583, -6.890389), 4326), radius_meters, cooldown_seconds,
  description, address, history, image_url, audio_guide_url, opening_hours,
  time_category, environment, avg_duration_minutes, price_min, price_max,
  menu_highlights, rating, reviews_count, notification_title, notification_body
FROM public.pois WHERE id = 'P11'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.poi_images (poi_id, image_url, alt_text, sort_order)
SELECT 'TEST-LOCAL', source.image_url, source.alt_text, source.sort_order
FROM public.poi_images source
WHERE source.poi_id = 'P11'
  AND NOT EXISTS (
    SELECT 1 FROM public.poi_images existing
    WHERE existing.poi_id = 'TEST-LOCAL'
      AND existing.image_url = source.image_url AND existing.sort_order = source.sort_order
  );

COMMIT;
