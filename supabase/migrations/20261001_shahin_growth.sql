begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
alter table public.stores add column if not exists translations jsonb not null default '{}';
alter table public.stores add column if not exists auto_hours boolean not null default false;
alter table public.stores add column if not exists commission_rate numeric(5,2) not null default 0 check(commission_rate between 0 and 100);
alter table public.stores add constraint stores_translations_valid check(jsonb_typeof(translations)='object' and octet_length(translations::text)<=20000);
alter table public.products add column if not exists cost_price bigint not null default 0 check(cost_price between 0 and 100000000);
alter table public.products add column if not exists translations jsonb not null default '{}';
alter table public.products add column if not exists section text not null default 'الوجبات' check(length(section) between 1 and 80);
alter table public.products add column if not exists gallery text[] not null default '{}' check(cardinality(gallery)<=5);
alter table public.products add column if not exists option_groups jsonb not null default '[]';
alter table public.products add constraint products_translations_valid check(jsonb_typeof(translations)='object' and octet_length(translations::text)<=20000);
create or replace function public.valid_product_options(gs jsonb) returns boolean language plpgsql immutable set search_path=public as $$
declare g jsonb; o jsonb; gids text[]:='{}'; oids text[];
begin
 if gs is null or jsonb_typeof(gs)<>'array' or jsonb_array_length(gs)>4 then return false;end if;
 for g in select * from jsonb_array_elements(gs) loop
  if jsonb_typeof(g)<>'object' or coalesce(g->>'id','')!~'^[a-zA-Z0-9_-]{1,50}$' or g->>'id'=any(gids) or length(coalesce(g->>'name','')) not between 1 and 80 or jsonb_typeof(g->'required') is distinct from 'boolean' or jsonb_typeof(g->'multiple') is distinct from 'boolean' or jsonb_typeof(g->'options') is distinct from 'array' then return false;end if;
  if jsonb_array_length(g->'options') not between 1 and 10 then return false;end if;
  gids:=array_append(gids,g->>'id');oids:='{}';
  for o in select * from jsonb_array_elements(g->'options') loop
   if jsonb_typeof(o)<>'object' or coalesce(o->>'id','')!~'^[a-zA-Z0-9_-]{1,50}$' or o->>'id'=any(oids) or length(coalesce(o->>'name','')) not between 1 and 80 or coalesce(o->>'price','')!~'^[0-9]{1,9}$' or (o->>'price')::bigint>100000000 then return false;end if;
   oids:=array_append(oids,o->>'id');
  end loop;
 end loop;return true;
exception when others then return false;
end;$$;
alter table public.products add constraint products_options_valid check(public.valid_product_options(option_groups));
alter table public.orders add column if not exists tracking_token uuid not null default gen_random_uuid();
alter table public.orders add column if not exists latitude numeric check(latitude between -90 and 90);
alter table public.orders add column if not exists longitude numeric check(longitude between -180 and 180);
alter table public.orders add column if not exists product_cost_total bigint not null default 0;
alter table public.orders add column if not exists commission_rate numeric(5,2) not null default 0;
alter table public.orders add column if not exists commission_amount bigint not null default 0;
alter table public.orders add constraint order_location_pair check((latitude is null)=(longitude is null));
create or replace function public.store_accepts_orders(s public.stores,at_time timestamptz default now()) returns boolean language plpgsql stable set search_path=public as $$
declare local_time timestamp:=at_time at time zone 'Asia/Damascus'; keys text[]:=array['sun','mon','tue','wed','thu','fri','sat']; day integer:=extract(dow from local_time)::integer; h jsonb; yesterday jsonb; clock time:=local_time::time;
begin
 if not s.active or not s.is_open then return false;end if;
 if not s.auto_hours then return true;end if;
 h:=s.opening_hours->keys[day+1];yesterday:=s.opening_hours->keys[((day+6)%7)+1];
 if h is not null and coalesce((h->>'closed')::boolean,true)=false then
  if (h->>'open')::time<(h->>'close')::time and clock>=(h->>'open')::time and clock<(h->>'close')::time then return true;end if;
  if (h->>'open')::time>(h->>'close')::time and clock>=(h->>'open')::time then return true;end if;
 end if;
 if yesterday is not null and coalesce((yesterday->>'closed')::boolean,true)=false and (yesterday->>'open')::time>(yesterday->>'close')::time and clock<(yesterday->>'close')::time then return true;end if;
 return false;
