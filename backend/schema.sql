CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS pois (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    location geometry(Point, 4326),
    radius_meters INTEGER NOT NULL DEFAULT 10 CHECK (radius_meters > 0),
    cooldown_seconds INTEGER NOT NULL DEFAULT 300 CHECK (cooldown_seconds >= 0),
    description TEXT,
    history TEXT,
    audio_guide_url VARCHAR(255),
    opening_hours VARCHAR(50),
    time_category VARCHAR(100),
    environment VARCHAR(20),
    avg_duration_minutes INTEGER NOT NULL DEFAULT 30,
    price_min INTEGER NOT NULL DEFAULT 0,
    price_max INTEGER NOT NULL DEFAULT 0,
    menu_highlights TEXT,
    rating NUMERIC(2, 1) NOT NULL DEFAULT 0.0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    notification_title VARCHAR(150),
    notification_body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

UPDATE pois
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE location IS NULL;

ALTER TABLE pois ALTER COLUMN location DROP NOT NULL;

CREATE OR REPLACE FUNCTION set_poi_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pois_location_trigger ON pois;

CREATE TRIGGER pois_location_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON pois
FOR EACH ROW
EXECUTE FUNCTION set_poi_location();

CREATE INDEX IF NOT EXISTS idx_pois_location ON pois USING GIST (location);
