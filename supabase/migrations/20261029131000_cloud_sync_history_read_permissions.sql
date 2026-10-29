-- Restrict cloud history to owner-scoped authenticated reads and harden trigger paths.
revoke all on table public.dukaan_khata_state_history from anon, authenticated;
grant select on table public.dukaan_khata_state_history to authenticated;

-- These trigger bodies only assign NEW.updated_at and do not need a mutable search_path.
alter function public.set_updated_at() set search_path = '';
alter function public.set_dukaan_khata_state_updated_at() set search_path = '';
