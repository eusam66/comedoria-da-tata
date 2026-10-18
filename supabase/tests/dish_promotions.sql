-- EXCLUSIVO da homologação da Comedoria; todas as fixtures são desfeitas.
begin;
do $$
declare
  dish uuid := gen_random_uuid();
  drink uuid := gen_random_uuid();
  zone uuid := gen_random_uuid();
  order_id uuid := gen_random_uuid();
  saved public.orders;
  customer jsonb;
  items jsonb;
  candidate_price numeric;
  rejected boolean;
  detail text;
begin
  assert exists(select 1 from public.restaurant_settings where key='environment' and value->>'project_ref'='nkywpsftihxcuvdxeexn'), 'HOMOLOGACAO_ONLY';
  insert into public.dishes(id,name,slug,price,stock,is_available,promo_price,promo_active,extras)
  values(dish,'HOMOLOGAÇÃO Promo SQL','homologacao-promo-'||dish,59.90,10,true,49.90,true,'{"addons":[{"id":"extra","name":"Extra fictício","price":2,"maxQty":2}]}');
  insert into public.beverages(id,name,size,price,stock) values(drink,'HOMOLOGAÇÃO Bebida SQL','Teste',5.50,10);
  insert into public.delivery_zones(id,name,fee,is_active) values(zone,'HOMOLOGAÇÃO Zona SQL',7.25,true);
  customer := jsonb_build_object('name','HOMOLOGAÇÃO','phone','000','delivery','delivery','delivery_zone_id',zone,'expected_total_cents',12205);
  items := jsonb_build_array(jsonb_build_object('id',dish,'type','dish','quantity',2,'expected_unit_cents',5190,'price',0,'addons',jsonb_build_array(jsonb_build_object('addonId','extra','qty',1))),jsonb_build_object('id',drink,'type','beverage','quantity',2,'expected_unit_cents',550));
  saved := public.create_order_with_stock_v2(order_id,'HOM-SQL-'||order_id,customer,items);
  assert saved.total = 122.05;
  assert (saved.items->0->>'price')::numeric=51.90;
  assert (saved.items->0->>'regular_price')::numeric=59.90;
  assert (saved.items->0->>'base_price')::numeric=49.90;
  assert (saved.items->0->>'promo_active')::boolean;
  assert (saved.metadata->'fulfillment'->>'subtotal')::numeric=114.80;
  assert (saved.metadata->'fulfillment'->>'delivery_fee')::numeric=7.25;
  assert (select stock from public.dishes where id=dish)=8;
  begin
    perform public.create_order_with_stock_v2(order_id,'HOM-SQL-'||order_id,customer,items);
    raise exception 'EXPECTED_DUPLICATE';
  exception when unique_violation then null;
  end;
  assert (select stock from public.dishes where id=dish)=8;

  -- Desativação não altera snapshot. Divergência desfaz baixas de todos os itens.
  update public.dishes set promo_active=false where id=dish;
  assert (select total from public.orders where id=order_id)=122.05;
  begin
    perform public.create_order_with_stock_v2(gen_random_uuid(),'HOM-CHANGED',customer,items);
    raise exception 'EXPECTED_CHANGE';
  exception when others then
    assert sqlerrm='PRICE_CHANGED';
    get stacked diagnostics detail = pg_exception_detail;
    assert (detail::jsonb->>'totalCents')::integer=14205;
  end;
  assert (select stock from public.dishes where id=dish)=8;
  assert (select stock from public.beverages where id=drink)=8;
  update public.dishes set promo_active=true where id=dish;

  -- Constraints: ativo sem valor, valor >= normal, zero, negativo, NaN/Infinity.
  foreach candidate_price in array array[0,-1,59.9,60,'NaN'::numeric,'Infinity'::numeric] loop
    rejected:=false;
    begin update public.dishes set promo_price=candidate_price where id=dish;
    exception when check_violation or numeric_value_out_of_range then rejected:=true;
    end;
    assert rejected, 'INVALID_PROMO_ACCEPTED';
  end loop;
  begin update public.dishes set promo_price=null where id=dish;
    raise exception 'EXPECTED_NO_PRICE';
  exception when check_violation then null;
  end;
  begin update public.dishes set price=49.90 where id=dish;
    raise exception 'EXPECTED_REGULAR_CORRECTION';
  exception when check_violation then null;
  end;

  -- Preço adulterado só gera novo resumo, nunca o valor enviado pelo navegador.
  begin
    perform public.create_order_with_stock_v2(gen_random_uuid(),'HOM-TAMPER',customer,jsonb_set(items,'{0,expected_unit_cents}','0'));
    raise exception 'EXPECTED_TAMPER_REJECTION';
  exception when others then assert sqlerrm='PRICE_CHANGED';
  end;
  assert (select stock from public.dishes where id=dish)=8;
  -- Variantes: total acumulado é conferido sob lock e não cria outra identidade.
  saved:=public.create_order_with_stock_v2(gen_random_uuid(),'HOM-VARIANTS',customer||'{"delivery":"pickup","expected_total_cents":9980}',jsonb_build_array(jsonb_build_object('id',dish,'type','dish','quantity',1,'expected_unit_cents',4990),jsonb_build_object('id',dish,'type','dish','quantity',1,'expected_unit_cents',4990,'notes','Outra embalagem')));
  assert saved.total=99.80 and jsonb_array_length(saved.items)=2;
  assert (select stock from public.dishes where id=dish)=6;
  update public.dishes set stock=0,is_available=false where id=dish;
  begin
    perform public.create_order_with_stock_v2(gen_random_uuid(),'HOM-ZERO',customer,items);
    raise exception 'EXPECTED_UNAVAILABLE';
  exception when others then assert sqlerrm='INVALID_PRODUCT';
  end;
  assert not has_function_privilege('anon','public.create_order_with_stock_v2(uuid,text,jsonb,jsonb)','execute');
  assert not has_function_privilege('authenticated','public.create_order_with_stock_v2(uuid,text,jsonb,jsonb)','execute');
end $$;
rollback;
select 'PASS: promoções, constraints, financeiro exato, adicionais, bebida, taxa, snapshot, rollback, preço adulterado, variantes, estoque, permissões' as result;
