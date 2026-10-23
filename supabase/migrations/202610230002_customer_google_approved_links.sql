create table if not exists public.customer_account_links (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 customer_auth_user_id uuid not null references auth.users(id) on delete cascade,
 customer_id text not null,
 customer_phone text not null,
 customer_email text not null,
 status text not null default 'pending' check (status in ('pending','approved','revoked')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 approved_at timestamptz,
 unique (owner_user_id, customer_auth_user_id, customer_id)
);
create index if not exists customer_account_links_customer_status_idx on public.customer_account_links (customer_auth_user_id,status);
create index if not exists customer_account_links_owner_status_idx on public.customer_account_links (owner_user_id,status);
alter table public.customer_account_links enable row level security;
revoke all on table public.customer_account_links from anon, authenticated, public;
grant all on table public.customer_account_links to service_role;
comment on table public.customer_account_links is 'Server-managed customer-to-owner record links. Customer access requires explicit owner approval.';
