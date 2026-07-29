-- ── Anime Tracker schema ──────────────────────────────────────────────────
-- Run this once in Supabase Dashboard → SQL Editor

-- 1. Anime items
create table if not exists public.anime_items (
  id                    uuid        primary key default gen_random_uuid(),
  subject_id            integer     not null unique,
  local_status          text        not null default 'watching'
    check (local_status in ('watching','planned','paused','completed','dropped')),
  progress              integer     not null default 0 check (progress >= 0),
  is_public             boolean     not null default true,
  sort_order            integer     not null default 0,
  personal_rating       integer     check (personal_rating is null or personal_rating between 1 and 10),
  personal_note         text,
  personal_tags         text[]      not null default '{}',
  manual_weekday        integer     check (manual_weekday is null or manual_weekday between 0 and 6),
  manual_time           time,
  manual_timezone       text        default 'Europe/London',
  sync_enabled          boolean     not null default true,
  sync_pending          boolean     not null default false,
  last_local_update_at  timestamptz not null default now(),
  last_sync_at          timestamptz,
  last_sync_error       text,
  last_bangumi_snapshot jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- 2. Bangumi metadata cache
create table if not exists public.anime_cache (
  subject_id    integer     primary key,
  subject_json  jsonb       not null,
  episodes_json jsonb,
  fetched_at    timestamptz not null default now(),
  expires_at    timestamptz not null
);

-- 3. RLS
alter table public.anime_items  enable row level security;
alter table public.anime_cache  enable row level security;

-- Public: read visible items
create policy "public_read_items" on public.anime_items
  for select using (is_public = true);

-- Public: read cache
create policy "public_read_cache" on public.anime_cache
  for select using (true);

-- Admin: full access for any authenticated user
-- (signup is disabled so only your account can authenticate)
create policy "admin_all_items" on public.anime_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admin_write_cache" on public.anime_cache
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 4. updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists anime_items_updated_at on public.anime_items;
create trigger anime_items_updated_at
  before update on public.anime_items
  for each row execute procedure public.set_updated_at();
