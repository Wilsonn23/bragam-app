-- Menu items per POI (one row per dish/drink), shown in the detail screen's Menu tab.
-- pois.menu_highlights stays as the short summary; this table holds the full list.
--
-- price_idr is NULL when the item is known but its price is not.
-- source / source_url / checked_on record where each item and price came from:
-- prices from delivery apps (GoFood) are usually higher than in-store prices.
BEGIN;

CREATE TABLE IF NOT EXISTS public.poi_menu_items (
    id BIGSERIAL PRIMARY KEY,
    poi_id VARCHAR(10) NOT NULL REFERENCES public.pois(id) ON DELETE CASCADE,
    category VARCHAR(60) NOT NULL DEFAULT 'Menu',
    name VARCHAR(120) NOT NULL,
    description TEXT,
    price_idr INTEGER CHECK (price_idr IS NULL OR price_idr >= 0),
    source VARCHAR(120) NOT NULL,
    source_url TEXT CHECK (source_url IS NULL OR source_url ~* '^https?://'),
    checked_on DATE NOT NULL DEFAULT CURRENT_DATE,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (poi_id, category, name)
);

CREATE INDEX IF NOT EXISTS idx_poi_menu_items_poi
ON public.poi_menu_items (poi_id, sort_order);

-- Same as the other POI tables: the backend connects as the database owner, and
-- nothing is exposed to Supabase's public API roles without an explicit policy.
ALTER TABLE public.poi_menu_items ENABLE ROW LEVEL SECURITY;

COMMIT;
