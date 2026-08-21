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
