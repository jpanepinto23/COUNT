-- ============================================================================
-- Migration 001 — Friends graph + workout reactions
-- ============================================================================
-- Apply this in the Supabase SQL editor BEFORE deploying the API routes.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------- public.friendships -------------------------------------------------
-- One row per directed request. A → B with status='pending' = A asked to follow B.
-- When B accepts, the same row updates to status='accepted' and we treat the
-- relationship as bidirectional in queries (A is friends with B and vice versa).
CREATE TABLE IF NOT EXISTS public.friendships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  friend_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT no_self_friend CHECK (user_id <> friend_id),
  CONSTRAINT unique_pair UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user      ON public.friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend    ON public.friendships(friend_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_accepted  ON public.friendships(user_id) WHERE status = 'accepted';

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Either side of the relationship can read the row.
DROP POLICY IF EXISTS "Friendships read" ON public.friendships;
CREATE POLICY "Friendships read" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Only the requester can create a request (must be themselves on the user_id side).
DROP POLICY IF EXISTS "Friendships create" ON public.friendships;
CREATE POLICY "Friendships create" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- The receiver can update status (accept/block). Either side can update accepted_at.
DROP POLICY IF EXISTS "Friendships update" ON public.friendships;
CREATE POLICY "Friendships update" ON public.friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Either side can unfriend (delete the row).
DROP POLICY IF EXISTS "Friendships delete" ON public.friendships;
CREATE POLICY "Friendships delete" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);


-- ---------- public.workout_reactions -------------------------------------------
-- One row per (user, workout, emoji). Toggling = insert if absent, delete if present.
CREATE TABLE IF NOT EXISTS public.workout_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL CHECK (emoji IN ('🔥', '⚡', '💪', '👏')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_reaction UNIQUE (workout_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_workout ON public.workout_reactions(workout_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user    ON public.workout_reactions(user_id);

ALTER TABLE public.workout_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone with read access to the workout can see reactions on it. Until we add a
-- public/friends-only flag on workouts, we restrict reads to: own workouts, or
-- workouts by accepted friends.
DROP POLICY IF EXISTS "Reactions read" ON public.workout_reactions;
CREATE POLICY "Reactions read" ON public.workout_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_reactions.workout_id
        AND (
          w.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND ((f.user_id = auth.uid() AND f.friend_id = w.user_id)
                OR (f.friend_id = auth.uid() AND f.user_id = w.user_id))
          )
        )
    )
  );

-- A user can only create their own reactions, and only on workouts they can see.
DROP POLICY IF EXISTS "Reactions create" ON public.workout_reactions;
CREATE POLICY "Reactions create" ON public.workout_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_reactions.workout_id
        AND (
          w.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND ((f.user_id = auth.uid() AND f.friend_id = w.user_id)
                OR (f.friend_id = auth.uid() AND f.user_id = w.user_id))
          )
        )
    )
  );

-- A user can only delete their own reactions.
DROP POLICY IF EXISTS "Reactions delete" ON public.workout_reactions;
CREATE POLICY "Reactions delete" ON public.workout_reactions
  FOR DELETE USING (auth.uid() = user_id);


-- ---------- Helper view: bidirectional accepted friends ------------------------
-- Convenience view so client code doesn't need to query both directions of the
-- pair. Selecting from this view gives "all of auth.uid()'s friends".
CREATE OR REPLACE VIEW public.my_friends AS
  SELECT f.friend_id AS friend_user_id, f.created_at AS connected_at
  FROM public.friendships f
  WHERE f.status = 'accepted' AND f.user_id = auth.uid()
  UNION
  SELECT f.user_id AS friend_user_id, f.created_at AS connected_at
  FROM public.friendships f
  WHERE f.status = 'accepted' AND f.friend_id = auth.uid();
