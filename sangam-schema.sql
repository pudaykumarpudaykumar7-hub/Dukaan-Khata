-- Dukaan Sangam shared posts and shop interest
-- Run this file once in Supabase SQL Editor for project nzsldzyjpxwyyrdwkphp.
create table if not exists public.dk_sangam_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('item','bulk')),
  category text not null default 'Other',
  title text not null check (char_length(title) between 1 and 100),
  quantity numeric not null check (quantity > 0),
  unit text not null default 'piece',
  shop_name text not null check (char_length(shop_name) between 1 and 80),
  area text not null check (char_length(area) between 1 and 100),
  details text,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create index if not exists dk_sangam_posts_open_created_idx on public.dk_sangam_posts(status, created_at desc);
create index if not exists dk_sangam_posts_owner_idx on public.dk_sangam_posts(created_by);
alter table public.dk_sangam_posts enable row level security;
drop policy if exists "Sangam open posts are visible" on public.dk_sangam_posts;
create policy "Sangam open posts are visible" on public.dk_sangam_posts for select to authenticated using (status = 'open' or created_by = auth.uid());
drop policy if exists "Sangam users create own posts" on public.dk_sangam_posts;
create policy "Sangam users create own posts" on public.dk_sangam_posts for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "Sangam owners update own posts" on public.dk_sangam_posts;
create policy "Sangam owners update own posts" on public.dk_sangam_posts for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "Sangam owners delete own posts" on public.dk_sangam_posts;
create policy "Sangam owners delete own posts" on public.dk_sangam_posts for delete to authenticated using (created_by = auth.uid());

create table if not exists public.dk_sangam_interests (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.dk_sangam_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_name text,
  area text,
  created_at timestamptz not null default now(),
  unique(post_id,user_id)
);
create index if not exists dk_sangam_interests_post_idx on public.dk_sangam_interests(post_id,created_at desc);
alter table public.dk_sangam_interests enable row level security;
drop policy if exists "Sangam users view own interest or their post responses" on public.dk_sangam_interests;
create policy "Sangam users view own interest or their post responses" on public.dk_sangam_interests for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.dk_sangam_posts p where p.id = post_id and p.created_by = auth.uid()));
drop policy if exists "Sangam users express own interest" on public.dk_sangam_interests;
create policy "Sangam users express own interest" on public.dk_sangam_interests for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.dk_sangam_posts p where p.id = post_id and p.status = 'open' and p.created_by <> auth.uid()));
drop policy if exists "Sangam users remove own interest" on public.dk_sangam_interests;
create policy "Sangam users remove own interest" on public.dk_sangam_interests for delete to authenticated using (user_id = auth.uid());
