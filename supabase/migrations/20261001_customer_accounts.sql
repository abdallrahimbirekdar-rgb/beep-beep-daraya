begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
alter table public.orders add column if not exists customer_id uuid references auth.users(id);
create index if not exists orders_customer_history on public.orders(customer_id,created_at desc,id);
create table if not exists public.customer_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=100),
 phone text not null default '' check(phone='' or phone ~ '^\+?[0-9 ()-]{7,20}$'),
 address text not null default '' check(length(address)<=400),
 area text not null default '' check(length(area)<=100)
);
alter table public.customer_profiles enable row level security;
create policy customer_profile_read on public.customer_profiles for select to authenticated using(user_id=auth.uid());
create policy customer_profile_insert on public.customer_profiles for insert to authenticated with check(user_id=auth.uid());
create policy customer_profile_update on public.customer_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.customer_profiles from public,anon,authenticated;
grant select,insert,update on public.customer_profiles to authenticated;
create table if not exists public.customer_favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.stores(id) on delete cascade,
 primary key(user_id,store_id)
);
alter table public.customer_favorites enable row level security;
create policy customer_favorites_read on public.customer_favorites for select to authenticated using(user_id=auth.uid());
create policy customer_favorites_insert on public.customer_favorites for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.stores where id=store_id and active));
create policy customer_favorites_delete on public.customer_favorites for delete to authenticated using(user_id=auth.uid());
revoke all on public.customer_favorites from public,anon,authenticated;
grant select,insert,delete on public.customer_favorites to authenticated;
-- The trigger covers every existing order API, including cached older clients.
create or replace function public.assign_order_customer() returns trigger language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'سجل الدخول لإنشاء طلب';end if;
 if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'أكد بريدك الإلكتروني أولاً';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if exists(select 1 from public.orders where customer_id=uid and created_at>now()-interval '30 seconds') then raise exception 'انتظر نصف دقيقة قبل إرسال طلب جديد';end if;
 new.customer_id:=uid;return new;
end;$$;
create trigger order_assign_customer before insert on public.orders for each row execute function public.assign_order_customer();
revoke all on function public.assign_order_customer() from public,anon,authenticated;
revoke execute on function public.place_order(uuid,text,text,text,text,text,jsonb) from public,anon;
revoke execute on function public.place_order_v2(uuid,text,text,text,text,text,jsonb,text) from public,anon;
revoke execute on function public.place_order_v3(uuid,text,text,text,text,text,jsonb,text,numeric,numeric) from public,anon;
grant execute on function public.place_order(uuid,text,text,text,text,text,jsonb),public.place_order_v2(uuid,text,text,text,text,text,jsonb,text),public.place_order_v3(uuid,text,text,text,text,text,jsonb,text,numeric,numeric) to authenticated;
-- Customers get only their order receipt. Merchant cost/commission data stays private.
create or replace function public.customer_order_receipt(o public.orders) returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('id',o.id,'store_id',o.store_id,'store_name',(select s.name from public.stores s where s.id=o.store_id),'status',o.status,'created_at',o.created_at,'method',o.fulfillment_method,'items',o.items,'subtotal',o.subtotal,'total',o.total,'delivery_fee',o.delivery_fee,'token',o.tracking_token,'customer_name',o.customer_name,'phone',o.phone,'address',o.address,'area',o.area,'notes',o.notes);
$$;
revoke all on function public.customer_order_receipt(public.orders) from public,anon,authenticated;
create or replace function public.my_order(p_id uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select public.customer_order_receipt(o) from public.orders o where o.id=p_id and o.customer_id=auth.uid();
$$;
create or replace function public.my_orders(p_limit integer default 20,p_offset integer default 0,p_status text default '',p_from date default null,p_to date default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare uid uuid:=auth.uid();result jsonb;count_orders bigint;completed_total bigint;completed_count bigint;start_at timestamptz;end_at timestamptz;
begin
 if uid is null then raise exception 'سجل الدخول لعرض طلباتك';end if;
 if p_limit is null or p_offset is null or p_limit not between 1 and 50 or p_offset not between 0 and 100000 or (p_from is not null and p_to is not null and p_from>p_to) then raise exception 'فترة غير صالحة';end if;
 start_at:=p_from::timestamp at time zone 'Asia/Damascus';end_at:=(p_to+1)::timestamp at time zone 'Asia/Damascus';
 select count(*),coalesce(sum(total) filter(where status='تم التسليم'),0),count(*) filter(where status='تم التسليم') into count_orders,completed_total,completed_count from public.orders where customer_id=uid and (coalesce(p_status,'')='' or status=p_status) and (start_at is null or created_at>=start_at) and (end_at is null or created_at<end_at);
 select coalesce(jsonb_agg(receipt order by created_at desc,id desc),'[]') into result from (select public.customer_order_receipt(o) receipt,o.created_at,o.id from public.orders o where customer_id=uid and (coalesce(p_status,'')='' or status=p_status) and (start_at is null or created_at>=start_at) and (end_at is null or created_at<end_at) order by created_at desc,id desc limit p_limit offset p_offset) t;
 return jsonb_build_object('orders',result,'count',count_orders,'completed_count',completed_count,'completed_total',completed_total);
end;$$;
revoke all on function public.my_order(uuid),public.my_orders(integer,integer,text,date,date) from public,anon;
grant execute on function public.my_order(uuid),public.my_orders(integer,integer,text,date,date) to authenticated;
create or replace function public.track_order(p_id uuid,p_token uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('id',o.id,'store_id',s.id,'store_name',s.name,'status',o.status,'created_at',o.created_at,'method',o.fulfillment_method,'items',o.items,'total',o.total,'delivery_fee',o.delivery_fee) from public.orders o join public.stores s on s.id=o.store_id where o.id=p_id and o.tracking_token=p_token and (o.customer_id=auth.uid() or o.customer_id is null);
$$;
commit;
