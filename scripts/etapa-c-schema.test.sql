-- Executar exclusivamente na homologação identificada; toda escrita é revertida.
begin;
do $$
declare v_id uuid:=gen_random_uuid(); row public.dishes; rejected boolean;
begin
 if (select value->>'project_ref' from public.restaurant_settings where key='environment') is distinct from 'nkywpsftihxcuvdxeexn' then raise exception 'Homologação obrigatória'; end if;
 insert into public.dishes(id,code,name,slug,price,stock,image_url) values(v_id,'ETAPA-C-SQL','HOMOLOGAÇÃO SQL','etapa-c-sql-'||v_id,59.90,10,'/pratos/legacy.jpg');
 select * into row from public.dishes d where d.id=v_id;
 assert row.image_url='/pratos/legacy.jpg' and row.gallery='[]'::jsonb and row.promo_active=false,'Contrato antigo/defaults';
 update public.dishes d set gallery='[{"url":"/pratos/a.jpg"},{"url":"/pratos/b.jpg"},{"url":"/pratos/c.jpg"}]' where d.id=v_id;
 select * into row from public.dishes d where d.id=v_id;
 assert row.image_url='/pratos/a.jpg','Capa da galeria';
 update public.dishes d set image_url='/pratos/old-api.jpg' where d.id=v_id;
 select * into row from public.dishes d where d.id=v_id;
 assert row.gallery->0->>'url'='/pratos/old-api.jpg' and row.gallery->1->>'url'='/pratos/b.jpg' and jsonb_array_length(row.gallery)=3,'API antiga preserva secundárias';
 update public.dishes d set image_url='/pratos/b.jpg' where d.id=v_id;
 select * into row from public.dishes d where d.id=v_id;
 assert row.gallery->0->>'url'='/pratos/b.jpg' and jsonb_array_length(row.gallery)=2,'Capa repetida não duplica';
 update public.dishes d set gallery='[]' where d.id=v_id;
 select * into row from public.dishes d where d.id=v_id;
 assert row.image_url is null and row.stock=10 and row.price=59.90,'Remoção preserva financeiro';
 rejected:=false;begin update public.dishes d set gallery='[{"url":"/1"},{"url":"/2"},{"url":"/3"},{"url":"/4"},{"url":"/5"},{"url":"/6"}]' where d.id=v_id;exception when check_violation then rejected:=true;end;assert rejected,'Limite seis';
 rejected:=false;begin update public.dishes d set gallery='[{"url":"javascript:alert(1)"}]' where d.id=v_id;exception when check_violation then rejected:=true;end;assert rejected,'URL inválida';
 rejected:=false;begin update public.dishes d set gallery='[{"url":"/same"},{"url":"/same"}]' where d.id=v_id;exception when check_violation then rejected:=true;end;assert rejected,'URL duplicada';
 rejected:=false;begin update public.dishes d set related_products=jsonb_build_array(jsonb_build_object('id',v_id,'type','dish')) where d.id=v_id;exception when check_violation then rejected:=true;end;assert rejected,'Autorreferência';
 rejected:=false;begin update public.dishes d set related_products='[{"id":"x","type":"beverage"}]' where d.id=v_id;exception when check_violation then rejected:=true;end;assert rejected,'Relacionado inválido';
 assert (select md5(pg_get_functiondef(p.oid))='0caff7bde38776d78f9219f6857af545' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname='create_order_with_stock'),'RPC antiga intacta';
 assert (select md5(pg_get_functiondef(p.oid))='f029899ac5c332f7a65c217d35af0c21' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname='create_order_with_stock_v2'),'RPC V2 intacta';
end $$;
rollback;
select 'PASS: constraints, defaults, sincronização legada, financeiro e rollback transacional' as result;
