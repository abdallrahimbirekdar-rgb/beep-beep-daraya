-- Read-only admin summaries of existing analytics records.
-- No new tables, identifiers, visitor events, SDKs, collection or retention changes.
create or replace function public.admin_visitor_insights(p_days integer default 7)
returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,public
as $$
declare
 d date := (now() at time zone 'Asia/Damascus')::date;
 days integer := case when p_days in (7,30,90) then p_days else 7 end;
 period_start date;
 previous_day date;
 result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.platform_admins where user_id=auth.uid()) then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 period_start:=d-days+1;previous_day:=period_start-days;
 with
 first_seen as materialized (select visitor_id,min(visit_day) as first_seen_day from public.website_visit_sessions where visitor_id is not null and visit_day<=d group by visitor_id),
 window_visits as materialized (select visit_day,created_at,visitor_id from public.website_visit_sessions where visit_day between previous_day and d),
 current_visits as materialized (select * from window_visits where visit_day>=period_start),
 visitor_counts as (select v.visitor_id,count(*) as sessions,f.first_seen_day from current_visits v join first_seen f using(visitor_id) group by v.visitor_id,f.first_seen_day),
 history as (select min(visit_day) as started from public.website_visit_sessions where visit_day<=d),
 real_stores as materialized (select id,name,coalesce(nullif(translations#>>'{_directory,kind}',''),category) as category from public.stores where active and deleted_at is null and not coalesce(is_example,false)),
 places as materialized (select e.store_id,s.name,s.category,e.kind from public.place_events e join real_stores s on s.id=e.store_id where e.event_day between period_start and d),
 interest as materialized (select e.kind from public.merchant_interest_events e join real_stores s on s.id=e.store_id where e.event_day between period_start and d),
 offers as materialized (select e.kind from public.daily_offer_events e join real_stores s on s.id=e.store_id where e.event_day between period_start and d)
 select jsonb_build_object(
  'days',days,'from',period_start,'to',d,'timezone','Asia/Damascus',
  'tracking_started',(select started from history),
  'coverage_days',(select case when started is null then 0 else greatest(0,least(days,d-greatest(started,period_start)+1)) end from history),
  'previous_coverage_days',(select case when started is null then 0 else greatest(0,least(days,period_start-greatest(started,previous_day))) end from history),
  'current',(select jsonb_build_object('visits',count(*),'visitors',count(distinct visitor_id),'known_sessions',count(*) filter(where visitor_id is not null),'unknown_sessions',count(*) filter(where visitor_id is null),'active_days',count(distinct visit_day)) from current_visits),
  'previous',(select jsonb_build_object('visits',count(*),'visitors',count(distinct visitor_id)) from window_visits where visit_day<period_start),
  'audience',(select jsonb_build_object('new',count(*) filter(where first_seen_day>=period_start),'returning',count(*) filter(where first_seen_day<period_start),'multiple_sessions',count(*) filter(where sessions>1)) from visitor_counts),
  'daily',(select coalesce(jsonb_agg(to_jsonb(x) order by x.day),'[]'::jsonb) from (select g.day::date as day,count(v.created_at) as visits,count(distinct v.visitor_id) as visitors from generate_series(period_start::timestamp,d::timestamp,interval '1 day') g(day) left join current_visits v on v.visit_day=g.day::date group by g.day)x),
  'hours',(select jsonb_agg(to_jsonb(x) order by x.hour) from (select g.hour,count(v.created_at) as visits from generate_series(0,23) g(hour) left join current_visits v on extract(hour from v.created_at at time zone 'Asia/Damascus')::integer=g.hour group by g.hour)x),
  'activity',jsonb_build_object(
   'shop_views',(select count(*) from places where kind='view'),
   'calls',(select count(*) from places where kind='call'),
   'whatsapp',(select count(*) from places where kind='whatsapp'),
   'directions',(select count(*) from interest where kind='directions'),
   'product_views',(select count(*) from interest where kind='product_view'),
   'photo_opens',(select count(*) from interest where kind='photo_open'),
   'cart_adds',(select count(*) from interest where kind='cart_add'),
   'offer_views',(select count(*) from offers where kind='view'),
   'offer_saves',(select count(*) from offers where kind='save'),
   'offer_contacts',(select count(*) from offers where kind='contact')),
  'top_shops',(select coalesce(jsonb_agg(to_jsonb(x) order by x.views desc,x.id),'[]'::jsonb) from (select store_id as id,name,count(*) filter(where kind='view') as views,count(*) filter(where kind in ('call','whatsapp')) as contacts from places group by store_id,name having count(*) filter(where kind='view')>0 order by views desc,store_id limit 10)x),
  'top_categories',(select coalesce(jsonb_agg(to_jsonb(x) order by x.views desc,x.category),'[]'::jsonb) from (select category,count(*) as views from places where kind='view' group by category order by views desc,category limit 10)x)
 ) into result;
 return result;
end;
$$;
revoke all on function public.admin_visitor_insights(integer) from public,anon,authenticated;
grant execute on function public.admin_visitor_insights(integer) to authenticated;
comment on function public.admin_visitor_insights(integer) is 'Admin-only aggregate reporting over existing visitor and interaction records; returns no visitor/session identifiers.';
notify pgrst,'reload schema';
