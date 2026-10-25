-- Table QR capabilities and guest receipts are private. No table grants to clients.
create schema if not exists table_service_private;
revoke all on schema table_service_private from public;
grant usage on schema table_service_private to anon, authenticated;
create table if not exists table_service_private.settings (
 store_id uuid primary key references public.stores(id) on delete cascade,
 enabled boolean not null default false
);
create table if not exists table_service_private.tables (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 number integer not null check(number between 1 and 500),
 token uuid not null unique default gen_random_uuid(),
 active boolean not null default true,
 unique(store_id,number)
);
create table if not exists table_service_private.orders (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 table_id uuid not null references table_service_private.tables(id),
 table_number integer not null,
 request_id uuid not null unique,
 client_token uuid not null,
 receipt_token uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 status text not null default 'new' check(status in ('new','preparing','ready','served','cancelled')),
 notes text not null default '' check(length(notes)<=400),
 items jsonb not null check(jsonb_typeof(items)='array'),
 total bigint not null check(total between 0 and 100000000),
 reservations jsonb not null default '[]'::jsonb
);
create index if not exists table_service_active_orders on table_service_private.orders(store_id,created_at)
 where status in ('new','preparing','ready');
create index if not exists table_service_history on table_service_private.orders(store_id,created_at desc);
create index if not exists table_service_rate on table_service_private.orders(table_id,created_at desc);
create index if not exists table_service_client_rate on table_service_private.orders(client_token,created_at desc);
alter table table_service_private.settings enable row level security;
alter table table_service_private.tables enable row level security;
alter table table_service_private.orders enable row level security;
revoke all on all tables in schema table_service_private from public,anon,authenticated;

create or replace function table_service_private.eligible(s public.stores) returns boolean
language sql immutable set search_path='' as $$
 select s.category='restaurant' and not s.is_example and s.deleted_at is null
 and coalesce(s.translations->'_directory'->>'kind','restaurant')='restaurant';
$$;

create or replace function table_service_private.menu(p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t table_service_private.tables%rowtype; s public.stores%rowtype;
begin
 select * into t from table_service_private.tables where token=p_token and active;
 if not found then raise exception 'رمز الطاولة غير متاح. اطلب الرمز الصحيح من العامل.';end if;
 select * into s from public.stores where id=t.store_id and active;
 if not found or not table_service_private.eligible(s) or not coalesce((select enabled from table_service_private.settings where store_id=s.id),false)
 then raise exception 'طلبات الطاولات غير مفعّلة في هذا المكان حاليًا.';end if;
 return jsonb_build_object('table_number',t.number,'store',jsonb_build_object('id',s.id,'name',s.name,'image',s.image),
 'accepting',true,
 'products',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'price',p.price,'image',p.image,'section',p.section,'option_groups',p.option_groups) order by p.section,p.name,p.id)
 from public.products p where p.store_id=s.id and p.available),'[]'::jsonb));
end;$$;

