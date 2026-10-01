begin;
set local lock_timeout='5s';
alter table public.stores add column if not exists revision integer not null default 1;
alter table public.products add column if not exists revision integer not null default 1;
alter table public.products add column if not exists stock_tracking boolean not null default false;
alter table public.customer_profiles add column if not exists address_parts jsonb not null default '{}' check(jsonb_typeof(address_parts)='object' and length(address_parts::text)<=1200);
create or replace function public.bump_market_revision() returns trigger language plpgsql set search_path=public as $$ begin new.revision:=old.revision+1;return new;end;$$;
create trigger stores_revision before update on public.stores for each row execute function public.bump_market_revision();
create trigger products_revision before update on public.products for each row execute function public.bump_market_revision();
grant select(revision) on public.stores to anon,authenticated;
grant select(revision,stock_tracking) on public.products to anon,authenticated;
create table public.product_stock (
 product_id uuid references public.products(id) on delete cascade,
 variant_key text not null check(length(variant_key)<=500),
 options jsonb not null default '[]' check(jsonb_typeof(options)='array'),
 stock integer not null default 0 check(stock between 0 and 1000000000),
 revision integer not null default 1,
 primary key(product_id,variant_key)
);
alter table public.product_stock enable row level security;
create policy stock_read on public.product_stock for select to anon,authenticated using(exists(select 1 from public.products p join public.stores s on s.id=p.store_id where p.id=product_id and (s.active or public.manages_store(s.id))));
revoke all on public.product_stock from public,anon,authenticated;
grant select on public.product_stock to anon,authenticated;
create trigger stock_revision before update on public.product_stock for each row execute function public.bump_market_revision();
create table public.order_stock_reservations (
 order_id uuid references public.orders(id) on delete cascade,
 product_id uuid not null,
 variant_key text not null,
 quantity integer not null check(quantity>0),
 released boolean not null default false,
 primary key(order_id,product_id,variant_key)
);
alter table public.order_stock_reservations enable row level security;
revoke all on public.order_stock_reservations from public,anon,authenticated;
create or replace function public.stock_key(p_options jsonb) returns text language sql immutable set search_path=public as $$
 select coalesce(string_agg((x->>'group')||':'||(x->>'id'),'|' order by x->>'group',x->>'id'),'') from jsonb_array_elements(p_options) x;
$$;
create or replace function public.reserve_market_stock() returns trigger language plpgsql security definer set search_path=public as $$
declare item jsonb;k text;remaining integer;
begin
 for item in select value from jsonb_array_elements(new.items) order by value->>'id',public.stock_key(coalesce(value->'options','[]')) loop
  if exists(select 1 from products where id=(item->>'id')::uuid and stock_tracking) then
   k:=public.stock_key(coalesce(item->'options','[]'));
   update product_stock set stock=stock-(item->>'quantity')::integer where product_id=(item->>'id')::uuid and variant_key=k and stock>=(item->>'quantity')::integer returning stock into remaining;
   if not found then raise exception 'الكمية أو المقاس المختار لم يعد متوفراً. عدّل السلة وحاول مجدداً.';end if;
   insert into order_stock_reservations(order_id,product_id,variant_key,quantity) values(new.id,(item->>'id')::uuid,k,(item->>'quantity')::integer);
  end if;
 end loop;return new;
end;$$;
create trigger market_stock_reserve after insert on public.orders for each row execute function public.reserve_market_stock();
create or replace function public.release_market_stock() returns trigger language plpgsql security definer set search_path=public as $$
declare r record;
begin
 if new.status='ملغي' and old.status<>'ملغي' then
  for r in select * from order_stock_reservations where order_id=new.id and not released order by product_id,variant_key for update loop
   update product_stock set stock=stock+r.quantity where product_id=r.product_id and variant_key=r.variant_key;
   update order_stock_reservations set released=true where order_id=r.order_id and product_id=r.product_id and variant_key=r.variant_key;
  end loop;
 end if;return new;
