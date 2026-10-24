-- Garmin Health API (direct) integration migration
-- Run this in the Supabase SQL editor. Safe to re-run.

-- 1. OAuth2 tokens per user
CREATE TABLE IF NOT EXISTS public.garmin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  garmin_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(garmin_user_id)
);

ALTER TABLE public.garmin_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own garmin connection" ON public.garmin_connections;
CREATE POLICY "Users read own garmin connection"
  ON public.garmin_connections FOR SELECT
  USING (auth.uid() = user_id);
-- Inserts/updates/deletes happen server-side with the service role.

-- 2. Every activity Garmin pushes, keyed on summaryId. This is the dedupe
--    ledger: a summaryId that is already here is never credited twice.
CREATE TABLE IF NOT EXISTS public.garmin_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  garmin_user_id TEXT NOT NULL,
  summary_id TEXT NOT NULL UNIQUE,
  activity_id BIGINT,
  activity_type TEXT,
  activity_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER,
  calories INTEGER,
  heart_rate_avg INTEGER,
  credited BOOLEAN DEFAULT FALSE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS garmin_activities_user_start_idx
  ON public.garmin_activities (user_id, start_time DESC);

ALTER TABLE public.garmin_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own garmin activities" ON public.garmin_activities;
CREATE POLICY "Users read own garmin activities"
  ON public.garmin_activities FOR SELECT
  USING (auth.uid() = user_id);

-- 3. connected_devices / workouts already allow 'garmin' (see terra-migration.sql
--    and strava-migration.sql). Re-assert in case this runs on a fresh DB.
ALTER TABLE public.connected_devices DROP CONSTRAINT IF EXISTS connected_devices_type_check;
ALTER TABLE public.connected_devices ADD CONSTRAINT connected_devices_type_check
  CHECK (type IN ('apple_health', 'google_fit', 'gps', 'photo', 'garmin', 'fitbit', 'polar', 'whoop', 'oura', 'strava'));

ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS workouts_verification_method_check;
ALTER TABLE public.workouts ADD CONSTRAINT workouts_verification_method_check
  CHECK (verification_method IN ('apple_health', 'google_fit', 'gps', 'photo', 'unverified', 'garmin', 'fitbit', 'polar', 'whoop', 'oura', 'strava'));

-- 4. increment_user_points RPC is defined in terra-migration.sql. Re-create if missing.
CREATE OR REPLACE FUNCTION increment_user_points(p_user_id UUID, p_points INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET
    points_balance = points_balance + p_points,
    points_lifetime_earned = points_lifetime_earned + p_points
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