create or replace function table_service_private.place(p_token uuid,p_request uuid,p_client uuid,p_items jsonb,p_notes text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t table_service_private.tables%rowtype;s public.stores%rowtype;p public.products%rowtype;
 old_order table_service_private.orders%rowtype;it jsonb;selected jsonb;c jsonb;g jsonb;opt jsonb;
 q integer;n integer;extra bigint;amount bigint:=0;snapshot jsonb:='[]';reserved jsonb:='[]';names jsonb;ids text[];seen text[]:='{}';sig text;k text;oid uuid;receipt uuid;
begin
 if p_token is null or p_request is null or p_client is null then raise exception 'أعد فتح رمز الطاولة.';end if;
 select * into t from table_service_private.tables where token=p_token and active for update;
 if not found then raise exception 'رمز الطاولة غير متاح.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_client::text,1703));
 select * into old_order from table_service_private.orders where request_id=p_request;
 if found then
  if old_order.table_id<>t.id or old_order.client_token<>p_client then raise exception 'معرّف طلب غير صالح';end if;
  return jsonb_build_object('id',old_order.id,'token',old_order.receipt_token,'total',old_order.total);
 end if;
 perform 1 from table_service_private.settings where store_id=t.store_id and enabled for share;
 if not found then raise exception 'طلبات الطاولات متوقفة حاليًا.';end if;
 select * into s from public.stores where id=t.store_id and active for share;
 if not found or not table_service_private.eligible(s) then raise exception 'استقبال طلبات الطاولات متوقف حاليًا.';end if;
 if p_notes is null or length(p_notes)>400 then raise exception 'الملاحظات أطول من المسموح.';end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 40 then raise exception 'اختر الأصناف المطلوبة أولًا.';end if;
 if exists(select 1 from table_service_private.orders where client_token=p_client and created_at>now()-interval '15 seconds')
 or (select count(*) from table_service_private.orders where table_id=t.id and created_at>now()-interval '1 minute')>=15
 or (select count(*) from table_service_private.orders where table_id=t.id and created_at>now()-interval '1 hour')>=150
 then raise exception 'طلبات متقاربة جدًا. انتظر قليلًا ثم حاول مجددًا.';end if;
 -- Serialize the capacity guard across all tables in one restaurant.
 perform pg_advisory_xact_lock(hashtextextended(t.store_id::text,1704));
 if (select count(*) from table_service_private.orders where store_id=s.id and status in ('new','preparing','ready'))>=500
 then raise exception 'المكان يستقبل طلبات كثيرة حاليًا، تواصل مع العامل.';end if;
 for it in select value from jsonb_array_elements(p_items) order by value->>'id',public.stock_key(coalesce(value->'options','[]')) loop
  if coalesce(it->>'quantity','')!~'^[0-9]{1,2}$' then raise exception 'كمية غير صالحة';end if;
  q:=(it->>'quantity')::integer;if q not between 1 and 20 then raise exception 'الكمية من 1 إلى 20 لكل صنف.';end if;
  select * into p from public.products where id=(it->>'id')::uuid and store_id=s.id and available for share;
  if not found then raise exception 'أحد الأصناف لم يعد متاحًا. حدّث القائمة.';end if;
  selected:=coalesce(it->'options','[]');
  if jsonb_typeof(selected)<>'array' or jsonb_array_length(selected)>40 then raise exception 'خيارات غير صالحة';end if;
  extra:=0;names:='[]';ids:='{}';
  for c in select value from jsonb_array_elements(selected) loop
   sig:=(c->>'group')||':'||(c->>'id');
   if sig is null or sig=any(ids) then raise exception 'خيار مكرر أو غير صالح';end if;ids:=array_append(ids,sig);
   select value into g from jsonb_array_elements(p.option_groups) where value->>'id'=c->>'group';
   if g is null then raise exception 'خيار غير متاح';end if;
   select value into opt from jsonb_array_elements(g->'options') where value->>'id'=c->>'id';
   if opt is null then raise exception 'خيار غير متاح';end if;
   extra:=extra+(opt->>'price')::bigint;
   names:=names||jsonb_build_array(jsonb_build_object('group',g->>'name','name',opt->>'name','price',(opt->>'price')::bigint));
  end loop;
  for g in select value from jsonb_array_elements(p.option_groups) loop
   select count(*) into n from jsonb_array_elements(selected) where value->>'group'=g->>'id';
   if (coalesce((g->>'required')::boolean,false) and n=0) or (not coalesce((g->>'multiple')::boolean,false) and n>1) then raise exception 'اختر خيارات الصنف المطلوبة.';end if;
  end loop;
  k:=public.stock_key(selected);sig:=p.id::text||':'||k;
  if sig=any(seen) then raise exception 'صنف مكرر بنفس الخيارات';end if;seen:=array_append(seen,sig);
  if p.stock_tracking then
   update public.product_stock set stock=stock-q where product_id=p.id and variant_key=k and stock>=q;
   if not found then raise exception 'الكمية المطلوبة لم تعد متوفرة. عدّل طلبك.';end if;
   reserved:=reserved||jsonb_build_array(jsonb_build_object('product_id',p.id,'variant_key',k,'quantity',q));
  end if;
  amount:=amount+(p.price+extra)*q;
  if amount not between 0 and 100000000 then raise exception 'قيمة الطلب خارج الحد المسموح.';end if;
  snapshot:=snapshot||jsonb_build_array(jsonb_build_object('id',p.id,'name',p.name,'price',p.price+extra,'quantity',q,'options',selected,'option_names',names));
 end loop;
 insert into table_service_private.orders(store_id,table_id,table_number,request_id,client_token,notes,items,total,reservations)
 values(s.id,t.id,t.number,p_request,p_client,trim(p_notes),snapshot,amount,reserved) returning id,receipt_token into oid,receipt;
 return jsonb_build_object('id',oid,'token',receipt,'total',amount);
end;$$;

create or replace function table_service_private.receipt(p_id uuid,p_token uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',o.id,'store_id',o.store_id,'store_name',s.name,'table_number',o.table_number,'created_at',o.created_at,'status',o.status,'items',o.items,'notes',o.notes,'total',o.total)
 from table_service_private.orders o join public.stores s on s.id=o.store_id where o.id=p_id and o.receipt_token=p_token;
$$;

create or replace function table_service_private.owner(p_store uuid,p_action text,p_table uuid,p_number integer,p_enabled boolean,p_order uuid,p_status text,p_expected text,p_page integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.stores%rowtype;o table_service_private.orders%rowtype;r jsonb;enabled_now boolean;history_count integer;
begin
 if auth.uid() is null or not public.manages_store(p_store) then raise exception 'هذا القسم متاح لصاحب المكان فقط.' using errcode='42501';end if;
 select * into s from public.stores where id=p_store;
 if not found then raise exception 'المكان غير متاح';end if;
 if p_action='settings' then
  if p_enabled is null or (p_enabled and not table_service_private.eligible(s)) then raise exception 'الميزة مخصصة للمطاعم والمقاهي الحقيقية.';end if;
  insert into table_service_private.settings(store_id,enabled) values(s.id,p_enabled) on conflict(store_id) do update set enabled=excluded.enabled;
 elsif p_action in ('create','bulk') then
  if not table_service_private.eligible(s) then raise exception 'الميزة مخصصة للمطاعم والمقاهي.';end if;
  perform pg_advisory_xact_lock(hashtextextended(s.id::text,1705));
  if p_number is null or p_number not between 1 and (case when p_action='bulk' then 100 else 500 end) then raise exception 'رقم الطاولة غير صالح';end if;
  if p_action='bulk' then
   insert into table_service_private.tables(store_id,number) select s.id,n from generate_series(1,p_number) n on conflict(store_id,number) do nothing;
  else
   insert into table_service_private.tables(store_id,number) values(s.id,p_number) on conflict(store_id,number) do nothing;
  end if;
  if (select count(*) from table_service_private.tables where store_id=s.id)>200 then raise exception 'الحد الأقصى 200 طاولة.';end if;
 elsif p_action='table_state' then
  if p_enabled is null then raise exception 'اختر حالة الطاولة';end if;
  update table_service_private.tables set active=p_enabled where id=p_table and store_id=s.id;
  if not found then raise exception 'الطاولة غير متاحة';end if;
 elsif p_action='rotate' then
  update table_service_private.tables set token=gen_random_uuid() where id=p_table and store_id=s.id;
  if not found then raise exception 'الطاولة غير متاحة';end if;
 elsif p_action='status' then
  select * into o from table_service_private.orders where id=p_order and store_id=s.id for update;
  if not found then raise exception 'الطلب غير متاح';end if;
  if o.status is distinct from p_expected then raise exception 'تغيرت حالة الطلب، حدّث الشاشة.';end if;
  if not ((o.status='new' and p_status in ('preparing','cancelled')) or (o.status='preparing' and p_status in ('ready','cancelled')) or (o.status='ready' and p_status in ('served','cancelled')))
  then raise exception 'انتقال حالة غير صالح';end if;
  if p_status='cancelled' then
   for r in select value from jsonb_array_elements(o.reservations) order by value->>'product_id',value->>'variant_key' loop
    update public.product_stock set stock=stock+(r->>'quantity')::integer where product_id=(r->>'product_id')::uuid and variant_key=r->>'variant_key';
   end loop;
  end if;
  update table_service_private.orders set status=p_status,updated_at=now() where id=o.id;
 elsif p_action<>'read' or p_action is null then raise exception 'إجراء غير صالح';
 end if;
 if p_page is null or p_page not between 0 and 10000 then raise exception 'صفحة غير صالحة';end if;
 select count(*) into history_count from table_service_private.orders where store_id=s.id and status in ('served','cancelled');
 enabled_now:=coalesce((select enabled from table_service_private.settings where store_id=s.id),false);
 return jsonb_build_object('store',jsonb_build_object('id',s.id,'name',s.name),'enabled',enabled_now,
 'tables',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'number',t.number,'token',t.token,'active',t.active) order by t.number) from table_service_private.tables t where t.store_id=s.id),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'table_number',x.table_number,'created_at',x.created_at,'status',x.status,'notes',x.notes,'items',x.items,'total',x.total) order by x.created_at) from table_service_private.orders x where x.store_id=s.id and x.status in ('new','preparing','ready')),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,table_number,created_at,status,notes,items,total from table_service_private.orders where store_id=s.id and status in ('served','cancelled') order by created_at desc,id desc limit 50 offset p_page*50) x),'[]'::jsonb),
 'history_total',history_count,'page',p_page);
