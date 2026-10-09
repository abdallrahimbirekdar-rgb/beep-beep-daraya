begin;
create table if not exists public.merchant_interest_events(
 store_id uuid not null references public.stores(id),
 session_id uuid not null,
 kind text not null check(kind in ('product_view','cart_add','photo_open','directions')),
 item text not null default '' check(length(item)<=40),
 event_day date not null default (now() at time zone 'Asia/Damascus')::date,
 created_at timestamptz not null default now(),
 primary key(store_id,event_day,session_id,kind,item)
);
alter table public.merchant_interest_events enable row level security;
revoke all on public.merchant_interest_events from public,anon,authenticated;
create index if not exists merchant_interest_period on public.merchant_interest_events(store_id,created_at);
create or replace function public.record_merchant_interest(p_store uuid,p_session uuid,p_kind text,p_item text default '')
returns void language plpgsql security definer set search_path=public as $$
begin
 if p_session is null or p_kind is null or p_kind not in ('product_view','cart_add','photo_open','directions') or p_item is null or length(p_item)>40 then return; end if;
 if not exists(select 1 from stores where id=p_store and active and deleted_at is null) then return;end if;
 if public.is_admin() or (auth.uid() is not null and public.manages_store(p_store)) then return;end if;
 if p_kind in ('product_view','cart_add') or (p_kind='photo_open' and p_item<>'cover') then
  if not exists(select 1 from products where store_id=p_store and id::text=p_item and available) then return;end if;
 end if;
 if p_kind='directions' and p_item<>'' then return;end if;
 insert into merchant_interest_events(store_id,session_id,kind,item) values(p_store,p_session,p_kind,p_item) on conflict do nothing;
end;$$;
create or replace function public.merchant_insights(p_store uuid,p_days integer default 30)
returns jsonb language plpgsql security definer set search_path=public as $$
declare d integer; start_at timestamptz; prev_at timestamptz; result jsonb;
begin
 if auth.uid() is null or not public.manages_store(p_store) then raise exception 'Provider access required';end if;
 d=case when p_days=7 then 7 else 30 end; start_at=now()-make_interval(days=>d); prev_at=now()-make_interval(days=>2*d);
 select jsonb_build_object(
 'days',d,
 'current',(select jsonb_build_object('view',count(*) filter(where kind='view'),'call',count(*) filter(where kind='call'),'whatsapp',count(*) filter(where kind='whatsapp')) from place_events where store_id=p_store and created_at>=start_at),
 'previous',(select jsonb_build_object('view',count(*) filter(where kind='view'),'call',count(*) filter(where kind='call'),'whatsapp',count(*) filter(where kind='whatsapp')) from place_events where store_id=p_store and created_at>=prev_at and created_at<start_at),
 'orders',(select jsonb_build_object('total',count(*),'completed',count(*) filter(where status='تم التسليم'),'cancelled',count(*) filter(where status='ملغي'),'open',count(*) filter(where status not in ('تم التسليم','ملغي'))) from orders where store_id=p_store and created_at>=start_at),
 'previous_orders',(select count(*) from orders where store_id=p_store and created_at>=prev_at and created_at<start_at),
 'interest',(select jsonb_build_object('product_view',count(*) filter(where kind='product_view'),'cart_add',count(*) filter(where kind='cart_add'),'photo_open',count(*) filter(where kind='photo_open'),'directions',count(*) filter(where kind='directions')) from merchant_interest_events where store_id=p_store and created_at>=start_at),
 'products',coalesce((select jsonb_agg(to_jsonb(t)) from (select e.item as id,p.name,count(*) filter(where e.kind='product_view') as views,count(*) filter(where e.kind='cart_add') as carts,count(*) filter(where e.kind='photo_open') as photos from merchant_interest_events e join products p on p.id::text=e.item and p.store_id=e.store_id where e.store_id=p_store and e.created_at>=start_at group by e.item,p.name order by views desc,carts desc,e.item)t),'[]'::jsonb),
 'hours',coalesce((select jsonb_agg(to_jsonb(t)) from (select extract(hour from created_at at time zone 'Asia/Damascus')::integer as hour,count(*) as visits from place_events where store_id=p_store and created_at>=start_at and kind='view' group by hour order by visits desc,hour limit 3)t),'[]'::jsonb),
 'daily',coalesce((select jsonb_agg(to_jsonb(t) order by t.day) from (select event_day as day,count(*) as visits from place_events where store_id=p_store and created_at>=start_at and kind='view' group by event_day)t),'[]'::jsonb),
 'cover_opens',(select count(*) from merchant_interest_events where store_id=p_store and created_at>=start_at and kind='photo_open' and item='cover'),
 'tracking_started',(select min(created_at) from merchant_interest_events where store_id=p_store)
 ) into result;
 return result;
end;$$;
revoke all on function public.record_merchant_interest(uuid,uuid,text,text) from public;
grant execute on function public.record_merchant_interest(uuid,uuid,text,text) to anon,authenticated;
revoke all on function public.merchant_insights(uuid,integer) from public,anon;
grant execute on function public.merchant_insights(uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
