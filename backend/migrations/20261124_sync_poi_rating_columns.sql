-- Make pois.rating / pois.reviews_count reflect real user ratings for EVERY POI.
--
-- 20261121_poi_ratings.sql only backfilled POIs that already had rows in poi_ratings
-- (WHERE p.id = summary.poi_id), so unrated POIs kept the PB03 CSV seed values
-- (e.g. 4.4 / 5800). From here on the refresh_poi_rating() trigger keeps them in sync.
-- Unrated POIs become rating 0.0 and 0 reviews, which the app shows as "Belum ada rating".
-- The original seed values remain available in data/dataset_poi_braga_pb03.csv.
BEGIN;

UPDATE public.pois p
SET rating = COALESCE((
        SELECT ROUND(AVG(r.rating)::NUMERIC, 1)
        FROM public.poi_ratings r
        WHERE r.poi_id = p.id
    ), 0),
    reviews_count = (
        SELECT COUNT(*)
        FROM public.poi_ratings r
        WHERE r.poi_id = p.id
    );

COMMIT;
