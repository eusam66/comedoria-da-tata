-- Etapa C: expansão aditiva. Não altera RPCs financeiras, preços, estoque ou pedidos.
create function public.etapa_c_valid_gallery(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; seen text[] := '{}';
begin
 if jsonb_typeof(value) <> 'array' then return false; end if;
 if jsonb_array_length(value)>5 then return false; end if;
 for item in select * from jsonb_array_elements(value) loop
  if jsonb_typeof(item)<>'object' then return false; end if;
  if jsonb_typeof(item->'url') is distinct from 'string' or length(item->>'url')>2048 or (item->>'url') !~ '^(https://|/[^/])' then return false; end if;
  if item ? 'alt' and (jsonb_typeof(item->'alt')<>'string' or length(item->>'alt')>160) then return false; end if;
  if (item->>'url')=any(seen) then return false; end if;
  seen:=array_append(seen,item->>'url');
 end loop;
 return true;
end $$;
create function public.etapa_c_valid_related(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; seen text[] := '{}'; token text;
begin
 if jsonb_typeof(value)<>'array' then return false; end if;
 if jsonb_array_length(value)>6 then return false; end if;
 for item in select * from jsonb_array_elements(value) loop
  if jsonb_typeof(item)<>'object' then return false; end if;
  if coalesce(item->>'type','') not in ('dish','beverage') or coalesce(item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;
  token:=(item->>'type')||(item->>'id');
  if token=any(seen) then return false; end if;
  seen:=array_append(seen,token);
 end loop;
 return true;
end $$;
revoke execute on function public.etapa_c_valid_gallery(jsonb),public.etapa_c_valid_related(jsonb) from public,anon,authenticated;
grant execute on function public.etapa_c_valid_gallery(jsonb),public.etapa_c_valid_related(jsonb) to service_role;
alter table public.dishes
 add column gallery jsonb not null default '[]'::jsonb,
 add column related_products jsonb not null default '[]'::jsonb,
 add column accompaniments text,
 add column dish_notes text,
 add constraint dishes_gallery_valid check(public.etapa_c_valid_gallery(gallery)),
 add constraint dishes_related_valid check(public.etapa_c_valid_related(related_products)),
 add constraint dishes_not_own_related check(not related_products @> jsonb_build_array(jsonb_build_object('type','dish','id',id::text))),
 add constraint dishes_commercial_text_valid check(length(coalesce(accompaniments,''))<=2000 and length(coalesce(dish_notes,''))<=2000);
-- A capa permanece em image_url. Clientes antigos podem atualizar a capa sem
-- apagar as demais imagens. Nenhuma linha antiga é reescrita pela migration.
create function public.etapa_c_sync_gallery() returns trigger
language plpgsql set search_path = '' as $$
begin
 if TG_OP='INSERT' then
  if jsonb_typeof(NEW.gallery)='array' and jsonb_array_length(NEW.gallery)>0 then NEW.image_url:=NEW.gallery->0->>'url'; end if;
 elsif NEW.gallery is distinct from OLD.gallery then
  if jsonb_typeof(NEW.gallery)='array' then NEW.image_url:=NEW.gallery->0->>'url'; end if;
 elsif NEW.image_url is distinct from OLD.image_url and jsonb_typeof(NEW.gallery)='array' and jsonb_array_length(NEW.gallery)>0 then
  select coalesce(jsonb_agg(photo order by ordinal),'[]'::jsonb) into NEW.gallery
   from jsonb_array_elements(NEW.gallery) with ordinality as photos(photo,ordinal)
   where ordinal>1 and (NEW.image_url is null or photo->>'url'<>NEW.image_url);
  if NEW.image_url is not null then NEW.gallery:=jsonb_build_array(jsonb_build_object('url',NEW.image_url,'alt',''))||NEW.gallery; end if;
  NEW.image_url:=NEW.gallery->0->>'url';
 end if;
 return NEW;
end $$;
revoke execute on function public.etapa_c_sync_gallery() from public,anon,authenticated;
create trigger dishes_sync_gallery before insert or update of gallery,image_url on public.dishes for each row execute function public.etapa_c_sync_gallery();
notify pgrst,'reload schema';
