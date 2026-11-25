-- Server-side OAuth state so Garmin callbacks work when iOS hands the flow to
-- the Garmin Connect app (no access to the user's Safari cookies).
create table if not exists public.oauth_states (
  state       text primary key,
  provider    text not null,
  verifier    text not null,
  user_id     text not null,   -- COUNT user id, or 'new' for sign-up flow
  ref         text,
  gym         text,
  created_at  timestamptz not null default now()
);
create index if not exists oauth_states_created_at_idx on public.oauth_states (created_at);
alter table public.oauth_states enable row level security;  -- service role only, no policies
