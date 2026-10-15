-- Optional backend for offer-level aggregate statistics. Run in Supabase SQL Editor.
-- No change to offer publishing, owner permissions or existing statistics.
begin;
create table if not exists public.daily_offer_events (
 store_id uuid not null references public.stores(id) on delete cascade,
 offer_id uuid not null,
 session_id uuid not null,
 kind text not null check(kind in ('view','save','contact')),
 event_day date not null default (now() at time zone 'Asia/Damascus')::date,
 created_at timestamptz not null default now(),
 primary key(offer_id,event_day,session_id,kind)
);
alter table public.daily_offer_events enable row level security;
revoke all on public.daily_offer_events from public,anon,authenticated;
create index if not exists daily_offer_events_store_period on public.daily_offer_events(store_id,created_at);
create or replace function public.record_daily_offer_event(p_offer uuid,p_session uuid,p_kind text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare target_store uuid;
begin
 if p_session is null or p_kind is null or p_kind not in ('view','save','contact') then return;end if;
 select o.store_id into target_store from public.daily_offers o join public.stores s on s.id=o.store_id
 where o.id=p_offer and o.status='approved' and o.ends_at>now() and s.active and s.deleted_at is null
 and not public.daraya_account_is_banned(o.user_id) and not public.daraya_publisher_hidden(o.user_id);
 if target_store is null then return;end if;
 if public.is_admin() or (auth.uid() is not null and public.manages_store(target_store)) then return;end if;
 insert into public.daily_offer_events(store_id,offer_id,session_id,kind)
 values(target_store,p_offer,p_session,p_kind) on conflict do nothing;
end;$$;
revoke all on function public.record_daily_offer_event(uuid,uuid,text) from public;
grant execute on function public.record_daily_offer_event(uuid,uuid,text) to anon,authenticated;
create or replace function public.daily_offer_stats(p_store uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 if auth.uid() is null or not (public.is_admin() or public.manages_store(p_store)) then raise exception 'Provider access required';end if;
 select jsonb_build_object(
  'views',count(*) filter(where kind='view'),
  'saves',count(*) filter(where kind='save'),
  'contacts',count(*) filter(where kind='contact'),
  'days',30,
  'offers',coalesce((select jsonb_agg(to_jsonb(x)) from (select offer_id, count(*) filter(where kind='view') as views, count(*) filter(where kind='save') as saves, count(*) filter(where kind='contact') as contacts from public.daily_offer_events where store_id=p_store and created_at>=now()-interval '30 days' group by offer_id order by views desc,offer_id limit 50)x),'[]'::jsonb)
 ) into result from public.daily_offer_events where store_id=p_store and created_at>=now()-interval '30 days';
 return result;
end;$$;
revoke all on function public.daily_offer_stats(uuid) from public;
grant execute on function public.daily_offer_stats(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
