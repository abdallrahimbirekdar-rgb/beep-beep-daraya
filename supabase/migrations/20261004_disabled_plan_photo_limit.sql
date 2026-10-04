begin;
-- The shared plan switch does not remove the shop's 50-photo ceiling.
create or replace function public.enforce_disabled_plan_photo_limit() returns trigger
language plpgsql security definer set search_path=public as $$
declare sid uuid; total integer; added integer; removed integer;
begin
 if coalesce((select subscriptions_enabled from platform_settings where id=true),false) then return new; end if;
 if tg_table_name='stores' then
  sid:=new.id;added:=case when coalesce(new.image,'')<>'' then 1 else 0 end;
  removed:=case when tg_op='UPDATE' and coalesce(old.image,'')<>'' then 1 else 0 end;
 elsif tg_table_name='products' then
  sid:=new.store_id;added:=(case when coalesce(new.image,'')<>'' then 1 else 0 end)+jsonb_array_length(coalesce(to_jsonb(new.gallery),'[]'::jsonb));
  removed:=case when tg_op='UPDATE' and old.store_id=sid then (case when coalesce(old.image,'')<>'' then 1 else 0 end)+jsonb_array_length(coalesce(to_jsonb(old.gallery),'[]'::jsonb)) else 0 end;
 else
  sid:=new.store_id;added:=1;removed:=case when tg_op='UPDATE' and old.store_id=sid then 1 else 0 end;
 end if;
 if added<=removed then return new;end if;
 perform pg_advisory_xact_lock(hashtext(sid::text));
 select coalesce((select case when coalesce(image,'')<>'' then 1 else 0 end from stores where id=sid),0)
  +(select count(*) from store_page_photos where store_id=sid)
  +(select coalesce(sum((case when coalesce(image,'')<>'' then 1 else 0 end)+jsonb_array_length(coalesce(to_jsonb(gallery),'[]'::jsonb))),0) from products where store_id=sid) into total;
 if total-removed+added>50 then raise exception 'الحد الأقصى للمحل 50 صورة، شاملًا الواجهة والمنتجات والصور الإضافية';end if;
 return new;
end $$;
drop trigger if exists disabled_plan_photo_limit on public.stores;
create trigger disabled_plan_photo_limit before insert or update of image on public.stores for each row execute function public.enforce_disabled_plan_photo_limit();
drop trigger if exists disabled_plan_photo_limit on public.products;
create trigger disabled_plan_photo_limit before insert or update of image,gallery,store_id on public.products for each row execute function public.enforce_disabled_plan_photo_limit();
drop trigger if exists disabled_plan_photo_limit on public.store_page_photos;
create trigger disabled_plan_photo_limit before insert or update on public.store_page_photos for each row execute function public.enforce_disabled_plan_photo_limit();
commit;
