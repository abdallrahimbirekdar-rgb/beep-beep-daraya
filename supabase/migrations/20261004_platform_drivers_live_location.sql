begin;
set local lock_timeout='5s';
alter table public.store_drivers alter column store_id drop not null;
alter table public.store_drivers add column driver_type text generated always as (case when store_id is null then 'platform' else 'store' end) stored;
create unique index platform_drivers_email_unique on public.store_drivers(email) where store_id is null;
create or replace function public.add_store_driver(p_store uuid,p_name text,p_phone text,p_email text) returns uuid language plpgsql security definer set search_path=public as $$
declare did uuid;
begin
 if auth.uid() is null or not manages_store(p_store) then raise exception 'لا تملك صلاحية إدارة هذا المتجر';end if;
 if p_store is not null and not exists(select 1 from stores where id=p_store and deleted_at is null) then raise exception 'المتجر غير متاح';end if;
 if trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'أدخل بريداً إلكترونياً صحيحاً';end if;
 insert into store_drivers(store_id,name,phone,email) values(p_store,trim(p_name),trim(p_phone),lower(trim(p_email))) returning id into did;
 return did;
 exception when unique_violation then raise exception 'هذا البريد مضاف إلى مندوبي المتجر بالفعل';
end $$;
create or replace function public.set_store_driver_active(p_driver uuid,p_active boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from store_drivers where id=p_driver and manages_store(store_id) for update;
 if not found or auth.uid() is null then raise exception 'غير مسموح';end if;
 update store_drivers set active=p_active where id=p_driver;
end $$;
create or replace function public.accept_driver_invite(p_token uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare d store_drivers%rowtype;
begin
 if auth.uid() is null then raise exception 'سجل الدخول أولاً';end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'أكد بريدك الإلكتروني قبل قبول الدعوة';end if;
 select * into d from store_drivers where invite_token=p_token for update;
 if not found or not d.active or d.email is distinct from lower(auth.jwt()->>'email') or (d.user_id is not null and d.user_id<>auth.uid()) then raise exception 'الدعوة غير متاحة لهذا الحساب. سجل الدخول بالبريد الذي أضافه صاحب المتجر';end if;
 if d.store_id is not null and not exists(select 1 from stores where id=d.store_id and active and deleted_at is null) then raise exception 'المتجر غير متاح';end if;
 update store_drivers set user_id=auth.uid() where id=d.id;
 return d.id;
end $$;
create or replace function public.my_driver_memberships() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'store_id',d.store_id,'name',d.name,'driver_type',d.driver_type,'store_name',coalesce(s.name,'فريق الموقع'),'active',d.active and (d.store_id is null or (s.active and s.deleted_at is null)))),'[]'::jsonb)
 from store_drivers d left join stores s on s.id=d.store_id where d.user_id=auth.uid();
$$;
-- Drivers receive only delivery details, never access to the merchant's order table.
create or replace function public.my_driver_orders() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(x.payload order by x.created_at desc),'[]'::jsonb) from (
 select o.created_at,jsonb_build_object('id',o.id,'store_id',o.store_id,'store_name',s.name,'store_phone',s.contact_phone,'store_address',s.address,'customer_name',o.customer_name,'phone',o.phone,'address',o.address,'area',o.area,'notes',o.notes,'items',o.items,'total',o.total,'delivery_fee',o.delivery_fee,'latitude',o.latitude,'longitude',o.longitude,'status',o.status,'created_at',o.created_at) payload
 from orders o join store_drivers d on d.id=o.driver_id join stores s on s.id=o.store_id
 where d.user_id=auth.uid() and d.active and s.active and s.deleted_at is null and (d.store_id is null or d.store_id=o.store_id) and o.fulfillment_method='delivery'
 order by o.created_at desc limit 200) x;
$$;
create or replace function public.assign_order_driver(p_order uuid,p_driver uuid,p_expected uuid default null) returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype;
begin
 select * into o from orders where id=p_order for update;
 if not found or auth.uid() is null or not manages_store(o.store_id) then raise exception 'غير مسموح';end if;
 if o.driver_id is distinct from p_expected then raise exception 'تغير المندوب. حدّث الطلب وأعد المحاولة';end if;
 if o.fulfillment_method<>'delivery' or o.status in ('تم التسليم','ملغي') then raise exception 'يمكن تعيين مندوب للطلبات الجارية التي تحتاج توصيلاً فقط';end if;
 if not is_admin() and exists(select 1 from store_drivers where id=o.driver_id and store_id is null) then raise exception 'مندوب الموقع تديره إدارة الموقع فقط';end if;
 if p_driver is not null and not exists(select 1 from store_drivers where id=p_driver and (store_id=o.store_id or (store_id is null and is_admin())) and active and user_id is not null) then raise exception 'اختر مندوباً فعالاً قَبِل الدعوة وربط حسابه';end if;
 update orders set driver_id=p_driver where id=p_order;
