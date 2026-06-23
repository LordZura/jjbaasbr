-- Shared, group-wide state for the ASBR match tracker.
-- Everyone reads + writes the SAME dataset (no per-user rows) so the whole
-- friend group sees one synced board in real time. Data lives under two keys:
-- 'players' and 'matches'.

create table if not exists public.shared_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.shared_state enable row level security;

-- Open, shared access. This is a casual group tracker with no auth — anyone
-- with the app can read and write the communal data. Tighten these policies if
-- you later add authentication.
drop policy if exists "shared read" on public.shared_state;
create policy "shared read"
  on public.shared_state for select
  using (true);

drop policy if exists "shared insert" on public.shared_state;
create policy "shared insert"
  on public.shared_state for insert
  with check (true);

drop policy if exists "shared update" on public.shared_state;
create policy "shared update"
  on public.shared_state for update
  using (true)
  with check (true);

-- Enable realtime so writes broadcast to every connected device.
alter publication supabase_realtime add table public.shared_state;
