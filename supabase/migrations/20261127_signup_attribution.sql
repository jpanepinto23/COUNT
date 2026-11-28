-- First-touch attribution for new signups (written once by the client, see lib/attribution.ts)
alter table public.users
  add column if not exists signup_source text,
  add column if not exists signup_medium text,
  add column if not exists signup_campaign text,
  add column if not exists signup_landing text;
