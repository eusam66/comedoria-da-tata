-- EXCLUSIVO para projeto NOVO de homologação, sem dados reais.
-- Baseline revisada: 001 + 003 + ingredients ausente no histórico + 007 + 009.
-- NÃO reaplica 004/005 (catálogo e remoções reais), 006 (administrador real),
-- 008 (backfill histórico), db/migrations (modelo incompatível).
-- Aplicar uma vez pelo MCP em nkywpsftihxcuvdxeexn; nunca em produção.

do $$ begin
  if exists(select 1 from pg_tables where schemaname='public') then
    raise exception 'EMPTY_HOMOLOGATION_PROJECT_REQUIRED';
  end if;
end $$;

-- FONTE: 001_create_tables.sql
-- 001_create_tables.sql
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- BANNERS
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  image_url text UNIQUE,
  link text,
  alt text,
  position integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- CONFIGURAÇÕES/SETTINGS DO RESTAURANTE
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE,
  value jsonb,
  created_at timestamptz DEFAULT now()
);

-- PRATOS
CREATE TABLE IF NOT EXISTS public.dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  serves integer DEFAULT 1,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_featured boolean DEFAULT false,
  is_new boolean DEFAULT false,
  image_url text,
  extras jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  customer_name text,
  customer_phone text,
  customer_address text,
  items jsonb,
  total numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pending',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- HISTÓRICO DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  event text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- ADMINISTRADORES (tabela leve para referência / RLS)
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_dishes_category ON public.dishes(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_code ON public.orders(code);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_dishes_slug ON public.dishes(slug);

-- Garantia de UNIQUE constraints para seed ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS uniq_categories_slug ON public.categories(slug);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_banners_image_url ON public.banners(image_url);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_restaurant_settings_key ON public.restaurant_settings(key);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dishes_slug ON public.dishes(slug);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_code ON public.orders(code);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_admins_email ON public.admins(email);

-- Fim da migration


-- FONTE: 003_store_management_fields.sql
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS subtitle text;

ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_categories_position ON public.categories(position);
CREATE INDEX IF NOT EXISTS idx_banners_position ON public.banners(position);
CREATE INDEX IF NOT EXISTS idx_dishes_position ON public.dishes(position);


-- FONTE: 007_inventory_beverages_atomic_orders.sql
-- Migration 007 corrigida após auditoria somente leitura do Supabase real.
-- NÃO APLICADA. Estoque inicial dos pratos existentes fica 0 por segurança e
-- deve ser preenchido manualmente antes do deploy do novo código.

alter table public.dishes add column if not exists stock integer not null default 0;
alter table public.orders add column if not exists stock_deducted_at timestamptz;
alter table public.orders add column if not exists stock_restored_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.dishes'::regclass and conname = 'dishes_stock_nonnegative'
  ) then
    alter table public.dishes
      add constraint dishes_stock_nonnegative check (stock >= 0) not valid;
  end if;
end
$$;
alter table public.dishes validate constraint dishes_stock_nonnegative;

create table if not exists public.beverages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_beverages_position on public.beverages(position, created_at);
alter table public.beverages enable row level security;

grant select on public.beverages to anon, authenticated;
grant all on public.beverages to service_role;
drop policy if exists "Bebidas são visíveis no cardápio" on public.beverages;
create policy "Bebidas são visíveis no cardápio"
  on public.beverages for select to anon, authenticated using (true);