exception when others then return false;
end;$$;
create or replace function public.guard_store() returns trigger language plpgsql set search_path=public as $$ begin
 if auth.role() is not null and not public.is_admin() and (new.owner_email is distinct from old.owner_email or new.active is distinct from old.active or new.commission_rate is distinct from old.commission_rate) then raise exception 'ليس لديك صلاحية تغيير صاحب المحل أو التفعيل أو العمولة';end if;return new;end;$$;
create or replace function public.place_order_v3(p_store uuid,p_name text,p_phone text,p_address text,p_area text,p_notes text,p_items jsonb,p_method text,p_lat numeric default null,p_lng numeric default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s stores%rowtype; p products%rowtype; it jsonb; q integer; amount bigint:=0; oid uuid; token uuid; snapshot jsonb:='[]'; seen text[]:='{}'; fee bigint; selected jsonb; choice jsonb; g jsonb; opt jsonb; extra bigint; groups_count integer; sig text; names jsonb; chosen_ids text[]; commission bigint; product_cost bigint:=0;
begin
 select * into s from stores where id=p_store for share;
 if not found or not public.store_accepts_orders(s) then raise exception 'المحل مغلق أو غير متاح';end if;
 if p_name is null or p_phone is null or p_notes is null or length(trim(p_name)) not between 1 and 100 or length(p_notes)>400 or p_phone!~'^\+?[0-9 ()-]{7,20}$' then raise exception 'تحقق من الاسم والهاتف والعنوان';end if;
 if p_method is null or p_method not in ('delivery','pickup') then raise exception 'اختر طريقة استلام صالحة';end if;
 if (p_lat is null)<>(p_lng is null) or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'موقع غير صالح';end if;
 if p_method='delivery' then
  if not s.delivery_enabled then raise exception 'هذا المحل لا يوفر التوصيل';end if;
  if p_address is null or length(trim(p_address)) not between 3 and 400 then raise exception 'أدخل عنوان التوصيل';end if;
  if p_area is null or not(p_area=any(s.areas)) then raise exception 'هذه المنطقة خارج نطاق التوصيل';end if;fee:=s.delivery_fee;
 else
  if not s.pickup_enabled then raise exception 'الاستلام من المحل غير متاح';end if;
  p_address:='استلام من المحل';p_area:='استلام من المحل';fee:=0;p_lat:=null;p_lng:=null;
 end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 60 then raise exception 'السلة غير صالحة';end if;
 perform pg_advisory_xact_lock(hashtext(p_phone));
 if exists(select 1 from orders where phone=p_phone and created_at>now()-interval '30 seconds') then raise exception 'انتظر نصف دقيقة قبل إرسال طلب جديد';end if;
 for it in select * from jsonb_array_elements(p_items) loop
  q:=(it->>'quantity')::integer;if q is null or q not between 1 and 99 then raise exception 'كمية غير صالحة';end if;
  select * into p from products where id=(it->>'id')::uuid and store_id=p_store and available for share;
  if not found then raise exception 'أحد المنتجات لم يعد متاحاً';end if;
  selected:=coalesce(it->'options','[]');if jsonb_typeof(selected)<>'array' or jsonb_array_length(selected)>40 then raise exception 'خيارات غير صالحة';end if;
  extra:=0;names:='[]';chosen_ids:='{}';
  for choice in select * from jsonb_array_elements(selected) loop
   sig:=(choice->>'group')||':'||(choice->>'id');
   if sig is null or sig=any(chosen_ids) then raise exception 'خيار مكرر';end if;chosen_ids:=array_append(chosen_ids,sig);
   select value into g from jsonb_array_elements(p.option_groups) where value->>'id'=choice->>'group';
   if g is null then raise exception 'خيار غير متاح';end if;
   select value into opt from jsonb_array_elements(g->'options') where value->>'id'=choice->>'id';
   if opt is null then raise exception 'خيار غير متاح';end if;
   extra:=extra+(opt->>'price')::bigint;names:=names||jsonb_build_array(jsonb_build_object('group',g->>'name','name',opt->>'name','price',(opt->>'price')::bigint));
  end loop;
  for g in select * from jsonb_array_elements(p.option_groups) loop
   select count(*) into groups_count from jsonb_array_elements(selected) where value->>'group'=g->>'id';
   if ((g->>'required')::boolean and groups_count=0) or (not(g->>'multiple')::boolean and groups_count>1) then raise exception 'اختر خيارات الوجبة المطلوبة';end if;
  end loop;
  select coalesce(string_agg(x,',' order by x),'') into sig from unnest(chosen_ids) x;sig:=p.id::text||':'||sig;
  if sig=any(seen) then raise exception 'منتج مكرر بنفس الخيارات';end if;seen:=array_append(seen,sig);
  product_cost:=product_cost+p.cost_price*q;amount:=amount+(p.price+extra)*q;snapshot:=snapshot||jsonb_build_array(jsonb_build_object('id',p.id,'name',p.name,'price',p.price+extra,'quantity',q,'options',selected,'option_names',names));
 end loop;
 if amount<s.minimum_order then raise exception 'لم تصل إلى الحد الأدنى للطلب: % ل.س',s.minimum_order;end if;
 commission:=round(amount*s.commission_rate/100);
 insert into orders(store_id,customer_name,phone,address,area,notes,items,subtotal,delivery_fee,total,fulfillment_method,latitude,longitude,commission_rate,commission_amount,product_cost_total)
 values(p_store,trim(p_name),p_phone,p_address,p_area,p_notes,snapshot,amount,fee,amount+fee,p_method,p_lat,p_lng,s.commission_rate,commission,product_cost) returning id,tracking_token into oid,token;
 return jsonb_build_object('id',oid,'token',token,'total',amount+fee);
end;$$;
create or replace function public.place_order_v2(p_store uuid,p_name text,p_phone text,p_address text,p_area text,p_notes text,p_items jsonb,p_method text)
returns jsonb language sql security definer set search_path=public as $$ select public.place_order_v3(p_store,p_name,p_phone,p_address,p_area,p_notes,p_items,p_method);$$;
-- Customer capability link: no names, phone numbers, addresses, coordinates or token returned.
create or replace function public.track_order(p_id uuid,p_token uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('id',o.id,'store_id',s.id,'store_name',s.name,'status',o.status,'created_at',o.created_at,'method',o.fulfillment_method,'items',o.items,'total',o.total,'delivery_fee',o.delivery_fee) from orders o join stores s on s.id=o.store_id where o.id=p_id and o.tracking_token=p_token;
$$;
revoke all on function public.place_order_v3(uuid,text,text,text,text,text,jsonb,text,numeric,numeric) from public;
grant execute on function public.place_order_v3(uuid,text,text,text,text,text,jsonb,text,numeric,numeric) to anon,authenticated;
revoke all on function public.track_order(uuid,uuid) from public;
grant execute on function public.track_order(uuid,uuid) to anon,authenticated;
create table if not exists public.store_ledger (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
 entry_type text not null check(entry_type in ('expense','income')), amount bigint not null check(amount between 1 and 100000000000),
 category text not null check(length(category) between 1 and 80), note text not null default '' check(length(note)<=400),
 entry_date date not null default current_date, archived boolean not null default false, created_at timestamptz not null default now()
);
alter table public.store_ledger enable row level security;
create policy ledger_read on public.store_ledger for select to authenticated using(public.manages_store(store_id));
create policy ledger_add on public.store_ledger for insert to authenticated with check(public.manages_store(store_id));
create policy ledger_edit on public.store_ledger for update to authenticated using(public.manages_store(store_id)) with check(public.manages_store(store_id));
grant select,insert,update on public.store_ledger to authenticated;
revoke all on public.store_ledger from anon;
create index if not exists store_ledger_period on public.store_ledger(store_id,entry_date);
-- Keep costs, owner emails and commissions out of public catalog queries.
revoke select on public.products,public.stores from anon,authenticated;
grant select(id,store_id,name,description,price,image,available,translations,section,gallery,option_groups) on public.products to anon,authenticated;
grant select(id,name,category,description,image,delivery_fee,minimum_order,areas,delivery_time,active,is_open,created_at,address,contact_phone,delivery_enabled,pickup_enabled,opening_hours,translations,auto_hours) on public.stores to anon,authenticated;
create or replace function public.merchant_private_data() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('stores',coalesce((select jsonb_agg(jsonb_build_object('id',id,'owner_email',owner_email,'commission_rate',commission_rate)) from stores where public.manages_store(id)),'[]'::jsonb),'products',coalesce((select jsonb_agg(jsonb_build_object('id',id,'cost_price',cost_price)) from products where public.manages_store(store_id)),'[]'::jsonb));
$$;
revoke all on function public.merchant_private_data() from public,anon;
grant execute on function public.merchant_private_data() to authenticated;
commit;
