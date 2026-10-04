begin;
set local lock_timeout='5s';
create table public.store_drivers (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 user_id uuid references auth.users(id) on delete set null,
 name text not null check(length(trim(name)) between 1 and 100),
 phone text not null default '' check(length(phone)<=40),
 email text not null check(length(email) between 3 and 254 and email=lower(trim(email))),
 active boolean not null default true,
 invite_token uuid not null unique default gen_random_uuid(),
 created_at timestamptz not null default now(),
 unique(store_id,email)
);
create index store_drivers_user_idx on public.store_drivers(user_id);
alter table public.store_drivers enable row level security;
create policy store_drivers_manage_read on public.store_drivers for select to authenticated using(public.manages_store(store_id));
revoke all on public.store_drivers from anon,authenticated;
grant select on public.store_drivers to authenticated;
alter table public.orders add column driver_id uuid references public.store_drivers(id);
create index orders_driver_created_idx on public.orders(driver_id,created_at desc);

create function public.add_store_driver(p_store uuid,p_name text,p_phone text,p_email text) returns uuid language plpgsql security definer set search_path=public as $$
declare did uuid;
begin
 if auth.uid() is null or not manages_store(p_store) then raise exception 'لا تملك صلاحية إدارة هذا المتجر';end if;
 if not exists(select 1 from stores where id=p_store and deleted_at is null) then raise exception 'المتجر غير متاح';end if;
 if trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'أدخل بريداً إلكترونياً صحيحاً';end if;
 insert into store_drivers(store_id,name,phone,email) values(p_store,trim(p_name),trim(p_phone),lower(trim(p_email))) returning id into did;
 return did;
 exception when unique_violation then raise exception 'هذا البريد مضاف إلى مندوبي المتجر بالفعل';
end $$;
create function public.set_store_driver_active(p_driver uuid,p_active boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from store_drivers where id=p_driver and manages_store(store_id) for update;
 if not found or auth.uid() is null then raise exception 'غير مسموح';end if;
 update store_drivers set active=p_active where id=p_driver;
end $$;
create function public.accept_driver_invite(p_token uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare d store_drivers%rowtype;
begin
 if auth.uid() is null then raise exception 'سجل الدخول أولاً';end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'أكد بريدك الإلكتروني قبل قبول الدعوة';end if;
 select * into d from store_drivers where invite_token=p_token for update;
 if not found or not d.active or d.email is distinct from lower(auth.jwt()->>'email') or (d.user_id is not null and d.user_id<>auth.uid()) then raise exception 'الدعوة غير متاحة لهذا الحساب. سجل الدخول بالبريد الذي أضافه صاحب المتجر';end if;
 if not exists(select 1 from stores where id=d.store_id and active and deleted_at is null) then raise exception 'المتجر غير متاح';end if;
 update store_drivers set user_id=auth.uid() where id=d.id;
 return d.id;
end $$;
create function public.my_driver_memberships() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'store_id',d.store_id,'name',d.name,'store_name',s.name,'active',d.active and s.active and s.deleted_at is null)),'[]'::jsonb)
 from store_drivers d join stores s on s.id=d.store_id where d.user_id=auth.uid();
$$;
-- Drivers receive only delivery details, never access to the merchant's order table.
create function public.my_driver_orders() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(x.payload order by x.created_at desc),'[]'::jsonb) from (
 select o.created_at,jsonb_build_object('id',o.id,'store_id',o.store_id,'store_name',s.name,'store_phone',s.contact_phone,'store_address',s.address,'customer_name',o.customer_name,'phone',o.phone,'address',o.address,'area',o.area,'notes',o.notes,'items',o.items,'total',o.total,'delivery_fee',o.delivery_fee,'latitude',o.latitude,'longitude',o.longitude,'status',o.status,'created_at',o.created_at) payload
 from orders o join store_drivers d on d.id=o.driver_id join stores s on s.id=o.store_id
 where d.user_id=auth.uid() and d.active and s.active and s.deleted_at is null and d.store_id=o.store_id and o.fulfillment_method='delivery'
 order by o.created_at desc limit 200) x;
$$;
create function public.assign_order_driver(p_order uuid,p_driver uuid,p_expected uuid default null) returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype;
begin
 select * into o from orders where id=p_order for update;
 if not found or auth.uid() is null or not manages_store(o.store_id) then raise exception 'غير مسموح';end if;
 if o.driver_id is distinct from p_expected then raise exception 'تغير المندوب. حدّث الطلب وأعد المحاولة';end if;
 if o.fulfillment_method<>'delivery' or o.status in ('تم التسليم','ملغي') then raise exception 'يمكن تعيين مندوب للطلبات الجارية التي تحتاج توصيلاً فقط';end if;
 if p_driver is not null and not exists(select 1 from store_drivers where id=p_driver and store_id=o.store_id and active and user_id is not null) then raise exception 'اختر مندوباً فعالاً قَبِل الدعوة وربط حسابه';end if;
 update orders set driver_id=p_driver where id=p_order;
end $$;
create function public.driver_set_order_status(p_order uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype;
begin
 select * into o from orders where id=p_order for update;
 if not found or auth.uid() is null or o.fulfillment_method<>'delivery' or not exists(select 1 from store_drivers d join stores s on s.id=d.store_id where d.id=o.driver_id and d.store_id=o.store_id and d.user_id=auth.uid() and d.active and s.active and s.deleted_at is null) then raise exception 'الطلب غير مخصص لك أو تم إيقاف حساب المندوب';end if;
 if not ((o.status='قيد التحضير' and p_status='في الطريق') or (o.status='في الطريق' and p_status='تم التسليم')) then raise exception 'ابدأ التوصيل بعد تجهيز الطلب، ثم أكد التسليم';end if;
 update orders set status=p_status where id=p_order;
end $$;
revoke all on function public.add_store_driver(uuid,text,text,text),public.set_store_driver_active(uuid,boolean),public.accept_driver_invite(uuid),public.my_driver_memberships(),public.my_driver_orders(),public.assign_order_driver(uuid,uuid,uuid),public.driver_set_order_status(uuid,text) from public,anon;
grant execute on function public.add_store_driver(uuid,text,text,text),public.set_store_driver_active(uuid,boolean),public.accept_driver_invite(uuid),public.my_driver_memberships(),public.my_driver_orders(),public.assign_order_driver(uuid,uuid,uuid),public.driver_set_order_status(uuid,text) to authenticated;
commit;
