-- Dukaan Khata marketplace schema compatible with marketplace.js
-- Run this entire file once in Supabase Dashboard > SQL Editor > New query.
create extension if not exists pgcrypto;

create table if not exists public.dk_shops (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 owner_name text not null default '',
 phone text not null default '',
 area text not null default '',
 category text not null default 'General',
 details text not null default '',
 lat double precision,
 lon double precision,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.dk_products (
 id uuid primary key default gen_random_uuid(),
 shop_id uuid not null references public.dk_shops(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 price numeric(12,2) not null check(price >= 0),
 unit text not null default 'piece',
 image_url text,
 category text not null default 'Other',
 description text,
 stock numeric(12,3),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.dk_orders (
 id uuid primary key default gen_random_uuid(),
 shop_id uuid not null references public.dk_shops(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 customer_name text not null,
 customer_phone text not null,
 delivery_method text not null default 'Pickup' check(delivery_method in ('Pickup','Delivery')),
 delivery_address text,
 note text,
 items jsonb not null default '[]'::jsonb,
 total numeric(12,2) not null check(total >= 0),
 status text not null default 'Pending' check(status in ('Pending','Accepted','Rejected','Ready','Completed','Cancelled')),
 created_at timestamptz not null default now()
);
create index if not exists dk_shops_active_idx on public.dk_shops(active, created_at desc);
create index if not exists dk_shops_owner_idx on public.dk_shops(owner_id);
create index if not exists dk_products_shop_idx on public.dk_products(shop_id, active);
create index if not exists dk_orders_owner_idx on public.dk_orders(owner_id, created_at desc);

alter table public.dk_shops enable row level security;
alter table public.dk_products enable row level security;
alter table public.dk_orders enable row level security;

drop policy if exists "Public read active shops" on public.dk_shops;
create policy "Public read active shops" on public.dk_shops for select to anon, authenticated using (active = true or owner_id = auth.uid());
drop policy if exists "Owners register own shops" on public.dk_shops;
create policy "Owners register own shops" on public.dk_shops for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "Owners update own shops" on public.dk_shops;
create policy "Owners update own shops" on public.dk_shops for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Owners delete own shops" on public.dk_shops;
create policy "Owners delete own shops" on public.dk_shops for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "Public read active products" on public.dk_products;
create policy "Public read active products" on public.dk_products for select to anon, authenticated using (active = true or owner_id = auth.uid());
drop policy if exists "Owners insert own products" on public.dk_products;
create policy "Owners insert own products" on public.dk_products for insert to authenticated with check (owner_id = auth.uid() and exists(select 1 from public.dk_shops s where s.id=shop_id and s.owner_id=auth.uid()));
drop policy if exists "Owners update own products" on public.dk_products;
create policy "Owners update own products" on public.dk_products for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid() and exists(select 1 from public.dk_shops s where s.id=shop_id and s.owner_id=auth.uid()));
drop policy if exists "Owners delete own products" on public.dk_products;
create policy "Owners delete own products" on public.dk_products for delete to authenticated using (owner_id=auth.uid());

drop policy if exists "Owners read own orders" on public.dk_orders;
create policy "Owners read own orders" on public.dk_orders for select to authenticated using(owner_id=auth.uid());
drop policy if exists "Owners update own orders" on public.dk_orders;
create policy "Owners update own orders" on public.dk_orders for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

grant select on public.dk_shops, public.dk_products to anon, authenticated;
grant insert, update, delete on public.dk_shops, public.dk_products to authenticated;
grant select, update on public.dk_orders to authenticated;
grant execute on function public.dk_place_order(uuid,text,text,text,text,text,jsonb) to anon, authenticated;

create or replace function public.dk_place_order(
 p_shop_id uuid,
 p_customer_name text,
 p_customer_phone text,
 p_delivery_method text,
 p_delivery_address text,
 p_note text,
 p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
 s public.dk_shops%rowtype;
 it jsonb;
 p public.dk_products%rowtype;
 q numeric;
 total_amount numeric(12,2) := 0;
 lines jsonb := '[]'::jsonb;
 new_id uuid;
begin
 if coalesce(trim(p_customer_name),'')='' or coalesce(trim(p_customer_phone),'')='' then
   raise exception 'Enter customer name and phone number.';
 end if;
 if p_delivery_method not in ('Pickup','Delivery') then raise exception 'Choose pickup or delivery.'; end if;
 if p_delivery_method='Delivery' and coalesce(trim(p_delivery_address),'')='' then raise exception 'Enter delivery address.'; end if;
 select * into s from public.dk_shops where id=p_shop_id and active=true;
 if not found then raise exception 'This shop is unavailable. Refresh and choose another shop.'; end if;
 if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'Your cart is empty.'; end if;
 for it in select value from jsonb_array_elements(p_items) loop
   select * into p from public.dk_products where id=(it->>'product_id')::uuid and shop_id=p_shop_id and active=true;
   if not found then raise exception 'A product in your cart is no longer available. Refresh your cart.'; end if;
   q := (it->>'quantity')::numeric;
   if q is null or q<=0 then raise exception 'Product quantity must be greater than zero.'; end if;
   if p.stock is not null and q>p.stock then raise exception 'Not enough stock for %.', p.name; end if;
   total_amount := total_amount + p.price*q;
   lines := lines || jsonb_build_array(jsonb_build_object('product_id',p.id,'name',p.name,'price',p.price,'quantity',q,'unit',p.unit,'line_total',p.price*q));
 end loop;
 insert into public.dk_orders(shop_id,owner_id,customer_name,customer_phone,delivery_method,delivery_address,note,items,total,status)
 values(p_shop_id,s.owner_id,trim(p_customer_name),trim(p_customer_phone),p_delivery_method,coalesce(p_delivery_address,''),coalesce(p_note,''),lines,total_amount,'Pending')
 returning id into new_id;
 return new_id;
end;
$$;
