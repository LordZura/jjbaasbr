create table if not exists public.account_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_name text not null,
  app_state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.account_states enable row level security;

create policy "Players can read their account state"
  on public.account_states
  for select
  using (auth.uid() = user_id);

create policy "Players can insert their account state"
  on public.account_states
  for insert
  with check (auth.uid() = user_id);

create policy "Players can update their account state"
  on public.account_states
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