end $$;
create or replace function public.driver_set_order_status(p_order uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype;
begin
 select * into o from orders where id=p_order for update;
 if not found or auth.uid() is null or o.fulfillment_method<>'delivery' or not exists(select 1 from store_drivers d join stores s on s.id=o.store_id where d.id=o.driver_id and (d.store_id is null or d.store_id=o.store_id) and d.user_id=auth.uid() and d.active and s.active and s.deleted_at is null) then raise exception 'الطلب غير مخصص لك أو تم إيقاف حساب المندوب';end if;
 if not ((o.status='قيد التحضير' and p_status='في الطريق') or (o.status='في الطريق' and p_status='تم التسليم')) then raise exception 'ابدأ التوصيل بعد تجهيز الطلب، ثم أكد التسليم';end if;
 update orders set status=p_status where id=p_order;
end $$;

create function public.managed_order_driver_summaries() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'driver_type',d.driver_type,'active',d.active)),'[]'::jsonb) from store_drivers d where exists(select 1 from orders o where o.driver_id=d.id and manages_store(o.store_id));
$$;
create table public.order_driver_locations (
 order_id uuid primary key references public.orders(id) on delete cascade,
 driver_id uuid not null references public.store_drivers(id),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 accuracy double precision check(accuracy between 0 and 100000),
 shared boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.order_driver_locations enable row level security;
revoke all on public.order_driver_locations from public,anon,authenticated;
create function public.update_driver_location(p_order uuid,p_lat double precision,p_lng double precision,p_accuracy double precision) returns void language plpgsql security definer set search_path=public as $$
declare did uuid;
begin
 select d.id into did from orders o join store_drivers d on d.id=o.driver_id join stores s on s.id=o.store_id where o.id=p_order and o.status='في الطريق' and o.fulfillment_method='delivery' and d.user_id=auth.uid() and d.active and s.active and s.deleted_at is null and (d.store_id is null or d.store_id=o.store_id) for share of o,d;
 if did is null then raise exception 'مشاركة الموقع متاحة فقط أثناء توصيل طلب مخصص لك';end if;
 if p_lat is null or p_lng is null or not(p_lat between -90 and 90) or not(p_lng between -180 and 180) or p_accuracy is null or not(p_accuracy between 0 and 100000) then raise exception 'إحداثيات الموقع غير صحيحة';end if;
 insert into order_driver_locations(order_id,driver_id,latitude,longitude,accuracy,shared,updated_at) values(p_order,did,p_lat,p_lng,p_accuracy,true,now()) on conflict(order_id) do update set driver_id=excluded.driver_id,latitude=excluded.latitude,longitude=excluded.longitude,accuracy=excluded.accuracy,shared=true,updated_at=now();
end $$;
create function public.stop_driver_location(p_order uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 update order_driver_locations l set shared=false where l.order_id=p_order and exists(select 1 from store_drivers d where d.id=l.driver_id and d.user_id=auth.uid());
end $$;
create function public.order_driver_location(p_order uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from orders o where o.id=p_order and (o.customer_id=auth.uid() or manages_store(o.store_id))) then raise exception 'الطلب غير متاح لهذا الحساب';end if;
 select jsonb_build_object('latitude',l.latitude,'longitude',l.longitude,'accuracy',l.accuracy,'updated_at',l.updated_at,'driver_name',d.name,'driver_type',d.driver_type) into result from orders o join order_driver_locations l on l.order_id=o.id and l.driver_id=o.driver_id join store_drivers d on d.id=o.driver_id join stores s on s.id=o.store_id where o.id=p_order and o.status='في الطريق' and o.fulfillment_method='delivery' and l.shared and l.updated_at>now()-interval '5 minutes' and d.active and s.active and s.deleted_at is null and (d.store_id is null or d.store_id=o.store_id);
 return result;
end $$;
revoke all on function public.managed_order_driver_summaries(),public.update_driver_location(uuid,double precision,double precision,double precision),public.stop_driver_location(uuid),public.order_driver_location(uuid) from public,anon;
grant execute on function public.managed_order_driver_summaries(),public.update_driver_location(uuid,double precision,double precision,double precision),public.stop_driver_location(uuid),public.order_driver_location(uuid) to authenticated;
commit;
