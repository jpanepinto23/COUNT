-- Terra / Fitness Tracker Integration Migration
-- Run this in your Supabase SQL editor after the initial schema

-- 1. Update connected_devices to support Terra providers
ALTER TABLE public.connected_devices
  DROP CONSTRAINT IF EXISTS connected_devices_type_check;

ALTER TABLE public.connected_devices
  ADD CONSTRAINT connected_devices_type_check
  CHECK (type IN ('apple_health', 'google_fit', 'gps', 'photo', 'garmin', 'fitbit', 'polar', 'whoop', 'oura'));

-- 2. Add Terra-specific columns to connected_devices
ALTER TABLE public.connected_devices
  ADD COLUMN IF NOT EXISTS terra_user_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT;

-- 3. Update workouts verification_method constraint to include tracker types
ALTER TABLE public.workouts
  DROP CONSTRAINT IF EXISTS workouts_verification_method_check;

ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_verification_method_check
  CHECK (verification_method IN ('apple_health', 'google_fit', 'gps', 'photo', 'unverified', 'garmin', 'fitbit', 'polar', 'whoop', 'oura'));

-- 4. Create terra_activities table to cache incoming webhook data
CREATE TABLE IF NOT EXISTS public.terra_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  terra_user_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  activity_type TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  calories INTEGER,
  heart_rate_avg INTEGER,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id)
);

ALTER TABLE public.terra_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own terra activities"
  ON public.terra_activities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert terra activities"
  ON public.terra_activities
  FOR INSERT
  WITH CHECK (true);

-- 5. Helper RPC to increment user points (used by webhook handler)
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

