create or replace function public.current_seller_id()
returns uuid
language sql
stable
as $$
  select id
  from public.sellers
  where owner_id = auth.uid()
  limit 1
$$;

create or replace function public.has_role(role_name public.user_role)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = role_name
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.has_role('admin'::public.user_role)
$$;

alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.listings enable row level security;
alter table public.integrations enable row level security;
alter table public.ai_generations enable row level security;
alter table public.sync_queue enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.gift_vault_items enable row level security;
alter table public.builder_settings enable row level security;
alter table public.draft_gift_boxes enable row level security;
alter table public.jobs enable row level security;
alter table public.content_pages enable row level security;
alter table public.audit_logs enable row level security;
alter table public.wishlists enable row level security;
alter table public.user_roles enable row level security;
alter table public.leads enable row level security;

drop policy if exists sellers_select on public.sellers;
create policy sellers_select on public.sellers
for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists sellers_insert on public.sellers;
create policy sellers_insert on public.sellers
for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists sellers_update on public.sellers;
create policy sellers_update on public.sellers
for update using (owner_id = auth.uid() or public.is_admin());

drop policy if exists products_select on public.products;
create policy products_select on public.products
for select using (seller_id = public.current_seller_id() or public.is_admin());

drop policy if exists products_write on public.products;
create policy products_write on public.products
for all using (seller_id = public.current_seller_id() or public.is_admin())
with check (seller_id = public.current_seller_id() or public.is_admin());

drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings
for select using (seller_id = public.current_seller_id() or public.is_admin());

drop policy if exists listings_write on public.listings;
create policy listings_write on public.listings
for all using (seller_id = public.current_seller_id() or public.is_admin())
with check (seller_id = public.current_seller_id() or public.is_admin());

drop policy if exists integrations_select on public.integrations;
create policy integrations_select on public.integrations
for select using (seller_id = public.current_seller_id() or public.is_admin());

drop policy if exists integrations_write on public.integrations;
create policy integrations_write on public.integrations
for all using (seller_id = public.current_seller_id() or public.is_admin())
with check (seller_id = public.current_seller_id() or public.is_admin());

drop policy if exists ai_generations_select on public.ai_generations;
create policy ai_generations_select on public.ai_generations
for select using (seller_id = public.current_seller_id() or public.is_admin());

drop policy if exists ai_generations_write on public.ai_generations;
create policy ai_generations_write on public.ai_generations
for all using (seller_id = public.current_seller_id() or public.is_admin())
with check (seller_id = public.current_seller_id() or public.is_admin());

drop policy if exists sync_queue_select on public.sync_queue;
create policy sync_queue_select on public.sync_queue
for select using (seller_id = public.current_seller_id() or public.is_admin());

drop policy if exists sync_queue_write on public.sync_queue;
create policy sync_queue_write on public.sync_queue
for all using (seller_id = public.current_seller_id() or public.is_admin())
with check (seller_id = public.current_seller_id() or public.is_admin());

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
for select using (
  user_id = auth.uid()
  or seller_id = public.current_seller_id()
  or public.is_admin()
);

drop policy if exists orders_write on public.orders;
create policy orders_write on public.orders
for all using (public.is_admin() or seller_id = public.current_seller_id())
with check (public.is_admin() or seller_id = public.current_seller_id());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
for select using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or o.seller_id = public.current_seller_id() or public.is_admin())
  )
);

drop policy if exists order_items_write on public.order_items;
create policy order_items_write on public.order_items
for all using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (o.seller_id = public.current_seller_id() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (o.seller_id = public.current_seller_id() or public.is_admin())
  )
);

drop policy if exists gift_vault_items_select on public.gift_vault_items;
create policy gift_vault_items_select on public.gift_vault_items
for select using (enabled = true or public.is_admin() or public.has_role('editor'::public.user_role));

drop policy if exists gift_vault_items_write on public.gift_vault_items;
create policy gift_vault_items_write on public.gift_vault_items
for all using (public.is_admin() or public.has_role('editor'::public.user_role))
with check (public.is_admin() or public.has_role('editor'::public.user_role));

drop policy if exists builder_settings_select on public.builder_settings;
create policy builder_settings_select on public.builder_settings
for select using (auth.uid() is not null);

drop policy if exists builder_settings_write on public.builder_settings;
create policy builder_settings_write on public.builder_settings
for all using (public.is_admin() or public.has_role('editor'::public.user_role))
with check (public.is_admin() or public.has_role('editor'::public.user_role));

drop policy if exists draft_gift_boxes_select on public.draft_gift_boxes;
create policy draft_gift_boxes_select on public.draft_gift_boxes
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists draft_gift_boxes_write on public.draft_gift_boxes;
create policy draft_gift_boxes_write on public.draft_gift_boxes
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs
for select using (created_by = auth.uid() or public.is_admin() or public.has_role('editor'::public.user_role));

drop policy if exists jobs_write on public.jobs;
create policy jobs_write on public.jobs
for all using (created_by = auth.uid() or public.is_admin() or public.has_role('editor'::public.user_role))
with check (created_by = auth.uid() or public.is_admin() or public.has_role('editor'::public.user_role));

drop policy if exists content_pages_select on public.content_pages;
create policy content_pages_select on public.content_pages
for select using (published = true or public.is_admin() or public.has_role('editor'::public.user_role));

drop policy if exists content_pages_write on public.content_pages;
create policy content_pages_write on public.content_pages
for all using (public.is_admin() or public.has_role('editor'::public.user_role))
with check (public.is_admin() or public.has_role('editor'::public.user_role));

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
for select using (public.is_admin() or public.has_role('editor'::public.user_role));

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
for insert with check (public.is_admin() or public.has_role('editor'::public.user_role));

drop policy if exists wishlists_select on public.wishlists;
create policy wishlists_select on public.wishlists
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists wishlists_write on public.wishlists;
create policy wishlists_write on public.wishlists
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_roles_write on public.user_roles;
create policy user_roles_write on public.user_roles
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads
for select using (user_id = auth.uid() or public.is_admin() or public.has_role('editor'::public.user_role));

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads
for insert with check (auth.uid() is not null);
