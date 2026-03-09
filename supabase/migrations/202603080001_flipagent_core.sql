create extension if not exists "pgcrypto";

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  shop_name text not null,
  shop_description text,
  avatar_url text,
  stripe_customer_id text,
  subscription_tier text not null default 'free',
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  sku text not null,
  title text not null,
  description text,
  brand text,
  style_name text,
  category text,
  condition text,
  price numeric(10, 2),
  cost numeric(10, 2),
  estimated_profit numeric(10, 2),
  images jsonb not null default '{}'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  tags text[] not null default array[]::text[],
  listings jsonb not null default '{}'::jsonb,
  sync_status jsonb not null default '{}'::jsonb,
  sync_last_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, sku)
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  marketplace text not null,
  marketplace_id text,
  title text not null,
  description text not null,
  seo_tags text[] not null default array[]::text[],
  category_id text,
  sku text,
  price numeric(10, 2),
  quantity integer not null default 1,
  status text not null default 'draft',
  published_at timestamptz,
  sync_error text,
  raw_api_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  service text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  credentials jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  sync_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, service)
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  input_image_url text,
  input_text text,
  model_used text,
  output_listing jsonb,
  tokens_used integer,
  cost numeric(10, 4),
  quality_score numeric(3, 2),
  user_feedback text,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  marketplace text not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  error_message text,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  created_at timestamptz not null default now(),
  scheduled_at timestamptz not null default now() + interval '5 seconds',
  completed_at timestamptz
);

create index if not exists idx_products_seller on public.products (seller_id);
create index if not exists idx_products_seller_sku on public.products (seller_id, sku);
create index if not exists idx_listings_seller_marketplace on public.listings (seller_id, marketplace);
create index if not exists idx_integrations_seller on public.integrations (seller_id);
create index if not exists idx_sync_queue_status_scheduled on public.sync_queue (status, scheduled_at);
create index if not exists idx_ai_generations_seller_created on public.ai_generations (seller_id, created_at desc);
