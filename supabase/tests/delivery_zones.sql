-- TESTE EXCLUSIVAMENTE LOCAL: cria fixtures em uma transação e desfaz tudo.
-- Nunca executar no Supabase remoto. O harness local deve configurar antes:
-- SET comedoria.test_mode = 'local';
begin;
do $$ begin
  if current_setting('comedoria.test_mode', true) is distinct from 'local' then
    raise exception 'LOCAL_TEST_ONLY';
  end if;
end $$;

insert into public.delivery_zones(id,name,fee,position) values
  ('11111111-1111-4111-8111-111111111111','Local de teste',8.00,1);
insert into public.dishes(id,name,slug,price,stock,extras) values
  ('22222222-2222-4222-8222-222222222222','Produto de teste','produto-teste-entrega',59.90,10,
   '{"addons":[{"id":"extra-teste","name":"Extra de teste","price":2.00,"maxQty":1,"required":false}]}');
insert into public.beverages(id,name,size,price,stock) values
  ('33333333-3333-4333-8333-333333333333','Bebida de teste','200 ml',3.50,10);

do $$
declare
  saved public.orders;
  previous_stock integer;
  previous_count integer;
  selected_items jsonb := '[{"type":"dish","id":"22222222-2222-4222-8222-222222222222","quantity":1,"expected_unit_cents":5990,"price":0,"addons":[]}]';
  selected_customer jsonb := '{"expected_total_cents":6790,"name":"Cliente local","phone":"000","address":"Rua local","delivery":"delivery","delivery_zone_id":"11111111-1111-4111-8111-111111111111","notes":"preservar","delivery_fee":0,"fulfillment":{"delivery_fee":0,"custom":"preservar"}}';
begin
  saved := public.create_order_with_stock_v2(gen_random_uuid(),'LOCALDELIVERY',selected_customer,selected_items);
  assert saved.total = 67.90, 'Taxa e preço adulterados não podem afetar o total';
  assert (saved.metadata->'fulfillment'->>'subtotal')::numeric = 59.90;
  assert (saved.metadata->'fulfillment'->>'delivery_fee')::numeric = 8;
  assert saved.metadata->>'notes' = 'preservar';
  assert saved.metadata->'fulfillment'->>'custom' = 'preservar';
  assert (select stock from public.dishes where id='22222222-2222-4222-8222-222222222222') = 9;

  update public.delivery_zones set fee=10,name='Local renomeado',is_active=false
    where id='11111111-1111-4111-8111-111111111111';
  assert (select total from public.orders where code='LOCALDELIVERY') = 67.90;
  assert (select metadata->'fulfillment'->>'delivery_zone_name' from public.orders where code='LOCALDELIVERY') = 'Local de teste';
  assert (select (metadata->'fulfillment'->>'delivery_fee')::numeric from public.orders where code='LOCALDELIVERY') = 8;

  previous_count := (select count(*) from public.orders);
  previous_stock := (select stock from public.dishes where id='22222222-2222-4222-8222-222222222222');
  begin
    perform public.create_order_with_stock_v2(gen_random_uuid(),'LOCALINACTIVE',selected_customer,selected_items);
    raise exception 'TEST_EXPECTED_REJECTION';
  exception when others then
    if sqlerrm <> 'DELIVERY_ZONE_UNAVAILABLE' then raise; end if;
  end;
  assert (select count(*) from public.orders) = previous_count;
  assert (select stock from public.dishes where id='22222222-2222-4222-8222-222222222222') = previous_stock;

  begin
    perform public.create_order_with_stock_v2(gen_random_uuid(),'LOCALNOZONE',selected_customer - 'delivery_zone_id',selected_items);
    raise exception 'TEST_EXPECTED_REJECTION';
  exception when others then
    if sqlerrm <> 'DELIVERY_ZONE_REQUIRED' then raise; end if;
  end;
  begin
    perform public.create_order_with_stock_v2(gen_random_uuid(),'LOCALUNKNOWN',selected_customer || '{"delivery_zone_id":"44444444-4444-4444-8444-444444444444"}',selected_items);
    raise exception 'TEST_EXPECTED_REJECTION';
  exception when others then
    if sqlerrm <> 'DELIVERY_ZONE_UNAVAILABLE' then raise; end if;
  end;

  saved := public.create_order_with_stock_v2(gen_random_uuid(),'LOCALPICKUP',selected_customer || '{"delivery":"pickup","expected_total_cents":5990}',selected_items);
  assert saved.total = 59.90;
  assert saved.metadata->'fulfillment'->>'delivery_zone_id' is null;
  assert saved.metadata->'fulfillment'->>'delivery_zone_name' is null;
  assert (saved.metadata->'fulfillment'->>'delivery_fee')::numeric = 0;

  saved := public.update_order_status_with_stock_restore('LOCALPICKUP','Cancelado');
  saved := public.update_order_status_with_stock_restore('LOCALPICKUP','Cancelado');
  assert (select stock from public.dishes where id='22222222-2222-4222-8222-222222222222') = previous_stock;

  -- Adicionais e bebidas continuam recalculados no banco.
  saved := public.create_order_with_stock_v2(gen_random_uuid(),'LOCALADDONS',selected_customer || '{"delivery":"pickup","expected_total_cents":6540}',
    '[{"type":"dish","id":"22222222-2222-4222-8222-222222222222","quantity":1,"expected_unit_cents":6190,"addons":[{"addonId":"extra-teste","qty":1,"price":0}]},{"type":"beverage","id":"33333333-3333-4333-8333-333333333333","quantity":1,"expected_unit_cents":350,"addons":[]}]');
  assert saved.total = 65.40;
  assert (select stock from public.beverages where id='33333333-3333-4333-8333-333333333333') = 9;

  begin
    perform public.create_order_with_stock_v2(gen_random_uuid(),'LOCALOVERSOLD',selected_customer || '{"delivery":"pickup","expected_total_cents":5990}',
      '[{"type":"dish","id":"22222222-2222-4222-8222-222222222222","quantity":20,"addons":[]}]');
    raise exception 'TEST_EXPECTED_REJECTION';
  exception when others then
    if sqlerrm <> 'INSUFFICIENT_STOCK' then raise; end if;
  end;
  assert (select stock from public.dishes where id='22222222-2222-4222-8222-222222222222') >= 0;

  assert not has_table_privilege('anon','public.delivery_zones','SELECT');
  assert not has_table_privilege('anon','public.delivery_zones','INSERT');
  assert not has_table_privilege('authenticated','public.delivery_zones','UPDATE');
  assert not has_table_privilege('authenticated','public.delivery_zones','DELETE');
  assert not has_function_privilege('anon','public.create_order_with_stock_v2(uuid,text,jsonb,jsonb)','EXECUTE');
  assert has_function_privilege('service_role','public.create_order_with_stock_v2(uuid,text,jsonb,jsonb)','EXECUTE');
  assert (select relrowsecurity from pg_class where oid='public.delivery_zones'::regclass);

  begin
    insert into public.delivery_zones(name,fee) values ('Taxa negativa',-1);
    raise exception 'TEST_EXPECTED_REJECTION';
  exception when check_violation then null;
  end;
  begin
    insert into public.delivery_zones(name,fee) values ('Taxa inválida','NaN');
    raise exception 'TEST_EXPECTED_REJECTION';
  exception when check_violation then null;
  end;
end $$;
rollback;
