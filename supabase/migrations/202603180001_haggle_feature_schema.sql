-- Phase 1: Haggle/Make Offer Feature Database Schema
-- This migration adds tables and columns for the ToS-compliant haggle feature
-- Timing: 2026-03-18

-- Add offer status enum
do $$
begin
  create type public.offer_status as enum ('pending', 'accepted', 'declined', 'expired');
exception
  when duplicate_object then null;
end $$;

-- Create offers table (tracks all haggle offers)
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_email text not null,
  offered_amount numeric(10, 2) not null check (offered_amount > 0),
  status public.offer_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add haggle flag to products table
alter table public.products add column if not exists allows_haggle boolean not null default false;

-- Add offer tracking to orders table
alter table public.orders add column if not exists offer_id uuid references public.offers(id) on delete set null;
alter table public.orders add column if not exists final_amount numeric(10, 2);

-- Create indexes for performance
create index if not exists idx_offers_product_id on public.offers (product_id);
create index if not exists idx_offers_status on public.offers (status);
create index if not exists idx_offers_created on public.offers (created_at desc);
create index if not exists idx_offers_expires on public.offers (expires_at);
create index if not exists idx_offers_buyer_email on public.offers (buyer_email);
create index if not exists idx_orders_offer_id on public.orders (offer_id);

-- Create index for pending offers (most common query)
create index if not exists idx_offers_pending_expires on public.offers (status, expires_at) 
  where status = 'pending';

-- Enable RLS (if not already enabled for offers)
alter table public.offers enable row level security;

-- RLS policies for offers
-- Allow anyone to read non-sensitive offer info (except buyer_email for privacy)
drop policy if exists offers_select_public on public.offers;
create policy offers_select_public
  on public.offers for select
  using (true);

-- Allow anyone to insert offers
drop policy if exists offers_insert_public on public.offers;
create policy offers_insert_public
  on public.offers for insert
  with check (true);

-- Allow admin to update offers
drop policy if exists offers_update_admin on public.offers;
create policy offers_update_admin
  on public.offers for update
  using (auth.uid() in (
    select user_id from public.user_roles where role = 'admin'
  ))
  with check (auth.uid() in (
    select user_id from public.user_roles where role = 'admin'
  ));

-- Add comment for documentation
comment on table public.offers is 'Tracks all haggle/make-offer submissions. Independent of eBay, compliant with ToS.';
comment on column public.offers.buyer_email is 'Email of buyer making the offer';
comment on column public.offers.offered_amount is 'Proposed price by buyer';
comment on column public.offers.status is 'Lifecycle: pending -> accepted/declined/expired';
comment on column public.offers.expires_at is 'Auto-expires after 48 hours if not accepted/declined';

comment on column public.products.allows_haggle is 'If true, product can have "Make an Offer" button on storefront';
comment on column public.orders.offer_id is 'Links order to accepted offer (null for regular "Buy Now" purchases)';
comment on column public.orders.final_amount is 'Amount actually paid (may differ from list price if negotiated via offer)';