create or replace function public.create_order_with_stock(
  p_id uuid,
  p_code text,
  p_customer jsonb,
  p_items jsonb
) returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  selected jsonb;
  catalog_addons jsonb;
  computed_addons jsonb;
  saved public.orders;
  computed_items jsonb := '[]'::jsonb;
  computed_total numeric(10,2) := 0;
  product_id uuid;
  product_type text;
  product_name text;
  product_price numeric(10,2);
  product_stock integer;
  quantity integer;
  addon_total numeric(10,2);
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER';
  end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'TOO_MANY_ITEMS'; end if;

  -- Valida tipos, UUIDs e quantidades antes de qualquer cast.
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where coalesce(x->>'type', '') not in ('dish', 'beverage')
       or coalesce(x->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(x->>'quantity', '') !~ '^[1-9][0-9]*$'
       or (x->>'quantity')::integer > 20
  ) then raise exception 'INVALID_ITEM'; end if;

  -- Um mesmo produto repetido poderia burlar a verificação de estoque.
  if (
    select count(*) from jsonb_array_elements(p_items)
  ) <> (
    select count(distinct (x->>'type', x->>'id')) from jsonb_array_elements(p_items) x
  ) then raise exception 'DUPLICATE_PRODUCT'; end if;

  -- Ordem estável de locks: pratos primeiro, bebidas depois.
  perform 1 from public.dishes d
   where d.id in (select (x->>'id')::uuid from jsonb_array_elements(p_items) x where x->>'type' = 'dish')
   order by d.id for update;
  perform 1 from public.beverages b
   where b.id in (select (x->>'id')::uuid from jsonb_array_elements(p_items) x where x->>'type' = 'beverage')
   order by b.id for update;

  for item in select * from jsonb_array_elements(p_items) loop
    product_id := (item->>'id')::uuid;
    product_type := item->>'type';
    quantity := (item->>'quantity')::integer;
    selected := coalesce(item->'addons', '[]'::jsonb);
    computed_addons := '[]'::jsonb;
    addon_total := 0;

    if jsonb_typeof(selected) <> 'array' then raise exception 'INVALID_ADDONS'; end if;

    if product_type = 'dish' then
      select d.name, d.price, d.stock, coalesce(d.extras->'addons', '[]'::jsonb)
        into product_name, product_price, product_stock, catalog_addons
      from public.dishes d where d.id = product_id;
      if not found then raise exception 'INVALID_PRODUCT'; end if;
      if quantity > product_stock then raise exception 'INSUFFICIENT_STOCK'; end if;

      if exists (
        select 1
        from jsonb_array_elements(selected) s
        left join jsonb_array_elements(catalog_addons) a on a->>'id' = s->>'addonId'
        where a is null
           or coalesce(s->>'qty', '') !~ '^[1-9][0-9]*$'
           or (s->>'qty')::integer > greatest(1, coalesce((a->>'maxQty')::integer, 1))
      ) then raise exception 'INVALID_ADDON_SELECTION'; end if;
      if (
        select count(*) from jsonb_array_elements(selected)
      ) <> (
        select count(distinct s->>'addonId') from jsonb_array_elements(selected) s
      ) then raise exception 'DUPLICATE_ADDON'; end if;
      if exists (
        select 1 from jsonb_array_elements(catalog_addons) a
        where coalesce((a->>'required')::boolean, false)
          and not exists (select 1 from jsonb_array_elements(selected) s where s->>'addonId' = a->>'id')
      ) then raise exception 'REQUIRED_ADDON_MISSING'; end if;

      select
        coalesce(jsonb_agg(jsonb_build_object(
          'addonId', a->>'id', 'name', a->>'name',
          'price', greatest(0, coalesce((a->>'price')::numeric, 0)),
          'qty', (s->>'qty')::integer
        )), '[]'::jsonb),
        coalesce(sum(greatest(0, coalesce((a->>'price')::numeric, 0)) * (s->>'qty')::integer), 0)
      into computed_addons, addon_total
      from jsonb_array_elements(selected) s
      join jsonb_array_elements(catalog_addons) a on a->>'id' = s->>'addonId';

      update public.dishes
      set stock = stock - quantity,
          is_available = (stock - quantity) >= 1,
          updated_at = now()
      where id = product_id;
    else
      if jsonb_array_length(selected) > 0 then raise exception 'INVALID_ADDON_SELECTION'; end if;
      select b.name || ' · ' || b.size, b.price, b.stock
        into product_name, product_price, product_stock
      from public.beverages b where b.id = product_id;
      if not found then raise exception 'INVALID_PRODUCT'; end if;
      if quantity > product_stock then raise exception 'INSUFFICIENT_STOCK'; end if;
      update public.beverages
      set stock = stock - quantity, updated_at = now()
      where id = product_id;
    end if;

    computed_items := computed_items || jsonb_build_array(jsonb_build_object(
      'id', product_id, 'type', product_type, 'name', product_name,
      'price', product_price + addon_total, 'quantity', quantity,
      'addons', computed_addons, 'notes', left(coalesce(item->>'notes', ''), 300)
    ));
    computed_total := computed_total + ((product_price + addon_total) * quantity);
  end loop;

  insert into public.orders(
    id, code, customer_name, customer_phone, customer_address,
    items, total, status, metadata, stock_deducted_at
  ) values (
    p_id, p_code, left(p_customer->>'name', 100), left(p_customer->>'phone', 30),
    left(p_customer->>'address', 500), computed_items, computed_total, 'Novo',
    p_customer, now()
  ) returning * into saved;
  return saved;
