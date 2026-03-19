-- COUNT MVP Database Schema
-- Run this in your Supabase SQL editor

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  height NUMERIC,
  weight NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  lifetime_sessions INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  multiplier NUMERIC DEFAULT 1.0,
  points_balance INTEGER DEFAULT 0,
  points_lifetime_earned INTEGER DEFAULT 0,
  free_unverified_remaining INTEGER DEFAULT 5
);

-- Connected devices
CREATE TABLE IF NOT EXISTS public.connected_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('apple_health', 'google_fit', 'gps', 'photo')),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
  UNIQUE(user_id, type)
);

-- Workouts
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'cardio', 'hiit', 'custom')),
  custom_name TEXT,
  duration_minutes INTEGER NOT NULL,
  verification_method TEXT NOT NULL CHECK (verification_method IN ('apple_health', 'google_fit', 'gps', 'photo', 'unverified')),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  heart_rate_avg INTEGER,
  calories INTEGER,
  base_points INTEGER NOT NULL,
  multiplier_applied NUMERIC NOT NULL,
  total_points_earned INTEGER NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards catalog
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  point_cost INTEGER NOT NULL,
  retail_value NUMERIC NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('supplements', 'gear', 'gift_cards', 'lifestyle')),
  affiliate_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_hot BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redemptions
CREATE TABLE IF NOT EXISTS public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id),
  points_spent INTEGER NOT NULL,
  affiliate_link_generated TEXT,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly leaderboard (computed/cached)
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM
  points_earned_this_month INTEGER DEFAULT 0,
  rank INTEGER,
  UNIQUE(user_id, month)
);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Users can read limited public profile data for leaderboard (name, tier, streak)
CREATE POLICY "Users public profile read" ON public.users FOR SELECT USING (true);
-- Users can only modify their own data
CREATE POLICY "Users own data write" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users own data update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users own data delete" ON public.users FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Users own devices" ON public.connected_devices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own redemptions" ON public.redemptions FOR ALL USING (auth.uid() = user_id);

-- Rewards are public (read-only for users)
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards are public" ON public.rewards FOR SELECT USING (true);

-- Leaderboard is public (read) but users write their own
CREATE POLICY "Leaderboard read" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Leaderboard write own" ON public.leaderboard FOR ALL USING (auth.uid() = user_id);

-- Seed some rewards
INSERT INTO public.rewards (brand_name, product_name, description, image_url, point_cost, retail_value, category, affiliate_url, is_active, is_featured, is_new)
VALUES
  ('Amazon', '$10 Gift Card', 'Spend it on anything at Amazon.com', 'https://placehold.co/200x200/111110/F5F0EA?text=Amazon', 1000, 10, 'gift_cards', 'https://amazon.com', true, true, false),
  ('Amazon', '$25 Gift Card', 'Spend it on anything at Amazon.com', 'https://placehold.co/200x200/111110/F5F0EA?text=Amazon', 2500, 25, 'gift_cards', 'https://amazon.com', true, false, false),
  ('Amazon', '$50 Gift Card', 'Spend it on anything at Amazon.com', 'https://placehold.co/200x200/111110/F5F0EA?text=Amazon', 5000, 50, 'gift_cards', 'https://amazon.com', true, false, false),
  ('Transparent Labs', 'Whey Protein (2lb)', 'Premium whey protein isolate', 'https://placehold.co/200x200/B5593C/F5F0EA?text=TL', 3000, 59.99, 'supplements', 'https://transparentlabs.com', true, true, true),
  ('Transparent Labs', 'Pre-Workout', 'Science-backed pre-workout formula', 'https://placehold.co/200x200/B5593C/F5F0EA?text=TL', 2200, 44.99, 'supplements', 'https://transparentlabs.com', true, false, true)
ON CONFLICT DO NOTHING;

-- Function to update leaderboard on new workout
CREATE OR REPLACE FUNCTION update_leaderboard_on_workout()
RETURNS TRIGGER AS $$
DECLARE
  current_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  INSERT INTO public.leaderboard (user_id, month, points_earned_this_month)
  VALUES (NEW.user_id, current_month, NEW.total_points_earned)
  ON CONFLICT (user_id, month)
  DO UPDATE SET points_earned_this_month = leaderboard.points_earned_this_month + NEW.total_points_earned;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workout_logged
AFTER INSERT ON public.workouts
FOR EACH ROW EXECUTE FUNCTION update_leaderboard_on_workout();
