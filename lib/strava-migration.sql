-- Strava integration migration
-- Run this in the Supabase SQL editor

-- 1. Create strava_connections table
CREATE TABLE IF NOT EXISTS strava_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Enable RLS
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;

-- 3. RLS policy - users can only manage their own connections
CREATE POLICY "Users can manage own strava connections"
  ON strava_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Add strava to the verification_method constraint on workouts
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_verification_method_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_verification_method_check
  CHECK (verification_method IN (
    'apple_health',
    'google_fit',
    'garmin',
    'fitbit',
    'gps',
    'photo',
    'unverified',
    'strava'
  ));