end;
$$;

revoke execute on function public.create_order_with_stock(uuid,text,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.create_order_with_stock(uuid,text,jsonb,jsonb) to service_role;

create or replace function public.update_order_status_with_stock_restore(
  p_code text,
  p_status text
) returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order public.orders;
  saved public.orders;
  item jsonb;
  quantity integer;
begin
  if p_status not in ('Novo', 'Em preparo', 'Pronto', 'Finalizado', 'Cancelado') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into current_order from public.orders where code = p_code for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  -- Só pedidos criados pela função atômica possuem stock_deducted_at.
  if p_status = 'Cancelado'
     and current_order.status <> 'Cancelado'
     and current_order.stock_deducted_at is not null
     and current_order.stock_restored_at is null then
    for item in select * from jsonb_array_elements(coalesce(current_order.items, '[]'::jsonb)) loop
      quantity := greatest(1, coalesce((item->>'quantity')::integer, 1));
      if item->>'type' = 'beverage' then
        update public.beverages
        set stock = stock + quantity, updated_at = now()
        where id = (item->>'id')::uuid;
      else
        update public.dishes
        set stock = stock + quantity, is_available = true, updated_at = now()
        where id = (item->>'id')::uuid;
      end if;
    end loop;
    update public.orders
    set status = p_status, stock_restored_at = now(), updated_at = now()
    where id = current_order.id returning * into saved;
  else
    update public.orders set status = p_status, updated_at = now()
    where id = current_order.id returning * into saved;
  end if;

  insert into public.order_history(order_id, event, payload)
  values (
    current_order.id,
    'status_changed',
    jsonb_build_object(
      'previous_status', current_order.status,
      'new_status', p_status,
      'stock_restored', saved.stock_restored_at is distinct from current_order.stock_restored_at
    )
  );
  return saved;
end;
$$;

revoke execute on function public.update_order_status_with_stock_restore(text,text)
  from public, anon, authenticated;
grant execute on function public.update_order_status_with_stock_restore(text,text) to service_role;

-- Deliberadamente NÃO converte status antigos. A normalização de Entregue e
-- completed deve ser autorizada separadamente após backup lógico.


-- FONTE: 009_delivery_zones.sql
-- Migration 009: taxas por localização. SOMENTE LOCAL neste bloco.
-- Sem seeds, backfill ou alterações de pedidos históricos.
-- Mantém assinatura e proteções da função atômica existente.

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  fee numeric(10,2) not null check (fee >= 0 and fee <= 99999999.99),
  is_active boolean not null default true,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_delivery_zones_active_position
  on public.delivery_zones(position, name, id) where is_active;

create function public.touch_delivery_zone_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.touch_delivery_zone_updated_at() from public, anon, authenticated;
create trigger delivery_zones_updated_at before update on public.delivery_zones
  for each row execute function public.touch_delivery_zone_updated_at();

-- Checkout e painel acessam pelas rotas do servidor. Não há acesso direto
-- para clientes; a service role continua exclusivamente no backend.
alter table public.delivery_zones enable row level security;
revoke all on public.delivery_zones from public, anon, authenticated;
grant select, insert, update on public.delivery_zones to service_role;

create or replace function public.create_order_with_stock(
  p_id uuid,
  p_code text,
  p_customer jsonb,
  p_items jsonb
) returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  selected jsonb;
  catalog_addons jsonb;
  computed_addons jsonb;
  saved public.orders;
  computed_items jsonb := '[]'::jsonb;
  computed_total numeric(10,2) := 0;
  product_id uuid;
  product_type text;
  product_name text;
  product_price numeric(10,2);
  product_stock integer;
  quantity integer;
  addon_total numeric(10,2);
  selected_zone public.delivery_zones;
  fulfillment jsonb;
  delivery_fee numeric(10,2) := 0;
begin
  -- Valida a localização na mesma transação; FOR SHARE impede alteração
  -- da taxa ou desativação antes de o pedido ser registrado.
  if coalesce(p_customer->>'delivery', '') not in ('delivery', 'pickup') then
    raise exception 'INVALID_FULFILLMENT';
  end if;
  if p_customer->>'delivery' = 'delivery' then
    if coalesce(p_customer->>'delivery_zone_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'DELIVERY_ZONE_REQUIRED';
    end if;
    select * into selected_zone from public.delivery_zones
      where id = (p_customer->>'delivery_zone_id')::uuid and is_active
      for share;
    if not found then raise exception 'DELIVERY_ZONE_UNAVAILABLE'; end if;
    delivery_fee := selected_zone.fee;
  end if;
  fulfillment := jsonb_build_object(
    'type', p_customer->>'delivery',
    'delivery_zone_id', selected_zone.id,
    'delivery_zone_name', selected_zone.name,
    'delivery_fee', delivery_fee
  );
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER';
  end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'TOO_MANY_ITEMS'; end if;

  -- Valida tipos, UUIDs e quantidades antes de qualquer cast.
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where coalesce(x->>'type', '') not in ('dish', 'beverage')
       or coalesce(x->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(x->>'quantity', '') !~ '^[1-9][0-9]*$'
       or (x->>'quantity')::integer > 20
  ) then raise exception 'INVALID_ITEM'; end if;

  -- Um mesmo produto repetido poderia burlar a verificação de estoque.
  if (
    select count(*) from jsonb_array_elements(p_items)
  ) <> (
    select count(distinct (x->>'type', x->>'id')) from jsonb_array_elements(p_items) x
  ) then raise exception 'DUPLICATE_PRODUCT'; end if;

  -- Ordem estável de locks: pratos primeiro, bebidas depois.
  perform 1 from public.dishes d
   where d.id in (select (x->>'id')::uuid from jsonb_array_elements(p_items) x where x->>'type' = 'dish')
   order by d.id for update;
  perform 1 from public.beverages b
   where b.id in (select (x->>'id')::uuid from jsonb_array_elements(p_items) x where x->>'type' = 'beverage')
   order by b.id for update;

  for item in select * from jsonb_array_elements(p_items) loop
    product_id := (item->>'id')::uuid;
    product_type := item->>'type';
    quantity := (item->>'quantity')::integer;
    selected := coalesce(item->'addons', '[]'::jsonb);
    computed_addons := '[]'::jsonb;
    addon_total := 0;

    if jsonb_typeof(selected) <> 'array' then raise exception 'INVALID_ADDONS'; end if;

    if product_type = 'dish' then
      select d.name, d.price, d.stock, coalesce(d.extras->'addons', '[]'::jsonb)
        into product_name, product_price, product_stock, catalog_addons
      from public.dishes d where d.id = product_id;
      if not found then raise exception 'INVALID_PRODUCT'; end if;
      if quantity > product_stock then raise exception 'INSUFFICIENT_STOCK'; end if;

      if exists (
        select 1
        from jsonb_array_elements(selected) s
        left join jsonb_array_elements(catalog_addons) a on a->>'id' = s->>'addonId'
        where a is null
           or coalesce(s->>'qty', '') !~ '^[1-9][0-9]*$'
           or (s->>'qty')::integer > greatest(1, coalesce((a->>'maxQty')::integer, 1))
      ) then raise exception 'INVALID_ADDON_SELECTION'; end if;
      if (
        select count(*) from jsonb_array_elements(selected)
      ) <> (
        select count(distinct s->>'addonId') from jsonb_array_elements(selected) s
      ) then raise exception 'DUPLICATE_ADDON'; end if;
      if exists (
        select 1 from jsonb_array_elements(catalog_addons) a
        where coalesce((a->>'required')::boolean, false)
          and not exists (select 1 from jsonb_array_elements(selected) s where s->>'addonId' = a->>'id')
      ) then raise exception 'REQUIRED_ADDON_MISSING'; end if;

      select
        coalesce(jsonb_agg(jsonb_build_object(
          'addonId', a->>'id', 'name', a->>'name',
          'price', greatest(0, coalesce((a->>'price')::numeric, 0)),
          'qty', (s->>'qty')::integer
        )), '[]'::jsonb),
        coalesce(sum(greatest(0, coalesce((a->>'price')::numeric, 0)) * (s->>'qty')::integer), 0)
      into computed_addons, addon_total
      from jsonb_array_elements(selected) s
      join jsonb_array_elements(catalog_addons) a on a->>'id' = s->>'addonId';

      update public.dishes
      set stock = stock - quantity,
          is_available = (stock - quantity) >= 1,
          updated_at = now()
      where id = product_id;
    else
      if jsonb_array_length(selected) > 0 then raise exception 'INVALID_ADDON_SELECTION'; end if;
      select b.name || ' · ' || b.size, b.price, b.stock
        into product_name, product_price, product_stock
      from public.beverages b where b.id = product_id;
      if not found then raise exception 'INVALID_PRODUCT'; end if;
      if quantity > product_stock then raise exception 'INSUFFICIENT_STOCK'; end if;
      update public.beverages
      set stock = stock - quantity, updated_at = now()
      where id = product_id;
    end if;

    computed_items := computed_items || jsonb_build_array(jsonb_build_object(
      'id', product_id, 'type', product_type, 'name', product_name,
      'price', product_price + addon_total, 'quantity', quantity,
      'addons', computed_addons, 'notes', left(coalesce(item->>'notes', ''), 300)
    ));
    computed_total := computed_total + ((product_price + addon_total) * quantity);
  end loop;

  fulfillment := fulfillment || jsonb_build_object('subtotal', computed_total);
  computed_total := computed_total + delivery_fee;

  insert into public.orders(
    id, code, customer_name, customer_phone, customer_address,
    items, total, status, metadata, stock_deducted_at
  ) values (
    p_id, p_code, left(p_customer->>'name', 100), left(p_customer->>'phone', 30),
    left(p_customer->>'address', 500), computed_items, computed_total, 'Novo',
    p_customer || jsonb_build_object(
      'delivery_zone_id', selected_zone.id,
      'fulfillment', (case when jsonb_typeof(p_customer->'fulfillment') = 'object'
        then p_customer->'fulfillment' else '{}'::jsonb end) || fulfillment
    ), now()
  ) returning * into saved;
  return saved;
end;
$$;

revoke execute on function public.create_order_with_stock(uuid,text,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.create_order_with_stock(uuid,text,jsonb,jsonb) to service_role;


alter table public.dishes add column if not exists ingredients text;
create index if not exists idx_order_history_order_id on public.order_history(order_id);

-- Leitura pública apenas do catálogo; demais operações passam pelo servidor.
DO $$ declare t text; begin
  foreach t in array array['categories','dishes','banners','restaurant_settings','orders','order_history','admins','beverages','delivery_zones'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
grant select on public.categories, public.dishes, public.beverages to anon, authenticated;
create policy homologacao_read_categories on public.categories for select to anon, authenticated using (true);
create policy homologacao_read_dishes on public.dishes for select to anon, authenticated using (true);

-- Sem política de escrita de Storage para anon/authenticated: uploads administrativos
-- são feitos pelas rotas autenticadas do servidor com service_role.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('dishes','dishes',true,10485760,array['image/jpeg','image/png','image/webp']),
 ('banners','banners',true,10485760,array['image/jpeg','image/png','image/webp']),
 ('branding','branding',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
