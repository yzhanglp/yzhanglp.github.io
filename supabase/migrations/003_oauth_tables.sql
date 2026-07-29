-- OAuth state + Bangumi connection tables
-- These live in public schema but RLS with no policies = service-role only

create table if not exists public.oauth_states (
  state_hash  text        primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table public.oauth_states enable row level security;

create table if not exists public.bangumi_connections (
  user_id                uuid        primary key references auth.users(id) on delete cascade,
  bangumi_user_id        integer,
  bangumi_username       text,
  access_token_enc       text        not null,
  refresh_token_enc      text        not null,
  expires_at             timestamptz not null,
  connected_at           timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
alter table public.bangumi_connections enable row level security;
-- No policies = only service role (Edge Functions) can read/write
