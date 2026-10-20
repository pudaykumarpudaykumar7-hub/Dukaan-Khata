-- Dukaan Shop shared marketplace schema
-- Run this entire file once in Supabase Dashboard > SQL Editor.
create table if not exists public.dk_market_shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  owner text not null,
  phone text not null,
  category text not null default 'Kirana & Grocery',
  area text not null,
  delivery text not null default 'Pickup and delivery',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);
create table if not exists public.dk_market_products (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.dk_market_shops(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  price numeric(12,2) not null check(price > 0),
  unit text not null default 'piece',
  stock numeric(12,3),
  image text,
  description text,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.dk_market_orders (
  id text primary key,
  shop_id uuid not null references public.dk_market_shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  buyer_name text not null,
  buyer_phone text not null,
  delivery_method text not null,
  address text,
  payment_preference text not null default 'Pay at store',
  note text,
  items jsonb not null,
  total numeric(12,2) not null check(total >= 0),
  status text not null default 'Placed',
  created_at timestamptz not null default now()
);
alter table public.dk_market_shops enable row level security;
alter table public.dk_market_products enable row level security;
alter table public.dk_market_orders enable row level security;
drop policy if exists "Published shops are visible" on public.dk_market_shops;
create policy "Published shops are visible" on public.dk_market_shops for select using (published = true or auth.uid() = owner_id);
drop policy if exists "Owners create their shop" on public.dk_market_shops;
create policy "Owners create their shop" on public.dk_market_shops for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Owners update their shop" on public.dk_market_shops;
create policy "Owners update their shop" on public.dk_market_shops for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Owners delete their shop" on public.dk_market_shops;
create policy "Owners delete their shop" on public.dk_market_shops for delete to authenticated using (auth.uid() = owner_id);
drop policy if exists "Published products are visible" on public.dk_market_products;
create policy "Published products are visible" on public.dk_market_products for select using (published = true or auth.uid() = owner_id);
drop policy if exists "Owners add products" on public.dk_market_products;
create policy "Owners add products" on public.dk_market_products for insert to authenticated with check (auth.uid() = owner_id and exists(select 1 from public.dk_market_shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "Owners update products" on public.dk_market_products;
create policy "Owners update products" on public.dk_market_products for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id and exists(select 1 from public.dk_market_shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "Owners delete products" on public.dk_market_products;
create policy "Owners delete products" on public.dk_market_products for delete to authenticated using (auth.uid() = owner_id);
drop policy if exists "Customers can place orders" on public.dk_market_orders;
create policy "Customers can place orders" on public.dk_market_orders for insert to anon, authenticated with check (
  length(trim(buyer_name)) between 1 and 120 and length(regexp_replace(buyer_phone, '\D', '', 'g')) between 10 and 13
  and exists(select 1 from public.dk_market_shops s where s.id = shop_id and s.owner_id = dk_market_orders.owner_id and s.published = true)
);
drop policy if exists "Owners view their orders" on public.dk_market_orders;
create policy "Owners view their orders" on public.dk_market_orders for select to authenticated using (auth.uid() = owner_id);
drop policy if exists "Owners update their orders" on public.dk_market_orders;
create policy "Owners update their orders" on public.dk_market_orders for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
grant select on public.dk_market_shops, public.dk_market_products to anon, authenticated;
grant insert, update, delete on public.dk_market_shops, public.dk_market_products to authenticated;
grant insert on public.dk_market_orders to anon, authenticated;
grant select, update on public.dk_market_orders to authenticated;
