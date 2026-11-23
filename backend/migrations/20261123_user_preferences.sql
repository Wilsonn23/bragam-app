-- Per-user recommendation preferences (interests, visit time, environment, budget, factor weights).
-- Shape is validated by backend/routes/preferences.js; stored as JSONB so new fields need no migration.
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

COMMIT;
