begin;
create or replace function public.enforce_store_capabilities() returns trigger language plpgsql security definer set search_path=public as $$declare f jsonb;total integer;begin
if is_admin() or auth.uid() is null then return new;end if;f:=store_plan_features(new.id);
if new.contact_phone is distinct from old.contact_phone and coalesce(new.contact_phone,'')<>'' and not coalesce((f->>'phone')::boolean,false) then raise exception 'رقم التواصل غير متاح في الاشتراك';end if;
if new.online_ordering and not old.online_ordering and not coalesce((f->>'ordering')::boolean,false) then raise exception 'الطلب غير متاح في الاشتراك';end if;
if new.opening_hours is distinct from old.opening_hours and not coalesce((f->>'hours')::boolean,false) then raise exception 'الدوام غير متاح في الاشتراك';end if;
if coalesce(old.image,'')='' and coalesce(new.image,'')<>'' then
perform pg_advisory_xact_lock(hashtext(new.id::text));
select 1+(select count(*) from store_page_photos where store_id=new.id)+(select coalesce(sum((case when p.image<>'' then 1 else 0 end)+jsonb_array_length(coalesce(to_jsonb(p.gallery),'[]'::jsonb))),0) from products p where p.store_id=new.id) into total;
if total>coalesce((f->>'max_photos')::integer,1) then raise exception 'بلغت الحد الأقصى لصور الاشتراك';end if;end if;return new;end $$;
create trigger store_capabilities before update on public.stores for each row execute function public.enforce_store_capabilities();
create or replace function public.enforce_order_subscription() returns trigger language plpgsql security definer set search_path=public as $$begin if not coalesce((store_plan_features(new.store_id)->>'ordering')::boolean,false) then raise exception 'المتجر لا يستقبل طلبات في الاشتراك الحالي';end if;return new;end $$;
create trigger order_subscription before insert on public.orders for each row execute function public.enforce_order_subscription();
commit;