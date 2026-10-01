begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
-- Merchant page setup and collection/delivery options. Safe for existing stores.
alter table public.stores add column if not exists address text not null default '';
alter table public.stores add column if not exists contact_phone text not null default '';
alter table public.stores add column if not exists delivery_enabled boolean not null default true;
alter table public.stores add column if not exists pickup_enabled boolean not null default false;
alter table public.stores add column if not exists opening_hours jsonb not null default '{}';
alter table public.stores add constraint store_address_length check(length(address)<=400);
alter table public.stores add constraint store_phone_length check(length(contact_phone)<=30);
alter table public.stores add constraint store_fulfillment check(delivery_enabled or pickup_enabled);
alter table public.stores add constraint store_hours_object check(jsonb_typeof(opening_hours)='object');
alter table public.orders add column if not exists fulfillment_method text not null default 'delivery' check(fulfillment_method in ('delivery','pickup'));
create or replace function public.place_order_v2(p_store uuid,p_name text,p_phone text,p_address text,p_area text,p_notes text,p_items jsonb,p_method text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s stores%rowtype; p products%rowtype; it jsonb; q integer; subtotal bigint:=0; oid uuid; snapshot jsonb:='[]'; seen uuid[]:='{}'; fee bigint;
begin
 select * into s from stores where id=p_store and active and is_open for share;
 if not found then raise exception 'المحل مغلق أو غير متاح'; end if;
 if p_name is null or p_phone is null or p_notes is null or length(trim(p_name)) not between 1 and 100 or length(p_notes)>400 or p_phone !~ '^\+?[0-9 ()-]{7,20}$' then raise exception 'تحقق من الاسم والهاتف والعنوان'; end if;
 if p_method is null or p_method not in ('delivery','pickup') then raise exception 'اختر طريقة استلام صالحة'; end if;
 if p_method='delivery' then
  if not s.delivery_enabled then raise exception 'هذا المحل لا يوفر التوصيل'; end if;
  if p_address is null or length(trim(p_address)) not between 3 and 400 then raise exception 'أدخل عنوان التوصيل'; end if;
  if p_area is null or not (p_area=any(s.areas)) then raise exception 'هذه المنطقة خارج نطاق التوصيل'; end if;
  fee:=s.delivery_fee;
 else
  if not s.pickup_enabled then raise exception 'الاستلام من المحل غير متاح'; end if;
  p_address:='استلام من المحل'; p_area:='استلام من المحل'; fee:=0;
 end if;
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
 insert into orders(store_id,customer_name,phone,address,area,notes,items,subtotal,delivery_fee,total,fulfillment_method) values(p_store,trim(p_name),p_phone,p_address,p_area,p_notes,snapshot,subtotal,fee,subtotal+fee,p_method) returning id into oid;
 return jsonb_build_object('id',oid,'total',subtotal+fee);
end; $$;
create or replace function public.set_order_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype; begin
 select * into o from orders where id=p_id for update;
 if not found or not public.manages_store(o.store_id) then raise exception 'غير مسموح'; end if;
 if not ((o.status='جديد' and p_status in ('مقبول','ملغي')) or (o.status='مقبول' and p_status in ('قيد التحضير','ملغي')) or (o.status='قيد التحضير' and (p_status='ملغي' or (o.fulfillment_method='pickup' and p_status='تم التسليم') or (o.fulfillment_method='delivery' and p_status='في الطريق'))) or (o.status='في الطريق' and p_status='تم التسليم')) then raise exception 'تغيير حالة غير صالح'; end if;
 update orders set status=p_status where id=p_id;
end; $$;
revoke all on function public.place_order_v2(uuid,text,text,text,text,text,jsonb,text) from public;
grant execute on function public.place_order_v2(uuid,text,text,text,text,text,jsonb,text) to anon,authenticated;

-- Keep the existing seven-argument API working; cached clients use delivery.
create or replace function public.place_order(p_store uuid,p_name text,p_phone text,p_address text,p_area text,p_notes text,p_items jsonb)
returns jsonb language sql security definer set search_path=public as $$
 select public.place_order_v2(p_store,p_name,p_phone,p_address,p_area,p_notes,p_items,'delivery');
$$;

commit;
