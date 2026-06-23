-- ═══════════════════════════════════════════════════════════════════════════
--  ASBR Match Tracker — complete database setup (idempotent)
--
--  This is the ONE file you ever need to run. It is safe to run on a fresh
--  database OR re-run on an existing one as many times as you like: it creates
--  what's missing, reconciles what's drifted, and never errors on a second run.
--  Paste it whole into the Supabase SQL editor (or `psql`) and execute.
--
--  The app keeps ALL group data under three keys in one shared table:
--    'players'      — { [playerId]: Player }
--    'matches'      — { [matchId]: Match }
--    'collections'  — { [playerId]: Collection }   (gacha pulls + algorithm luck)
--  Stats are always re-derived from these, never stored separately.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Table — create if absent, then reconcile its shape if an older/odd variant
--    already exists (add any missing columns without touching existing data).
create table if not exists public.shared_state (
  key        text primary key,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.shared_state
  add column if not exists value jsonb not null default '{}'::jsonb;
alter table public.shared_state
  add column if not exists updated_at timestamptz not null default now();

-- 2) Row-level security — enabled, with open communal access (no auth: this is a
--    casual friend-group tracker). Policies are dropped first so re-runs never
--    hit "already exists". Tighten these if you later add authentication.
alter table public.shared_state enable row level security;

drop policy if exists "shared read"   on public.shared_state;
drop policy if exists "shared insert" on public.shared_state;
drop policy if exists "shared update" on public.shared_state;
drop policy if exists "shared delete" on public.shared_state;

create policy "shared read"   on public.shared_state for select using (true);
create policy "shared insert" on public.shared_state for insert with check (true);
create policy "shared update" on public.shared_state for update using (true) with check (true);
create policy "shared delete" on public.shared_state for delete using (true);

-- 3) Realtime — broadcast every write to all connected devices. Guarded so a
--    re-run doesn't fail with "table is already a member", and so it simply
--    skips when the Supabase realtime publication isn't present (e.g. plain PG).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'shared_state'
    ) then
      execute 'alter publication supabase_realtime add table public.shared_state';
    end if;
  end if;
end
$$;

-- 4) Seed the three keys so the rows always exist. `on conflict do nothing`
--    means existing data is preserved untouched — this only fills in gaps.
insert into public.shared_state (key, value) values
  ('players',     '{}'::jsonb),
  ('matches',     '{}'::jsonb),
  ('collections', '{}'::jsonb)
on conflict (key) do nothing;

-- 5) Keep updated_at fresh on every write (handy for debugging / auditing).
create or replace function public.shared_state_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists shared_state_touch on public.shared_state;
create trigger shared_state_touch
  before update on public.shared_state
  for each row execute function public.shared_state_touch();
