BEGIN;

CREATE TABLE IF NOT EXISTS public.poi_ratings (
    id BIGSERIAL PRIMARY KEY,
    poi_id VARCHAR(10) NOT NULL REFERENCES public.pois(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (poi_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poi_ratings_poi_rating
ON public.poi_ratings (poi_id, rating);

CREATE OR REPLACE FUNCTION public.refresh_poi_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    affected_poi_id VARCHAR(10);
    average_rating NUMERIC(2, 1);
    review_count INTEGER;
BEGIN
    affected_poi_id := COALESCE(NEW.poi_id, OLD.poi_id);

    SELECT
        COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0),
        COUNT(*)
    INTO average_rating, review_count
    FROM public.poi_ratings
    WHERE poi_id = affected_poi_id;

    UPDATE public.pois
    SET rating = average_rating,
        reviews_count = review_count
    WHERE id = affected_poi_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS poi_ratings_refresh_insert ON public.poi_ratings;
DROP TRIGGER IF EXISTS poi_ratings_refresh_update ON public.poi_ratings;
DROP TRIGGER IF EXISTS poi_ratings_refresh_delete ON public.poi_ratings;

CREATE TRIGGER poi_ratings_refresh_insert
AFTER INSERT OR UPDATE OR DELETE ON public.poi_ratings
FOR EACH ROW
EXECUTE FUNCTION public.refresh_poi_rating();

UPDATE public.pois p
SET rating = COALESCE(summary.average_rating, p.rating),
    reviews_count = COALESCE(summary.review_count, p.reviews_count)
FROM (
    SELECT
        poi_id,
        ROUND(AVG(rating)::NUMERIC, 1) AS average_rating,
        COUNT(*) AS review_count
    FROM public.poi_ratings
    GROUP BY poi_id
) summary
WHERE p.id = summary.poi_id;

COMMIT;
