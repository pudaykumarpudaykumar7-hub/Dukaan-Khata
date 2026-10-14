-- Dukaan Khata nationwide-ready shared marketplace foundation.
-- Run in Supabase SQL Editor before enabling cross-device cloud sync.
create extension if not exists pgcrypto;

create table if not exists public.dukaan_khata_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.dukaan_khata_state enable row level security;
drop policy if exists "Owners can read their own Dukaan Khata state" on public.dukaan_khata_state;
create policy "Owners can read their own Dukaan Khata state"
  on public.dukaan_khata_state for select to authenticated using (user_id = auth.uid());
drop policy if exists "Owners can create their own Dukaan Khata state" on public.dukaan_khata_state;
create policy "Owners can create their own Dukaan Khata state"
  on public.dukaan_khata_state for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Owners can update their own Dukaan Khata state" on public.dukaan_khata_state;
create policy "Owners can update their own Dukaan Khata state"
  on public.dukaan_khata_state for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.dukaan_khata_state to authenticated;
revoke all on public.dukaan_khata_state from anon;

create table if not exists public.dk_shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  owner_name text not null check (length(trim(owner_name)) between 1 and 120),
  phone text not null check (length(trim(phone)) between 5 and 25),
  area text,
  category text,
  details text,
  lat double precision check (lat is null or lat between -90 and 90),
  lon double precision check (lon is null or lon between -180 and 180),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists dk_shops_active_created_idx on public.dk_shops(active, created_at desc);
create index if not exists dk_shops_owner_idx on public.dk_shops(owner_id);
alter table public.dk_shops enable row level security;
drop policy if exists "Anyone can discover active shops" on public.dk_shops;
create policy "Anyone can discover active shops" on public.dk_shops for select to anon, authenticated using (active = true or owner_id = auth.uid());
drop policy if exists "Owners can register their own shops" on public.dk_shops;
create policy "Owners can register their own shops" on public.dk_shops for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "Owners can update their own shops" on public.dk_shops;
create policy "Owners can update their own shops" on public.dk_shops for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Owners can delete their own shops" on public.dk_shops;
create policy "Owners can delete their own shops" on public.dk_shops for delete to authenticated using (owner_id = auth.uid());
grant select on public.dk_shops to anon, authenticated;
grant insert, update, delete on public.dk_shops to authenticated;

create table if not exists public.dk_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.dk_shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 180),
  price numeric(12,2) not null check (price >= 0),
  unit text not null default 'piece',
  image_url text,
  category text,
  description text,
  stock numeric(14,3) check (stock is null or stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dk_products_owner_shop_fk foreign key (shop_id, owner_id) references public.dk_shops(id, owner_id) on delete cascade
);
create unique index if not exists dk_shops_id_owner_unique on public.dk_shops(id, owner_id);
create index if not exists dk_products_shop_active_idx on public.dk_products(shop_id, active, name);
alter table public.dk_products enable row level security;
drop policy if exists "Anyone can view active products from active shops" on public.dk_products;
create policy "Anyone can view active products from active shops" on public.dk_products for select to anon, authenticated
  using (active = true and exists (select 1 from public.dk_shops s where s.id = shop_id and s.active = true) or owner_id = auth.uid());
