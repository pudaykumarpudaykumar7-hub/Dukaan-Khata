-- Dukaan Khata: shared Dukaan Universe + Online Shop
-- Run this entire file once in Supabase Dashboard → SQL Editor → New query → Run.
create extension if not exists pgcrypto;

create table if not exists public.dukaan_universe_shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  owner_name text not null default '',
  phone text not null default '',
  category text not null default 'Other',
  area text not null default '',
  address text not null default '',
  open_time text,
  close_time text,
  details text not null default '',
  lat double precision,
  lon double precision,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dukaan_universe_shops_published_idx on public.dukaan_universe_shops(published, created_at desc);
create index if not exists dukaan_universe_shops_owner_idx on public.dukaan_universe_shops(owner_id);

create table if not exists public.dukaan_shop_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.dukaan_universe_shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  description text not null default '',
  image_url text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  unit text not null default 'piece' check (unit in ('piece','g','kg','ml','L','pack','dozen')),
  stock numeric(12,3),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dukaan_shop_products_shop_idx on public.dukaan_shop_products(shop_id, published, category);

create table if not exists public.dukaan_shop_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.dukaan_universe_shops(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  delivery_method text not null default 'Pickup' check (delivery_method in ('Pickup','Delivery')),
  delivery_address text not null default '',
  note text not null default '',
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0 check (total >= 0),
  status text not null default 'Pending' check (status in ('Pending','Accepted','Rejected','Ready','Completed')),
  created_at timestamptz not null default now()
);
create index if not exists dukaan_shop_orders_owner_idx on public.dukaan_shop_orders(shop_id, created_at desc);
create index if not exists dukaan_shop_orders_customer_idx on public.dukaan_shop_orders(customer_id, created_at desc);

alter table public.dukaan_universe_shops enable row level security;
alter table public.dukaan_shop_products enable row level security;
alter table public.dukaan_shop_orders enable row level security;

drop policy if exists "Public can view published shops" on public.dukaan_universe_shops;
create policy "Public can view published shops" on public.dukaan_universe_shops for select using (published = true or owner_id = auth.uid());
drop policy if exists "Owners can create own shops" on public.dukaan_universe_shops;
create policy "Owners can create own shops" on public.dukaan_universe_shops for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "Owners can update own shops" on public.dukaan_universe_shops;
create policy "Owners can update own shops" on public.dukaan_universe_shops for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Owners can delete own shops" on public.dukaan_universe_shops;
create policy "Owners can delete own shops" on public.dukaan_universe_shops for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "Public can view published products" on public.dukaan_shop_products;
create policy "Public can view published products" on public.dukaan_shop_products for select using (published = true or owner_id = auth.uid());
drop policy if exists "Owners can add own products" on public.dukaan_shop_products;
create policy "Owners can add own products" on public.dukaan_shop_products for insert to authenticated with check (owner_id = auth.uid() and exists(select 1 from public.dukaan_universe_shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "Owners can update own products" on public.dukaan_shop_products;
create policy "Owners can update own products" on public.dukaan_shop_products for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and exists(select 1 from public.dukaan_universe_shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "Owners can delete own products" on public.dukaan_shop_products;
create policy "Owners can delete own products" on public.dukaan_shop_products for delete to authenticated using (owner_id = auth.uid());

-- Public customers may place orders without an account; only the shop owner can read/update orders.
drop policy if exists "Customers can place orders" on public.dukaan_shop_orders;
create policy "Customers can place orders" on public.dukaan_shop_orders for insert with check (exists(select 1 from public.dukaan_universe_shops s where s.id = shop_id and s.published = true));
drop policy if exists "Shop owners can view orders" on public.dukaan_shop_orders;
create policy "Shop owners can view orders" on public.dukaan_shop_orders for select to authenticated using (exists(select 1 from public.dukaan_universe_shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "Shop owners can update orders" on public.dukaan_shop_orders;
create policy "Shop owners can update orders" on public.dukaan_shop_orders for update to authenticated using (exists(select 1 from public.dukaan_universe_shops s where s.id = shop_id and s.owner_id = auth.uid())) with check (exists(select 1 from public.dukaan_universe_shops s where s.id = shop_id and s.owner_id = auth.uid()));

grant select on public.dukaan_universe_shops, public.dukaan_shop_products to anon, authenticated;
grant insert, update, delete on public.dukaan_universe_shops, public.dukaan_shop_products to authenticated;
grant insert on public.dukaan_shop_orders to anon, authenticated;
grant select, update on public.dukaan_shop_orders to authenticated;
