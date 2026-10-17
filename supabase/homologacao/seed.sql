-- Executar exclusivamente em nkywpsftihxcuvdxeexn. Sem clientes reais.
begin;
do $$ begin
  if exists(select 1 from public.admins where email not like '%@example.invalid') or
     exists(select 1 from public.dishes where name not like 'HOMOLOGAÇÃO%') then
    raise exception 'HOMOLOGACAO_ONLY';
  end if;
end $$;
insert into public.categories(name,slug,description) values
  ('HOMOLOGAÇÃO Pratos','homologacao-pratos','Catálogo fictício de testes')
on conflict(slug) do nothing;
insert into public.dishes(name,slug,price,stock,category_id,is_available,ingredients,extras,image_url)
select 'HOMOLOGAÇÃO Prato com acentuação 🍽️','homologacao-prato',25.90,100,id,true,
  'Ingredientes fictícios','{"addons":[{"id":"extra-homologacao","name":"HOMOLOGAÇÃO Extra","price":2.00,"maxQty":2,"required":false}]}',
  '/branding/logo-oficial.jpg' from public.categories where slug='homologacao-pratos'
on conflict(slug) do nothing;
insert into public.dishes(name,slug,price,stock,is_available) values
  ('HOMOLOGAÇÃO Sem estoque','homologacao-sem-estoque',10,0,false),
  ('HOMOLOGAÇÃO Concorrência','homologacao-concorrencia',10,1,true)
on conflict(slug) do nothing;
insert into public.beverages(name,size,price,stock)
select 'HOMOLOGAÇÃO Bebida','200 ml',3.50,100
where not exists(select 1 from public.beverages where name='HOMOLOGAÇÃO Bebida');
insert into public.delivery_zones(name,fee,position)
select 'HOMOLOGAÇÃO Zona A',8.50,1
where not exists(select 1 from public.delivery_zones where name='HOMOLOGAÇÃO Zona A');
insert into public.delivery_zones(name,fee,position)
select 'HOMOLOGAÇÃO Grátis',0,2
where not exists(select 1 from public.delivery_zones where name='HOMOLOGAÇÃO Grátis');
insert into public.restaurant_settings(key,value) values
 ('environment','{"name":"HOMOLOGAÇÃO","project_ref":"nkywpsftihxcuvdxeexn"}'),
 ('storefront','{"name":"HOMOLOGAÇÃO Comedoria da Tata","timezone":"America/Recife","openingHours":{"monday":{"enabled":true,"open":"00:00","close":"23:59"},"tuesday":{"enabled":true,"open":"00:00","close":"23:59"},"wednesday":{"enabled":true,"open":"00:00","close":"23:59"},"thursday":{"enabled":true,"open":"00:00","close":"23:59"},"friday":{"enabled":true,"open":"00:00","close":"23:59"},"saturday":{"enabled":true,"open":"00:00","close":"23:59"},"sunday":{"enabled":true,"open":"00:00","close":"23:59"}}}'),
 ('order_operations','{"mode":"automatic","expiresAt":null}')
on conflict(key) do nothing;
insert into public.admins(email,name,role) values
 ('admin-homologacao@example.invalid','HOMOLOGAÇÃO Administrador','admin')
on conflict(email) do nothing;
commit;
