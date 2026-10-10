-- Dukaan Khata cross-device ledger storage
-- Run once in Supabase Dashboard > SQL Editor > New query.
create table if not exists public.dukaan_khata_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.dukaan_khata_state enable row level security;

drop policy if exists "Owners can read their own Dukaan Khata state" on public.dukaan_khata_state;
create policy "Owners can read their own Dukaan Khata state"
  on public.dukaan_khata_state for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Owners can insert their own Dukaan Khata state" on public.dukaan_khata_state;
create policy "Owners can insert their own Dukaan Khata state"
  on public.dukaan_khata_state for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Owners can update their own Dukaan Khata state" on public.dukaan_khata_state;
create policy "Owners can update their own Dukaan Khata state"
  on public.dukaan_khata_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.dukaan_khata_state to authenticated;

create or replace function public.set_dukaan_khata_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_dukaan_khata_state_updated_at on public.dukaan_khata_state;
create trigger set_dukaan_khata_state_updated_at
  before update on public.dukaan_khata_state
  for each row execute function public.set_dukaan_khata_state_updated_at();