end;$$;

-- Invoker wrappers are the only Data API endpoints; privileged implementations
-- live in a non-exposed schema with explicit owner checks or QR capabilities.
create or replace function public.table_service_menu(p_token uuid) returns jsonb language sql security invoker set search_path='' as $$ select table_service_private.menu(p_token); $$;
create or replace function public.table_service_place(p_token uuid,p_request uuid,p_client uuid,p_items jsonb,p_notes text default '') returns jsonb language sql security invoker set search_path='' as $$ select table_service_private.place(p_token,p_request,p_client,p_items,p_notes); $$;
create or replace function public.table_service_receipt(p_id uuid,p_token uuid) returns jsonb language sql security invoker set search_path='' as $$ select table_service_private.receipt(p_id,p_token); $$;
create or replace function public.table_service_owner(p_store uuid,p_action text default 'read',p_table uuid default null,p_number integer default null,p_enabled boolean default null,p_order uuid default null,p_status text default null,p_expected text default null,p_page integer default 0) returns jsonb language sql security invoker set search_path='' as $$ select table_service_private.owner(p_store,p_action,p_table,p_number,p_enabled,p_order,p_status,p_expected,p_page); $$;
revoke all on all functions in schema table_service_private from public,anon,authenticated;
revoke all on function public.table_service_menu(uuid),public.table_service_place(uuid,uuid,uuid,jsonb,text),public.table_service_receipt(uuid,uuid),public.table_service_owner(uuid,text,uuid,integer,boolean,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function table_service_private.menu(uuid),table_service_private.place(uuid,uuid,uuid,jsonb,text),table_service_private.receipt(uuid,uuid),public.table_service_menu(uuid),public.table_service_place(uuid,uuid,uuid,jsonb,text),public.table_service_receipt(uuid,uuid) to anon,authenticated;
grant execute on function table_service_private.owner(uuid,text,uuid,integer,boolean,uuid,text,text,integer),public.table_service_owner(uuid,text,uuid,integer,boolean,uuid,text,text,integer) to authenticated;
notify pgrst,'reload schema';
