-- Souq Daraya: requests, bookings, reports and anonymous page counters.
-- Run once in the project's SQL editor. Existing catalog data is preserved.
begin;
create table if not exists public.market_requests (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(title) between 3 and 150),
 category text not null check(category in ('all','shop','restaurant','doctor','pharmacy','services','school','lawyer')),
 region text not null check(char_length(region) between 1 and 100),
 details text not null check(char_length(details) between 3 and 1000),
 status text not null default 'open' check(status in ('open','closed')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days'
);
create index if not exists market_requests_open_idx on public.market_requests(category,expires_at) where status='open';
create index if not exists market_requests_user_idx on public.market_requests(user_id,created_at desc);
create table if not exists public.market_replies (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.market_requests(id) on delete cascade,
 store_id uuid not null references public.stores(id), message text not null check(char_length(message) between 3 and 1000),
 price bigint check(price between 0 and 100000000), created_at timestamptz not null default now(), unique(request_id,store_id)
);
create table if not exists public.service_bookings (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.stores(id), customer_name text not null check(char_length(customer_name) between 1 and 100),
 phone text not null check(phone ~ '^\+[1-9][0-9]{7,14}$'),
 service text not null check(char_length(service) between 1 and 200), requested_at timestamptz not null,
 notes text not null default '' check(char_length(notes)<=1000),
 status text not null default 'new' check(status in ('new','accepted','declined','cancelled')),
 created_at timestamptz not null default now()
);
create index if not exists service_bookings_store_idx on public.service_bookings(store_id,created_at desc);
create index if not exists service_bookings_user_idx on public.service_bookings(user_id,created_at desc);
create table if not exists public.place_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.stores(id), reason text not null check(reason in ('phone','address','closed','other')),
 note text not null check(char_length(note) between 1 and 1000),
 status text not null default 'new' check(status in ('new','resolved')), created_at timestamptz not null default now()
);
create table if not exists public.place_events (
 event_day date not null default (now() at time zone 'Asia/Damascus')::date,
 store_id uuid not null references public.stores(id), session_id uuid not null,
 kind text not null check(kind in ('view','call','whatsapp')), created_at timestamptz not null default now(),
 primary key(event_day,store_id,session_id,kind)
);
alter table public.market_requests enable row level security;
alter table public.market_replies enable row level security;
alter table public.service_bookings enable row level security;
alter table public.place_reports enable row level security;
alter table public.place_events enable row level security;
revoke all on public.market_requests,public.market_replies,public.service_bookings,public.place_reports,public.place_events from anon,authenticated;
-- Only the customer, the chosen provider and admins can read booking contacts.
drop policy if exists service_bookings_read on public.service_bookings;
create policy service_bookings_read on public.service_bookings for select to authenticated using(user_id=auth.uid() or public.manages_store(store_id));
drop policy if exists place_reports_admin_read on public.place_reports;
create policy place_reports_admin_read on public.place_reports for select to authenticated using(public.is_admin());
grant select on public.service_bookings,public.place_reports to authenticated;

