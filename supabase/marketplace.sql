-- Dukaan Khata shared marketplace schema
-- Run once in Supabase SQL Editor. Safe to re-run.
create extension if not exists pgcrypto;

create table if not exists public.dk_market_shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  phone text not null default '',
  address text not null default '',
  description text not null default '',
  image_url text not null default '',
  is_open boolean not null default true,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dk_market_shops_published_idx on public.dk_market_shops(published, created_at desc);
create index if not exists dk_market_shops_owner_idx on public.dk_market_shops(owner_id);

create table if not exists public.dk_market_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.dk_market_shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  description text not null default '',
  image_url text not null default '',
  price_per_unit numeric(12,2) not null check (price_per_unit >= 0),
  unit text not null default 'piece' check (unit in ('g','kg','ml','l','piece','pack','dozen')),
  stock numeric(12,3),
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dk_market_products_shop_idx on public.dk_market_products(shop_id, available);

create table if not exists public.dk_market_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.dk_market_shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  delivery_method text not null default 'Pickup' check (delivery_method in ('Pickup','Delivery')),
  delivery_address text not null default '',
  customer_note text not null default '',
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'Pending' check (status in ('Pending','Accepted','Rejected','Ready','Completed','Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dk_market_orders_owner_idx on public.dk_market_orders(owner_id, created_at desc);
create index if not exists dk_market_orders_shop_idx on public.dk_market_orders(shop_id, created_at desc);

alter table public.dk_market_shops enable row level security;
alter table public.dk_market_products enable row level security;
alter table public.dk_market_orders enable row level security;

drop policy if exists "Public can browse published shops" on public.dk_market_shops;
create policy "Public can browse published shops" on public.dk_market_shops for select using (published = true or owner_id = auth.uid());
drop policy if exists "Owners create own shops" on public.dk_market_shops;
create policy "Owners create own shops" on public.dk_market_shops for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "Owners update own shops" on public.dk_market_shops;
create policy "Owners update own shops" on public.dk_market_shops for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Owners delete own shops" on public.dk_market_shops;
create policy "Owners delete own shops" on public.dk_market_shops for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "Public browse available products" on public.dk_market_products;
create policy "Public browse available products" on public.dk_market_products for select using (available = true or owner_id = auth.uid());
drop policy if exists "Owners add own products" on public.dk_market_products;
create policy "Owners add own products" on public.dk_market_products for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.dk_market_shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "Owners update own products" on public.dk_market_products;
create policy "Owners update own products" on public.dk_market_products for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and exists (select 1 from public.dk_market_shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "Owners delete own products" on public.dk_market_products;
create policy "Owners delete own products" on public.dk_market_products for delete to authenticated using (owner_id = auth.uid());

-- Customers may place guest orders. They cannot read all orders or change statuses.
drop policy if exists "Customers create guest orders" on public.dk_market_orders;
create policy "Customers create guest orders" on public.dk_market_orders for insert to anon, authenticated with check (
  exists (select 1 from public.dk_market_shops s where s.id = shop_id and s.owner_id = owner_id and s.published = true)
);
drop policy if exists "Owners read own orders" on public.dk_market_orders;
create policy "Owners read own orders" on public.dk_market_orders for select to authenticated using (owner_id = auth.uid());
drop policy if exists "Owners update own orders" on public.dk_market_orders;
create policy "Owners update own orders" on public.dk_market_orders for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select on public.dk_market_shops, public.dk_market_products to anon, authenticated;
grant insert, update, delete on public.dk_market_shops to authenticated;
grant insert, update, delete on public.dk_market_products to authenticated;
grant insert on public.dk_market_orders to anon, authenticated;
grant select, update on public.dk_market_orders to authenticated;
