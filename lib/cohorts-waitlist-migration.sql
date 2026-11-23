-- Applied 2026-11-21 to Supabase project lqedpkevxwzopctpgxoe as migration
-- "cohorts_device_answer_apple_watch_waitlist".

-- Cohorts: a gyms row is either a gym or a coach/trainer cohort. Attribution stays on users.gym_id.
alter table public.gyms
  add column if not exists kind text not null default 'gym'
  check (kind in ('gym', 'coach'));

-- One placeholder coach cohort. Rename it here only (slug + name); nothing in code hardcodes it:
--   update public.gyms set name = 'Coach Name', slug = 'coach-name' where slug = 'coach';
insert into public.gyms (name, slug, kind)
values ('Your Coach', 'coach', 'coach')
on conflict (slug) do nothing;

-- Onboarding answer: "What do you train with?" Written by the server route only (users column grants unchanged).
alter table public.users
  add column if not exists trains_with text
  check (trains_with in ('garmin', 'strava', 'apple_watch', 'fitbit', 'manual', 'other'));

-- Apple Watch interest capture. Not the email-drip waitlist.
create table if not exists public.apple_watch_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references public.users(id) on delete set null,
  source text not null check (source in ('homepage', 'onboarding')),
  created_at timestamptz not null default now()
);
alter table public.apple_watch_waitlist enable row level security;
-- Data API grants (post-Oct 30, 2026 rule). Only the server route (service role) reads or writes it.
grant select, insert, update, delete on table public.apple_watch_waitlist to service_role;
revoke all on table public.apple_watch_waitlist from anon, authenticated;