create or replace function public.create_market_request(p_request uuid,p_title text,p_category text,p_region text,p_details text)
returns uuid language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if exists(select 1 from market_requests where id=p_request and user_id=auth.uid()) then return p_request;end if;
 perform pg_advisory_xact_lock(hashtext('market-request:'||auth.uid()::text));
 if (select count(*) from market_requests where user_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Daily request limit';end if;
 insert into market_requests(id,user_id,title,category,region,details) values(p_request,auth.uid(),trim(p_title),p_category,trim(p_region),trim(p_details));return p_request;
end;$$;
create or replace function public.my_market_requests()
returns jsonb language sql security definer set search_path=public as $$
 select coalesce(jsonb_agg(q.item order by q.created_at desc),'[]'::jsonb) from (
 select r.created_at,jsonb_build_object('id',r.id,'title',r.title,'region',r.region,'details',r.details,'status',case when r.expires_at<=now() then 'closed' else r.status end,'replies',coalesce((select jsonb_agg(jsonb_build_object('store_id',a.store_id,'store_name',s.name,'message',a.message,'price',a.price) order by a.created_at) from market_replies a join stores s on s.id=a.store_id where a.request_id=r.id),'[]'::jsonb)) item from market_requests r where r.user_id=auth.uid() order by r.created_at desc limit 100) q;
$$;
create or replace function public.community_store_kind(p_store uuid)
returns text language sql stable set search_path=public as $$
 select coalesce(nullif(translations->'_directory'->>'kind',''),case when name||' '||description ~ 'صيدل' then 'pharmacy' when name||' '||description ~ 'طبيب|عيادة|دكتور' then 'doctor' when name||' '||description ~ 'محام' then 'lawyer' when name||' '||description ~ 'مدرسة|مدارس' then 'school' when text_only then 'services' else category end) from stores where id=p_store;
$$;
create or replace function public.browse_market_requests(p_store uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.manages_store(p_store) then raise exception 'Provider access required';end if;
 select coalesce(jsonb_agg(q.item order by q.created_at desc),'[]'::jsonb) into result from (
 select r.created_at,jsonb_build_object('id',r.id,'title',r.title,'region',r.region,'details',r.details) item from market_requests r where r.status='open' and r.expires_at>now() and (r.category='all' or r.category=public.community_store_kind(p_store)) order by r.created_at desc limit 100) q;
 return result;
end;$$;
create or replace function public.reply_market_request(p_store uuid,p_request uuid,p_message text,p_price bigint default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.manages_store(p_store) or not exists(select 1 from stores where id=p_store and active and deleted_at is null) then raise exception 'Provider access required';end if;
 perform 1 from market_requests r where r.id=p_request and r.status='open' and r.expires_at>now() and (r.category='all' or r.category=public.community_store_kind(p_store)) for share;
 if not found then raise exception 'Request unavailable';end if;
 insert into market_replies(request_id,store_id,message,price) values(p_request,p_store,trim(p_message),p_price) on conflict(request_id,store_id) do update set message=excluded.message,price=excluded.price,created_at=now();
end;$$;
create or replace function public.close_market_request(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 update market_requests set status='closed' where id=p_id and user_id=auth.uid();if not found then raise exception 'Request unavailable';end if;
end;$$;
create or replace function public.create_service_booking(p_request uuid,p_store uuid,p_name text,p_phone text,p_service text,p_when timestamptz,p_notes text default '')
returns uuid language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if exists(select 1 from service_bookings where id=p_request and user_id=auth.uid()) then return p_request;end if;
 perform 1 from stores where id=p_store and active and deleted_at is null and translations->'_community'->>'booking_enabled'='true' for share;
 if not found then raise exception 'Bookings unavailable';end if;
 if p_when is null or p_when<=now() or p_when>now()+interval '90 days' then raise exception 'Choose a future date within 90 days';end if;
 perform pg_advisory_xact_lock(hashtext('booking:'||auth.uid()::text));
 if (select count(*) from service_bookings where user_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Daily booking limit';end if;
 insert into service_bookings(id,user_id,store_id,customer_name,phone,service,requested_at,notes) values(p_request,auth.uid(),p_store,trim(p_name),p_phone,trim(p_service),p_when,coalesce(trim(p_notes),''));return p_request;
end;$$;
create or replace function public.set_service_booking_status(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
declare b service_bookings%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into b from service_bookings where id=p_id for update;
 if not found then raise exception 'Booking unavailable';end if;
 if p_status='cancelled' and b.user_id=auth.uid() and b.status in ('new','accepted') then
  update service_bookings set status=p_status where id=p_id;
 elsif public.manages_store(b.store_id) and b.status='new' and p_status in ('accepted','declined') then
  update service_bookings set status=p_status where id=p_id;
 else raise exception 'Status change not allowed';end if;
end;$$;
create or replace function public.create_place_report(p_store uuid,p_reason text,p_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if not exists(select 1 from stores where id=p_store and active and deleted_at is null) then raise exception 'Place unavailable';end if;
 perform pg_advisory_xact_lock(hashtext('report:'||auth.uid()::text));
 if (select count(*) from place_reports where user_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Daily report limit';end if;
 insert into place_reports(user_id,store_id,reason,note) values(auth.uid(),p_store,p_reason,trim(p_note)) returning id into result;return result;
end;$$;
create or replace function public.resolve_place_report(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Admin access required';end if;
 update place_reports set status='resolved' where id=p_id;if not found then raise exception 'Report unavailable';end if;
end;$$;
create or replace function public.record_place_event(p_store uuid,p_session uuid,p_kind text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if p_session is null or p_kind not in ('view','call','whatsapp') or not exists(select 1 from stores where id=p_store and active and deleted_at is null) then return;end if;
 if public.is_admin() or (auth.uid() is not null and public.manages_store(p_store)) then return;end if;
 insert into place_events(store_id,session_id,kind) values(p_store,p_session,p_kind) on conflict do nothing;
end;$$;
create or replace function public.place_event_stats(p_store uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.manages_store(p_store) then raise exception 'Provider access required';end if;
 select jsonb_build_object('view',count(*) filter(where kind='view'),'call',count(*) filter(where kind='call'),'whatsapp',count(*) filter(where kind='whatsapp'),'orders',(select count(*) from orders where store_id=p_store and created_at>=now()-interval '30 days')) into result from place_events where store_id=p_store and created_at>=now()-interval '30 days';return result;
end;$$;
create or replace function public.community_tools_ready()
returns integer language sql stable as $$select 1;$$;
revoke all on function public.create_market_request(uuid,text,text,text,text), public.my_market_requests(), public.browse_market_requests(uuid), public.reply_market_request(uuid,uuid,text,bigint), public.close_market_request(uuid), public.create_service_booking(uuid,uuid,text,text,text,timestamptz,text), public.set_service_booking_status(uuid,text), public.create_place_report(uuid,text,text), public.resolve_place_report(uuid), public.place_event_stats(uuid) from public,anon;
grant execute on function public.create_market_request(uuid,text,text,text,text), public.my_market_requests(), public.browse_market_requests(uuid), public.reply_market_request(uuid,uuid,text,bigint), public.close_market_request(uuid), public.create_service_booking(uuid,uuid,text,text,text,timestamptz,text), public.set_service_booking_status(uuid,text), public.create_place_report(uuid,text,text), public.resolve_place_report(uuid), public.place_event_stats(uuid) to authenticated;
revoke all on function public.record_place_event(uuid,uuid,text),public.community_tools_ready() from public;
grant execute on function public.record_place_event(uuid,uuid,text),public.community_tools_ready() to anon,authenticated;
revoke all on function public.community_store_kind(uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
