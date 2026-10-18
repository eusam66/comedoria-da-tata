-- Ativação exclusivamente manual. Não altera preços, estoque ou pedidos existentes.
alter table public.dishes
  add column promo_price numeric(10,2),
  add column promo_active boolean not null default false;

alter table public.dishes
  add constraint dishes_regular_price_valid check (
    price > 0 and price < 100000000 and price = round(price, 2)
    and price::text not in ('NaN','Infinity','-Infinity')
  ),
  add constraint dishes_promo_price_valid check (
    promo_price is null or (promo_price > 0 and promo_price < price
      and promo_price::text not in ('NaN','Infinity','-Infinity'))
  ),
  add constraint dishes_promo_activation_valid check (not promo_active or promo_price is not null);
-- Preflight: auditar preços legados antes de aplicar; nenhuma linha é corrigida silenciosamente.

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
  regular_price numeric(10,2);
  promotion_active boolean;
  prices_changed boolean := false;
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

  -- Variantes do mesmo prato são permitidas; cada linha verifica o estoque
  -- restante sob o mesmo lock, de modo que a soma nunca exceda o disponível.
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
    promotion_active := false;

    if jsonb_typeof(selected) <> 'array' then raise exception 'INVALID_ADDONS'; end if;

    if product_type = 'dish' then
      select d.name, case when d.promo_active then d.promo_price else d.price end, d.price, d.promo_active, d.stock, coalesce(d.extras->'addons', '[]'::jsonb)
        into product_name, product_price, regular_price, promotion_active, product_stock, catalog_addons
      from public.dishes d where d.id = product_id and d.is_available;
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
      regular_price := product_price;
      update public.beverages
      set stock = stock - quantity, updated_at = now()
      where id = product_id;
    end if;

    -- Valor esperado é somente uma precondição de confirmação, nunca preço cobrado.
    if coalesce(item->>'expected_unit_cents', '') !~ '^[0-9]{1,12}$' then
      raise exception 'PRICE_CONFIRMATION_REQUIRED';
    end if;
    prices_changed := prices_changed or (item->>'expected_unit_cents')::bigint <> round((product_price + addon_total) * 100);
    computed_items := computed_items || jsonb_build_array(jsonb_build_object(
      'id', product_id, 'type', product_type, 'name', product_name,
      'price', product_price + addon_total, 'quantity', quantity,
      'base_price', product_price, 'regular_price', regular_price, 'promo_active', promotion_active,
      'addons', computed_addons, 'notes', left(coalesce(item->>'notes', ''), 300)
    ));
    computed_total := computed_total + ((product_price + addon_total) * quantity);
  end loop;

  fulfillment := fulfillment || jsonb_build_object('subtotal', computed_total);
  computed_total := computed_total + delivery_fee;

  if coalesce(p_customer->>'expected_total_cents', '') !~ '^[0-9]{1,12}$' then
    raise exception 'PRICE_CONFIRMATION_REQUIRED';
  end if;
  if prices_changed or (p_customer->>'expected_total_cents')::bigint <> round(computed_total * 100) then
    -- A exceção desfaz TODAS as baixas de estoque desta transação.
    raise exception 'PRICE_CHANGED' using detail = jsonb_build_object(
      'items', computed_items, 'fulfillment', fulfillment,
      'totalCents', round(computed_total * 100)
    )::text;
  end if;

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