end;$$;
create trigger market_stock_release after update of status on public.orders for each row execute function public.release_market_stock();
revoke all on function public.reserve_market_stock(),public.release_market_stock(),public.bump_market_revision() from public,anon,authenticated;
-- One transaction for product details and every size/color quantity. Expected revisions
-- prevent an editor from replacing stock reduced by an order since opening the form.
create or replace function public.save_market_product(p_data jsonb,p_revision integer,p_stock jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare pid uuid:=(p_data->>'id')::uuid;sid uuid:=(p_data->>'store_id')::uuid;oldp products%rowtype;r jsonb;v jsonb;g jsonb;opt jsonb;k text;keys text[]:='{}';expected integer;cnt integer;
begin
 if not public.manages_store(sid) then raise exception 'لا تملك صلاحية تعديل هذا المحل';end if;
 select * into oldp from products where id=pid for update;
 if found then
  if oldp.store_id<>sid or oldp.revision<>coalesce(p_revision,-1) then raise exception 'تغيّرت البيانات منذ فتح الصفحة. انسخ تعديلاتك ثم حدّث البيانات وأعد المحاولة.';end if;
 elsif coalesce(p_revision,-1)<>0 then raise exception 'المنتج لم يعد موجوداً';end if;
 if not public.valid_product_options(coalesce(p_data->'option_groups','[]')) then raise exception 'تحقق من خيارات المنتج';end if;
 if coalesce((p_data->>'stock_tracking')::boolean,false) then
  if jsonb_typeof(p_stock)<>'array' or jsonb_array_length(p_stock) not between 1 and 150 then raise exception 'أضف كميات المخزون لكل مقاس ولون (150 تركيبة كحد أقصى)';end if;
  if exists(select 1 from jsonb_array_elements(p_data->'option_groups') x where not coalesce((x->>'required')::boolean,false) or coalesce((x->>'multiple')::boolean,false)) then raise exception 'لتتبع المخزون اجعل المقاس واللون خيارات إلزامية واختياراً واحداً';end if;
  for r in select value from jsonb_array_elements(p_stock) order by public.stock_key(value->'options') loop
   if (r->>'stock')::integer not between 0 and 1000000 then raise exception 'أدخل كمية صحيحة للمخزون';end if;
   v:=r->'options';if jsonb_typeof(v)<>'array' then raise exception 'تركيبة مخزون غير صالحة';end if;
   if jsonb_array_length(v)<>jsonb_array_length(p_data->'option_groups') then raise exception 'أعد إنشاء جدول المخزون بعد تعديل الخيارات';end if;
   for g in select * from jsonb_array_elements(p_data->'option_groups') loop
    select count(*) into cnt from jsonb_array_elements(v) x where x->>'group'=g->>'id';
    if cnt<>1 then raise exception 'تركيبة مخزون غير صالحة';end if;
    select x into opt from jsonb_array_elements(v) x where x->>'group'=g->>'id';
    if not exists(select 1 from jsonb_array_elements(g->'options') x where x->>'id'=opt->>'id') then raise exception 'خيار مخزون غير صالح';end if;
   end loop;
   k:=public.stock_key(v);if k=any(keys) then raise exception 'تركيبة مخزون مكررة';end if;keys:=array_append(keys,k);
   select revision into expected from product_stock where product_id=pid and variant_key=k for update;
   if found and expected<>coalesce((r->>'revision')::integer,-1) or not found and coalesce((r->>'revision')::integer,0)<>0 then raise exception 'تغيّر المخزون أثناء التعديل. انسخ بياناتك وحدّث الصفحة قبل الحفظ.';end if;
  end loop;
 end if;
 insert into products(id,store_id,name,description,price,cost_price,image,available,section,gallery,option_groups,translations,stock_tracking)
 values(pid,sid,p_data->>'name',p_data->>'description',(p_data->>'price')::bigint,(p_data->>'cost_price')::bigint,p_data->>'image',(p_data->>'available')::boolean,p_data->>'section',array(select jsonb_array_elements_text(p_data->'gallery')),p_data->'option_groups',p_data->'translations',coalesce((p_data->>'stock_tracking')::boolean,false))
 on conflict(id) do update set name=excluded.name,description=excluded.description,price=excluded.price,cost_price=excluded.cost_price,image=excluded.image,available=excluded.available,section=excluded.section,gallery=excluded.gallery,option_groups=excluded.option_groups,translations=excluded.translations,stock_tracking=excluded.stock_tracking;
 if coalesce((p_data->>'stock_tracking')::boolean,false) then
  for r in select value from jsonb_array_elements(p_stock) order by public.stock_key(value->'options') loop
   insert into product_stock(product_id,variant_key,options,stock) values(pid,public.stock_key(r->'options'),r->'options',(r->>'stock')::integer)
   on conflict(product_id,variant_key) do update set options=excluded.options,stock=excluded.stock;
  end loop;
  -- Keep historical rows so cancellation can restore its original variant;
  -- obsolete combinations cannot be selected because product options are validated.
 end if;
 return pid;
end;$$;
revoke all on function public.save_market_product(jsonb,integer,jsonb) from public,anon;
grant execute on function public.save_market_product(jsonb,integer,jsonb) to authenticated;
create table public.market_order_requests (
 user_id uuid references auth.users(id) on delete cascade,
 request_id uuid not null,
 payload_hash text not null,
 response jsonb not null,
 primary key(user_id,request_id)
);
alter table public.market_order_requests enable row level security;
revoke all on public.market_order_requests from public,anon,authenticated;
create or replace function public.place_order_v4(p_request uuid,p_store uuid,p_name text,p_phone text,p_address text,p_area text,p_notes text,p_items jsonb,p_method text,p_lat numeric default null,p_lng numeric default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();data jsonb;cached market_order_requests%rowtype;answer jsonb;
begin
 if uid is null or p_request is null then raise exception 'سجل الدخول لإنشاء طلب';end if;
 data:=jsonb_build_object('store',p_store,'name',p_name,'phone',p_phone,'address',p_address,'area',p_area,'notes',p_notes,'items',p_items,'method',p_method,'lat',p_lat,'lng',p_lng);
 perform pg_advisory_xact_lock(hashtext('request:'||uid::text));
 select * into cached from market_order_requests where user_id=uid and request_id=p_request;
 if found then
  if cached.payload_hash<>encode(sha256(convert_to(data::text,'UTF8')),'hex') then raise exception 'تغيّرت بيانات محاولة الطلب. تحقق من سجل مشترياتك أولاً.';end if;
  return cached.response;
 end if;
 answer:=public.place_order_v3(p_store,p_name,p_phone,p_address,p_area,p_notes,p_items,p_method,p_lat,p_lng);
 insert into market_order_requests values(uid,p_request,encode(sha256(convert_to(data::text,'UTF8')),'hex'),answer);return answer;
end;$$;
revoke all on function public.place_order_v4(uuid,uuid,text,text,text,text,text,jsonb,text,numeric,numeric) from public,anon;
grant execute on function public.place_order_v4(uuid,uuid,text,text,text,text,text,jsonb,text,numeric,numeric) to authenticated;
create or replace function public.market_attempt(p_request uuid) returns jsonb language sql stable security definer set search_path=public as $$ select response from market_order_requests where user_id=auth.uid() and request_id=p_request;$$;
revoke all on function public.market_attempt(uuid) from public,anon;
grant execute on function public.market_attempt(uuid) to authenticated;
create table public.customer_data_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in('correction','deletion')),
 note text not null default '' check(length(note)<=400),
 status text not null default 'pending' check(status in('pending','reviewed')),
 created_at timestamptz not null default now()
);
create unique index customer_one_pending_request on public.customer_data_requests(user_id) where status='pending';
alter table public.customer_data_requests enable row level security;
create policy data_request_read on public.customer_data_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy data_request_insert on public.customer_data_requests for insert to authenticated with check(user_id=auth.uid() and status='pending');
create policy data_request_admin_update on public.customer_data_requests for update to authenticated using(public.is_admin()) with check(public.is_admin());
revoke all on public.customer_data_requests from public,anon,authenticated;
grant select,insert on public.customer_data_requests to authenticated;
grant update(status) on public.customer_data_requests to authenticated;
commit;