drop policy if exists "Owners can add products to their own shops" on public.dk_products;
create policy "Owners can add products to their own shops" on public.dk_products for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.dk_shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "Owners can update their own products" on public.dk_products;
create policy "Owners can update their own products" on public.dk_products for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and exists (select 1 from public.dk_shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "Owners can delete their own products" on public.dk_products;
create policy "Owners can delete their own products" on public.dk_products for delete to authenticated using (owner_id = auth.uid());
grant select on public.dk_products to anon, authenticated;
grant insert, update, delete on public.dk_products to authenticated;

create table if not exists public.dk_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.dk_shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  delivery_method text not null check (delivery_method in ('Pickup','Delivery')),
  delivery_address text,
  note text,
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'Pending' check (status in ('Pending','Accepted','Rejected','Ready','Completed','Cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists dk_orders_shop_created_idx on public.dk_orders(shop_id, created_at desc);
alter table public.dk_orders enable row level security;
drop policy if exists "Shop owners can read their own orders" on public.dk_orders;
create policy "Shop owners can read their own orders" on public.dk_orders for select to authenticated using (owner_id = auth.uid());
drop policy if exists "Shop owners can update their own orders" on public.dk_orders;
create policy "Shop owners can update their own orders" on public.dk_orders for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, update on public.dk_orders to authenticated;
revoke all on public.dk_orders from anon;

create or replace function public.dk_place_order(
  p_shop_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_method text,
  p_delivery_address text default null,
  p_note text default null,
  p_items jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop public.dk_shops%rowtype;
  v_item jsonb;
  v_product public.dk_products%rowtype;
  v_product_id uuid;
  v_qty numeric;
  v_total numeric(12,2) := 0;
  v_items jsonb := '[]'::jsonb;
  v_order_id uuid;
begin
  if p_shop_id is null then raise exception 'Choose a valid shop.'; end if;
  if length(trim(coalesce(p_customer_name,''))) not between 1 and 120 then raise exception 'Enter a valid customer name.'; end if;
  if length(trim(coalesce(p_customer_phone,''))) not between 5 and 25 then raise exception 'Enter a valid customer phone number.'; end if;
  if p_delivery_method not in ('Pickup','Delivery') then raise exception 'Choose pickup or delivery.'; end if;
  if p_delivery_method = 'Delivery' and length(trim(coalesce(p_delivery_address,''))) < 5 then raise exception 'Enter a delivery address.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then raise exception 'Your cart is empty or contains too many items.'; end if;

  select * into v_shop from public.dk_shops where id = p_shop_id and active = true;
  if not found then raise exception 'This shop is not currently accepting orders.'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_qty := (v_item->>'quantity')::numeric;
    exception when others then
      raise exception 'A cart item has invalid product or quantity data.';
    end;
    if v_qty is null or v_qty <= 0 or v_qty > 100000 then raise exception 'Each quantity must be greater than zero.'; end if;

    select * into v_product from public.dk_products
      where id = v_product_id and shop_id = p_shop_id and active = true for update;
    if not found then raise exception 'A product is unavailable. Refresh the cart and try again.'; end if;
    if v_product.stock is not null and v_product.stock < v_qty then raise exception 'Insufficient stock for %.', v_product.name; end if;

    v_total := v_total + round(v_product.price * v_qty, 2);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'price', v_product.price,
      'unit', v_product.unit, 'quantity', v_qty, 'qty', v_qty,
      'line_total', round(v_product.price * v_qty, 2), 'image_url', v_product.image_url
    ));
    if v_product.stock is not null then
      update public.dk_products set stock = stock - v_qty, updated_at = now() where id = v_product.id;
    end if;
  end loop;

  if v_total <= 0 then raise exception 'Order total must be greater than zero.'; end if;
  insert into public.dk_orders(shop_id, owner_id, customer_name, customer_phone, delivery_method, delivery_address, note, items, total, status)
  values (v_shop.id, v_shop.owner_id, trim(p_customer_name), trim(p_customer_phone), p_delivery_method,
          nullif(trim(coalesce(p_delivery_address,'')),''), nullif(trim(coalesce(p_note,'')),''), v_items, v_total, 'Pending')
  returning id into v_order_id;
  return v_order_id;
end;
$$;
revoke all on function public.dk_place_order(uuid,text,text,text,text,text,jsonb) from public;
grant execute on function public.dk_place_order(uuid,text,text,text,text,text,jsonb) to anon, authenticated;

-- A separate audit trail for verified gateway payments and commission settlement.
-- Only a trusted server using the Supabase service-role key should write these rows.
create table if not exists public.dk_payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'cashfree',
  provider_payment_id text unique,
  provider_order_id text,
  shop_id uuid references public.dk_shops(id) on delete set null,
  order_id uuid references public.dk_orders(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'INR',
  status text not null check (status in ('PENDING','PAID','FAILED','REFUNDED','CANCELLED')),
  verified_at timestamptz,
  raw_event jsonb,
  created_at timestamptz not null default now()
);
alter table public.dk_payment_events enable row level security;
revoke all on public.dk_payment_events from anon, authenticated;

create table if not exists public.dk_commission_ledger (
  id uuid primary key default gen_random_uuid(),
  payment_event_id uuid not null unique references public.dk_payment_events(id) on delete restrict,
  shop_id uuid not null references public.dk_shops(id) on delete restrict,
  shop_owner_id uuid not null references auth.users(id) on delete restrict,
  platform_owner_id uuid references auth.users(id) on delete set null,
  customer_phone text,
  eligible_commission numeric(12,2) not null check (eligible_commission >= 0),
  platform_share numeric(12,2) not null check (platform_share >= 0),
  shop_share numeric(12,2) not null check (shop_share >= 0),
  customer_reward numeric(12,2) not null check (customer_reward >= 0),
  payout_status text not null default 'PENDING' check (payout_status in ('PENDING','APPROVED','SETTLED','FAILED','REVERSED')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint dk_commission_split_check check (round(platform_share + shop_share + customer_reward,2) = round(eligible_commission,2)),
  constraint dk_commission_ratio_check check (
    abs(platform_share - round(eligible_commission * 0.80,2)) <= 0.02
    and abs(shop_share - round(eligible_commission * 0.10,2)) <= 0.02
    and abs(customer_reward - (eligible_commission - round(eligible_commission * 0.80,2) - round(eligible_commission * 0.10,2))) <= 0.02
  )
);
alter table public.dk_commission_ledger enable row level security;
drop policy if exists "Shop owners can view their commission ledger" on public.dk_commission_ledger;
create policy "Shop owners can view their commission ledger" on public.dk_commission_ledger for select to authenticated using (shop_owner_id = auth.uid());
drop policy if exists "Platform owner can view assigned commission ledger" on public.dk_commission_ledger;
create policy "Platform owner can view assigned commission ledger" on public.dk_commission_ledger for select to authenticated using (platform_owner_id = auth.uid());
grant select on public.dk_commission_ledger to authenticated;
revoke insert, update, delete on public.dk_commission_ledger from anon, authenticated;

comment on table public.dk_payment_events is 'Trusted backend audit of provider-confirmed payment events; never treat client screenshots or client-side status as payment proof.';
comment on table public.dk_commission_ledger is 'Ledger for eligible commission only. A gateway payment does not create commission by itself; write only after the platform has an approved, funded commission agreement.';
