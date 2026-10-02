-- Run once in a NEW Supabase project dedicated to Beep Beep.
create table public.platform_admins (user_id uuid primary key references auth.users(id));
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from platform_admins where user_id=auth.uid()); $$;
create table public.stores (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100),
 category text not null check(category in ('restaurant','shop')), description text not null default '',
 owner_email text not null, image text not null default '', delivery_fee bigint not null default 0 check(delivery_fee between 0 and 100000000),
 minimum_order bigint not null default 0 check(minimum_order between 0 and 100000000), areas text[] not null default '{وسط داريا}',
 delivery_time text not null default '30–45 دقيقة', active boolean not null default true, is_open boolean not null default true,
 created_at timestamptz not null default now());
create table public.products (id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
 name text not null check(length(name) between 1 and 100), description text not null default '', price bigint not null check(price between 0 and 100000000), image text not null default '', available boolean not null default true);
create table public.orders (id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id),customer_name text not null,
 phone text not null,address text not null,area text not null,notes text not null default '',items jsonb not null,
 subtotal bigint not null,delivery_fee bigint not null,total bigint not null,status text not null default 'جديد' check(status in ('جديد','مقبول','قيد التحضير','في الطريق','تم التسليم','ملغي')),created_at timestamptz not null default now());
create index products_store_idx on public.products(store_id);
create index orders_store_created_idx on public.orders(store_id,created_at desc);
create index orders_phone_created_idx on public.orders(phone,created_at desc);
create or replace function public.manages_store(sid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_admin() or exists(select 1 from stores where id=sid and lower(owner_email)=lower(auth.jwt()->>'email')); $$;
alter table public.platform_admins enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
create policy admin_self on public.platform_admins for select to authenticated using(user_id=auth.uid());
create policy stores_read on public.stores for select using(active or public.manages_store(id));
create policy stores_add on public.stores for insert to authenticated with check(public.is_admin());
create policy stores_update on public.stores for update to authenticated using(public.manages_store(id)) with check(public.manages_store(id));
-- Merchants cannot reassign ownership or reactivate a suspended store.
create or replace function public.guard_store() returns trigger language plpgsql set search_path=public as $$ begin
 if auth.role() is not null and not public.is_admin() and (new.owner_email is distinct from old.owner_email or new.active is distinct from old.active) then raise exception 'ليس لديك صلاحية تغيير صاحب المحل أو تفعيل المحل'; end if;
 return new; end; $$;
create trigger guard_store before update on public.stores for each row execute function public.guard_store();
create policy products_read on public.products for select using(exists(select 1 from stores where stores.id=store_id and stores.active) or public.manages_store(store_id));
create policy products_add on public.products for insert to authenticated with check(public.manages_store(store_id));
create policy products_update on public.products for update to authenticated using(public.manages_store(store_id)) with check(public.manages_store(store_id));
create policy products_delete on public.products for delete to authenticated using(public.manages_store(store_id));
create policy orders_read on public.orders for select to authenticated using(public.manages_store(store_id));
-- All order writes go through validated functions; no direct client INSERT or UPDATE.
create or replace function public.place_order(p_store uuid,p_name text,p_phone text,p_address text,p_area text,p_notes text,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s stores%rowtype; p products%rowtype; it jsonb; q integer; subtotal bigint:=0; oid uuid; snapshot jsonb:='[]'; seen uuid[]:='{}';
begin
 select * into s from stores where id=p_store and active and is_open for share;
 if not found then raise exception 'المحل مغلق أو غير متاح'; end if;
 if length(trim(p_name)) not between 1 and 100 or length(p_address) not between 3 and 400 or length(p_notes)>400 or p_phone !~ '^\+?[0-9 ()-]{7,20}$' then raise exception 'تحقق من الاسم والهاتف والعنوان'; end if;
 if not (p_area=any(s.areas)) then raise exception 'هذه المنطقة خارج نطاق التوصيل'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 60 then raise exception 'السلة غير صالحة'; end if;
 perform pg_advisory_xact_lock(hashtext(p_phone));
 if exists(select 1 from orders where phone=p_phone and created_at>now()-interval '30 seconds') then raise exception 'انتظر نصف دقيقة قبل إرسال طلب جديد'; end if;
 for it in select * from jsonb_array_elements(p_items) loop
  q:=(it->>'quantity')::integer;
  if q is null or q not between 1 and 99 or (it->>'id')::uuid=any(seen) then raise exception 'كمية غير صالحة'; end if;
  select * into p from products where id=(it->>'id')::uuid and store_id=p_store and available for share;
  if not found then raise exception 'أحد المنتجات لم يعد متاحاً'; end if;
  seen:=array_append(seen,p.id);subtotal:=subtotal+p.price*q;
  snapshot:=snapshot||jsonb_build_array(jsonb_build_object('id',p.id,'name',p.name,'price',p.price,'quantity',q));
 end loop;
 if subtotal<s.minimum_order then raise exception 'لم تصل إلى الحد الأدنى للطلب: % ل.س',s.minimum_order; end if;
 insert into orders(store_id,customer_name,phone,address,area,notes,items,subtotal,delivery_fee,total) values(p_store,trim(p_name),p_phone,p_address,p_area,p_notes,snapshot,subtotal,s.delivery_fee,subtotal+s.delivery_fee) returning id into oid;
 return jsonb_build_object('id',oid,'total',subtotal+s.delivery_fee);
end; $$;
create or replace function public.set_order_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype; begin
 select * into o from orders where id=p_id for update;
 if not found or not public.manages_store(o.store_id) then raise exception 'غير مسموح'; end if;
 if not ((o.status='جديد' and p_status in ('مقبول','ملغي')) or (o.status='مقبول' and p_status in ('قيد التحضير','ملغي')) or (o.status='قيد التحضير' and p_status in ('في الطريق','ملغي')) or (o.status='في الطريق' and p_status='تم التسليم')) then raise exception 'تغيير حالة غير صالح'; end if;
 update orders set status=p_status where id=p_id;
end; $$;
revoke all on function public.place_order(uuid,text,text,text,text,text,jsonb) from public;
grant execute on function public.place_order(uuid,text,text,text,text,text,jsonb) to anon,authenticated;
revoke all on function public.set_order_status(uuid,text) from public,anon;
grant execute on function public.set_order_status(uuid,text) to authenticated;
grant select on public.stores,public.products to anon,authenticated;
grant select on public.orders,public.platform_admins to authenticated;
-- Edge Function needs explicit read grants when automatic table grants are disabled.
grant select on public.platform_admins,public.stores to service_role;
grant insert,update on public.stores to authenticated;
grant insert,update,delete on public.products to authenticated;
revoke insert,update,delete on public.orders from anon,authenticated;
revoke insert,update,delete on public.platform_admins from anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('store-images','store-images',true,1572864,array['image/jpeg','image/png','image/webp']);
create policy images_upload on storage.objects for insert to authenticated with check(bucket_id='store-images' and public.manages_store((storage.foldername(name))[1]::uuid));
create policy images_read on storage.objects for select using(bucket_id='store-images');
-- After creating YOUR user in Authentication > Users, run separately:
-- insert into public.platform_admins(user_id) select id from auth.users where email='YOUR_ADMIN_EMAIL';
-- Add merchant accounts using Authentication > Users > Add user. No secret admin API key belongs in browser code.

-- Run the migrations in supabase/migrations after this base setup.
