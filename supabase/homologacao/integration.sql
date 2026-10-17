-- EXCLUSIVO nkywpsftihxcuvdxeexn. Testa RPCs reais e desfaz as alterações.
begin;
do $$
<<integration>>
declare
  dish_id uuid;
  drink_id uuid;
  zone_id uuid;
  no_stock uuid;
  order_id uuid := gen_random_uuid();
  code text := 'HOMOLOG-' || left(gen_random_uuid()::text,8);
  saved public.orders;
  customer jsonb;
  items jsonb;
  previous_stock integer;
  previous_drink integer;
  history_count integer;
begin
  assert exists(select 1 from public.restaurant_settings where key='environment' and value->>'project_ref'='nkywpsftihxcuvdxeexn'), 'HOMOLOGACAO_ONLY';
  select id,stock into dish_id,previous_stock from public.dishes where slug='homologacao-prato';
  select id,stock into drink_id,previous_drink from public.beverages where name='HOMOLOGAÇÃO Bebida';
  select id into no_stock from public.dishes where slug='homologacao-sem-estoque';
  select id into zone_id from public.delivery_zones where name='HOMOLOGAÇÃO Zona A';
  customer := jsonb_build_object('name','HOMOLOGAÇÃO Cliente','phone','000','delivery','delivery','address','Rua fictícia, 1','delivery_zone_id',zone_id,'checkout_fingerprint','homologacao');
  items := jsonb_build_array(jsonb_build_object('id',dish_id,'type','dish','quantity',2,'price',0,'addons',jsonb_build_array(jsonb_build_object('addonId','extra-homologacao','qty',1))),jsonb_build_object('id',drink_id,'type','beverage','quantity',1));
  saved := public.create_order_with_stock(order_id,code,customer,items);
  assert saved.total=67.80, 'Preço de catálogo + adicional + bebida + taxa';
  assert (saved.metadata->'fulfillment'->>'subtotal')::numeric=59.30;
  assert (saved.metadata->'fulfillment'->>'delivery_fee')::numeric=8.50;
  assert saved.metadata->>'checkout_fingerprint'='homologacao';
  assert (select stock from public.dishes where id=dish_id)=previous_stock-2;
  assert (select stock from public.beverages where id=drink_id)=previous_drink-1;

  -- Mesmo UUID: transação da segunda RPC falha sem consumir estoque.
  begin
    perform public.create_order_with_stock(order_id,code,customer,items);
    raise exception 'EXPECTED_DUPLICATE_REJECTION';
  exception when unique_violation then null;
  end;
  assert (select stock from public.dishes where id=dish_id)=previous_stock-2;
  assert (select count(*) from public.orders where id=order_id)=1;
  update public.delivery_zones set fee=99 where id=zone_id;
  assert (select total from public.orders where id=order_id)=67.80, 'Total histórico imutável';

  saved := public.update_order_status_with_stock_restore(code,'Cancelado');
  assert saved.stock_restored_at is not null;
  assert (select stock from public.dishes where id=dish_id)=previous_stock;
  assert (select stock from public.beverages where id=drink_id)=previous_drink;
  perform public.update_order_status_with_stock_restore(code,'Cancelado');
  assert (select stock from public.dishes where id=dish_id)=previous_stock, 'Não repor em dobro';
  select count(*) into history_count from public.order_history h where h.order_id=integration.order_id;
  assert history_count=2, 'Histórico de cancelamentos';

  saved := public.create_order_with_stock(gen_random_uuid(),'HOMOLOG-PICKUP-'||left(gen_random_uuid()::text,8),customer||'{"delivery":"pickup"}',jsonb_build_array(jsonb_build_object('id',dish_id,'type','dish','quantity',1)));
  assert saved.total=25.90;
  assert (saved.metadata->'fulfillment'->>'delivery_fee')::numeric=0;

  begin
    perform public.create_order_with_stock(gen_random_uuid(),'HOMOLOG-NOSTOCK',customer||'{"delivery":"pickup"}',jsonb_build_array(jsonb_build_object('id',no_stock,'type','dish','quantity',1)));
    raise exception 'EXPECTED_STOCK_REJECTION';
  exception when others then
    if sqlerrm not like '%INSUFFICIENT_STOCK%' then raise; end if;
  end;
  update public.delivery_zones set is_active=false where id=zone_id;
  begin
    perform public.create_order_with_stock(gen_random_uuid(),'HOMOLOG-ZONE-OFF',customer,items);
    raise exception 'EXPECTED_ZONE_REJECTION';
  exception when others then
    if sqlerrm not like '%DELIVERY_ZONE_UNAVAILABLE%' then raise; end if;
  end;
  assert not has_function_privilege('anon','public.create_order_with_stock(uuid,text,jsonb,jsonb)','execute');
  assert not has_function_privilege('authenticated','public.update_order_status_with_stock_restore(text,text)','execute');
  assert not has_table_privilege('anon','public.orders','select');
  assert not has_table_privilege('authenticated','public.orders','insert');
  assert not has_table_privilege('anon','public.admins','select');
end $$;
rollback;
select 'PASS: taxa, preço, adicional, bebida, estoque, UUID repetido, histórico, cancelamento, reposição, retirada, falta de estoque, zona inativa, permissões' as integration_result;
