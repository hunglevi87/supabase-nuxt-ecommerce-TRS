do $$
begin
  create type public.order_status as enum ('pending', 'paid', 'shipped', 'delivered', 'refunded');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_type as enum ('thrifted', 'gift_set', 'gift_box', 'bath_body');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.job_type as enum ('generate_copy', 'bulk_tag', 'price_suggest', 'content_write');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.job_status as enum ('pending', 'running', 'done', 'failed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.user_role as enum ('admin', 'editor', 'viewer', 'customer');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.sellers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  customer_email text,
  customer_name text,
  shipping_address jsonb,
  subtotal numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  shipping_cost numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  shippo_transaction_id text,
  tracking_number text,
  tracking_url text,
  status public.order_status not null default 'pending',
  order_type public.order_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  title text not null,
  sku text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0,
  is_gift_box_item boolean not null default false
);

create table if not exists public.gift_vault_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  display_order integer not null default 0,
  max_qty_per_box integer not null default 1 check (max_qty_per_box > 0),
  category text not null default 'general',
  is_seasonal boolean not null default false,
  active_from date,
  active_until date,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builder_settings (
  id uuid primary key default gen_random_uuid(),
  minimum_spend numeric(10, 2) not null default 0,
  tier1_threshold numeric(10, 2) not null default 35,
  tier1_name text not null default 'Tier 1',
  tier1_reward text not null default 'Free sample',
  tier2_threshold numeric(10, 2) not null default 60,
  tier2_name text not null default 'Tier 2',
  tier2_reward text not null default 'Free gift wrap',
  tier3_threshold numeric(10, 2) not null default 90,
  tier3_name text not null default 'Tier 3',
  tier3_reward text not null default 'Premium bonus item',
  updated_at timestamptz not null default now()
);

create table if not exists public.draft_gift_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  total numeric(10, 2) not null default 0,
  note text,
  recipient_name text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  type public.job_type not null,
  payload jsonb not null default '{}'::jsonb,
  status public.job_status not null default 'pending',
  result jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body_md text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  source text not null default 'gift-concierge',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_user_created on public.orders (user_id, created_at desc);
create index if not exists idx_orders_seller_created on public.orders (seller_id, created_at desc);
create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_gift_vault_enabled on public.gift_vault_items (enabled, display_order);
create index if not exists idx_jobs_status_created on public.jobs (status, created_at desc);
create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);
