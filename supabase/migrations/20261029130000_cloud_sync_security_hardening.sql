-- Harden owner-state history and internal SECURITY DEFINER helpers.
-- Customer-facing order placement remains public by design; these functions do not.
revoke all on function public.archive_dukaan_khata_state_before_update() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- These helpers are used by authenticated shop-membership RLS policies.
revoke all on function public.is_shop_admin(uuid) from public, anon;
revoke all on function public.is_shop_member(uuid) from public, anon;
grant execute on function public.is_shop_admin(uuid) to authenticated;
grant execute on function public.is_shop_member(uuid) to authenticated;

-- Shop creation must require an authenticated Google account; the function itself
-- also checks auth.uid(), so public/anon execution is unnecessary.
revoke all on function public.create_owner_shop(text, text, text) from public, anon;
grant execute on function public.create_owner_shop(text, text, text) to authenticated;

-- History is append-only through the state archive trigger. Clients may read only
-- their own rows under the existing RLS policy, but cannot directly alter history.
revoke insert, update, delete, truncate, references, trigger on table public.dukaan_khata_state_history from anon, authenticated;
grant select on table public.dukaan_khata_state_history to authenticated;
