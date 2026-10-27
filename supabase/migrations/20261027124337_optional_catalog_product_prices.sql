begin;
alter table public.products alter column price drop not null;
-- Prices may remain empty for catalog pages. Ordering needs a concrete price.
create or replace function public.require_orderable_product_price() returns trigger
language plpgsql security invoker set search_path='' as $$
declare ordering boolean;
begin
 if new.price is null then
  select online_ordering into ordering from public.stores where id=new.store_id for share;
  if ordering is distinct from false then raise exception 'أضف سعر المنتج قبل عرضه في متجر يستقبل الطلبات';end if;
 end if;
 return new;
end;$$;
revoke all on function public.require_orderable_product_price() from public,anon,authenticated;
create trigger require_orderable_product_price before insert or update of price,store_id on public.products
 for each row execute function public.require_orderable_product_price();
create or replace function public.require_prices_before_ordering() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.online_ordering is distinct from false and exists(select 1 from public.products where store_id=new.id and price is null)
 then raise exception 'أضف أسعار المنتجات أولًا قبل تفعيل الطلب عبر الموقع';end if;
 return new;
end;$$;
revoke all on function public.require_prices_before_ordering() from public,anon,authenticated;
create trigger require_prices_before_ordering before update of online_ordering on public.stores
 for each row execute function public.require_prices_before_ordering();
-- QR table orders also reject products that have no price yet.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('table_service_private.place(uuid,uuid,uuid,jsonb,text)'::regprocedure) into definition;
 if position('and store_id=s.id and available for share' in definition)=0 then raise exception 'Unexpected table ordering definition';end if;
 execute replace(definition,'and store_id=s.id and available for share','and store_id=s.id and available and price is not null for share');
end;$migration$;
commit;
