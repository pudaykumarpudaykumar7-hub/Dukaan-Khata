-- Apply in Supabase SQL Editor. Existing ledger data is not changed.
create table if not exists public.owner_subscriptions (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 plan_id text not null check(plan_id in ('basic-50','plus-100','unlimited-149')),
 status text not null check(status in ('pending','active','inactive')),
 razorpay_subscription_id text not null,
 razorpay_payment_id text,
 current_period_end timestamptz,
 updated_at timestamptz not null default now()
);
create unique index if not exists owner_subscriptions_subscription_id_idx on public.owner_subscriptions(razorpay_subscription_id);
create table if not exists public.subscription_webhook_events (
 event_id text primary key,
 event_type text not null,
 received_at timestamptz not null default now()
);
alter table public.owner_subscriptions enable row level security;
alter table public.subscription_webhook_events enable row level security;
revoke all on public.owner_subscriptions from anon, authenticated;
revoke all on public.subscription_webhook_events from anon, authenticated;
grant all on public.owner_subscriptions to service_role;
grant all on public.subscription_webhook_events to service_role;
