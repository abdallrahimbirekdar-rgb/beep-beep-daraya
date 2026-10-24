-- Administrative inbox: operational events only, no new visitor tracking.
create schema if not exists admin_events_private;
revoke all on schema admin_events_private from public, anon, authenticated;
create table admin_events_private.events (
 id bigint generated always as identity primary key,
 event_key text not null unique,
 kind text not null,
 category text not null check(category in ('reports','orders','pages','offers','accounts','privacy','community','bookings')),
 title text not null check(length(title)<=200),
 detail text not null default '' check(length(detail)<=250),
 target text not null check(target like '#%'),
 source_id uuid,
 occurred_at timestamptz not null default now()
);
create index admin_events_recent_idx on admin_events_private.events(occurred_at desc,id desc);
create index admin_events_category_idx on admin_events_private.events(category,occurred_at desc,id desc);
create index admin_events_source_idx on admin_events_private.events(source_id,kind);
create table admin_events_private.reads (
 user_id uuid not null references auth.users(id) on delete cascade,
 event_id bigint not null references admin_events_private.events(id) on delete cascade,
 read_at timestamptz not null default now(),primary key(user_id,event_id)
);
create index admin_events_reads_event_idx on admin_events_private.reads(event_id);
create table admin_events_private.read_watermarks (
 user_id uuid primary key references auth.users(id) on delete cascade,
 through_id bigint not null default 0
);
alter table admin_events_private.events enable row level security;
alter table admin_events_private.reads enable row level security;
alter table admin_events_private.read_watermarks enable row level security;
revoke all on all tables in schema admin_events_private from public,anon,authenticated;
revoke all on all sequences in schema admin_events_private from public,anon,authenticated;

create function admin_events_private.add_event(p_key text,p_kind text,p_category text,p_title text,p_detail text,p_target text,p_source uuid,p_at timestamptz default now()) returns void
language sql security definer set search_path='' as $$
 insert into admin_events_private.events(event_key,kind,category,title,detail,target,source_id,occurred_at)
 values(p_key,p_kind,p_category,left(p_title,200),left(coalesce(p_detail,''),250),p_target,p_source,coalesce(p_at,now())) on conflict(event_key) do nothing;
$$;
revoke all on function admin_events_private.add_event(text,text,text,text,text,text,uuid,timestamptz) from public,anon,authenticated;

create function admin_events_private.capture_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare n jsonb; o jsonb; k text; c text; title text; detail text:=''; dest text; sid uuid; event_id uuid; suffix text; at_time timestamptz:=now();
begin
 if tg_op='DELETE' then
  -- Do not retain the account identifier in registration notifications after deletion.
  if tg_table_schema='auth' and tg_table_name='users' then
   delete from admin_events_private.events where kind='account_created' and source_id=old.id;
  end if;
  return old;
 end if;
 n:=to_jsonb(new);if tg_op='UPDATE' then o:=to_jsonb(old);else o:='{}'::jsonb;end if;
 event_id:=(n->>'id')::uuid;
 suffix:=case when tg_op='INSERT' then 'created' else txid_current()::text end;
 case tg_table_name
 when 'users' then
  if tg_op<>'INSERT' or coalesce((n->>'is_anonymous')::boolean,false) or n->>'deleted_at' is not null then return new;end if;
  k:='account_created';c:='accounts';title:='مستخدم جديد';detail:='تم تسجيل حساب جديد في الموقع';dest:='#dashboard/accounts';
 when 'business_applications' then
  if n->>'status'<>'pending' or (tg_op='UPDATE' and o->>'status'='pending') then return new;end if;
  k:='page_submitted';c:='pages';title:='طلب إنشاء صفحة بانتظار المعاينة';detail:=n->>'name';dest:='#review-business/'||event_id;
 when 'orders' then
  sid:=(n->>'store_id')::uuid;
  if exists(select 1 from public.stores where id=sid and is_example) then return new;end if;
  if tg_op='INSERT' then k:='order_created';title:='طلب شراء جديد';
  elsif n->>'status'='ملغي' and o->>'status' is distinct from n->>'status' then k:='order_cancelled';title:='تم إلغاء طلب';
  else return new;end if;
  c:='orders';select name into detail from public.stores where id=sid;detail:=coalesce(detail,'')||' · '||left(event_id::text,8);dest:='#dashboard/orders/'||sid;
 when 'place_reports' then
  if tg_op<>'INSERT' then return new;end if;
  k:='place_report';c:='reports';title:='بلاغ عن محل أو مكان';select name into detail from public.stores where id=(n->>'store_id')::uuid;dest:='#dashboard/place-reports';
 when 'daily_offer_reports' then
  if tg_op<>'INSERT' then return new;end if;
  k:='offer_report';c:='reports';title:='بلاغ عن عرض';dest:='#offer-reports';
 when 'daraya_post_reports' then
  if tg_op<>'INSERT' then return new;end if;
  k:='post_report';c:='reports';title:='بلاغ عن إعلان أو منشور';dest:='#board-reports';
 when 'daily_offers' then
  if n->>'status'<>'pending' or (tg_op='UPDATE' and o->>'status'='pending') then return new;end if;
  k:='offer_submitted';c:='offers';title:='عرض جديد بانتظار الموافقة';detail:=n->>'title';dest:='#offer-review';
 when 'customer_data_requests' then
  if n->>'status'<>'pending' or (tg_op='UPDATE' and o->>'status'='pending') then return new;end if;
  k:='data_request';c:='privacy';title:=case when n->>'kind'='deletion' then 'طلب حذف حساب' else 'طلب متعلق ببيانات الحساب' end;dest:=case when n->>'kind'='deletion' then '#account-deletion-admin' else '#data-requests' end;
 when 'service_bookings' then
  if tg_op<>'INSERT' then return new;end if;
  k:='booking_created';c:='bookings';title:='طلب حجز خدمة جديد';select name into detail from public.stores where id=(n->>'store_id')::uuid;dest:='#dashboard/setup/'||(n->>'store_id')||'/tools';
 when 'market_requests' then
  if tg_op<>'INSERT' then return new;end if;
  k:='market_request';c:='community';title:='طلب جديد في السوق';detail:=n->>'title';dest:='#requests';
 when 'daraya_posts' then
  if tg_op<>'INSERT' or n->>'status'<>'active' then return new;end if;
  k:='post_created';c:='community';title:=case when n->>'kind'='used' then 'منشور جديد في سوق المستعمل' else 'إعلان جديد في داريا' end;detail:=n->>'title';dest:='#ad/'||event_id;
 else return new;
 end case;
 perform admin_events_private.add_event(k||':'||event_id||':'||suffix,k,c,title,detail,dest,event_id,at_time);
 return new;
exception when others then
 -- A notification must never block checkout, a report, or account registration.
 raise warning 'admin inbox capture failed on %: %',tg_table_name,sqlstate;
 return new;
end;
$$;
revoke all on function admin_events_private.capture_event() from public,anon,authenticated;
create trigger admin_inbox_signup after insert or delete on auth.users for each row execute function admin_events_private.capture_event();
create trigger admin_inbox_business after insert or update of status on public.business_applications for each row execute function admin_events_private.capture_event();
create trigger admin_inbox_orders after insert or update of status on public.orders for each row execute function admin_events_private.capture_event();
create trigger admin_inbox_places after insert on public.place_reports for each row execute function admin_events_private.capture_event();
create trigger admin_inbox_offer_reports after insert on public.daily_offer_reports for each row execute function admin_events_private.capture_event();
create trigger admin_inbox_post_reports after insert on public.daraya_post_reports for each row execute function admin_events_private.capture_event();
create trigger admin_inbox_offers after insert or update of status on public.daily_offers for each row execute function admin_events_private.capture_event();
create trigger admin_inbox_privacy after insert or update of status on public.customer_data_requests for each row execute function admin_events_private.capture_event();
create trigger admin_inbox_bookings after insert on public.service_bookings for each row execute function admin_events_private.capture_event();
create trigger admin_inbox_requests after insert on public.market_requests for each row execute function admin_events_private.capture_event();
create trigger admin_inbox_posts after insert on public.daraya_posts for each row execute function admin_events_private.capture_event();

create function public.admin_notifications_feed(p_category text default 'all',p_page integer default 0,p_unread_only boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();wm bigint;answer jsonb;
begin
 if uid is null or not public.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
 if p_page is null or p_page<0 or p_page>10000 or p_category is null or p_category not in ('all','reports','orders','pages','offers','accounts','privacy','community','bookings') or p_unread_only is null then raise exception 'Invalid inbox filter' using errcode='22023';end if;
 select through_id into wm from admin_events_private.read_watermarks where user_id=uid;wm:=coalesce(wm,0);
 with entries as (
  select e.*, (e.id<=wm or r.event_id is not null) as is_read from admin_events_private.events e
  left join admin_events_private.reads r on r.event_id=e.id and r.user_id=uid
 ),filtered as (
  select * from entries where (p_category='all' or category=p_category) and (not p_unread_only or not is_read)
 ),page as (select * from filtered order by occurred_at desc,id desc limit 30 offset p_page*30)
 select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'category',category,'title',title,'detail',detail,'target',target,'source_id',source_id,'created_at',occurred_at,'read',is_read) order by occurred_at desc,id desc) from page),'[]'::jsonb),
 'unread',(select count(*) from entries where not is_read),'total',(select count(*) from filtered),'latest_id',coalesce((select max(id) from entries),0),'page',p_page,'page_size',30) into answer;
 return answer;
end;
$$;
revoke all on function public.admin_notifications_feed(text,integer,boolean) from public,anon;
grant execute on function public.admin_notifications_feed(text,integer,boolean) to authenticated;
create function public.admin_notifications_read(p_id bigint default null,p_through_id bigint default null) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();max_id bigint;
begin
 if uid is null or not public.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
 if (p_id is null)=(p_through_id is null) or coalesce(p_id,p_through_id)<0 then raise exception 'Choose one read action' using errcode='22023';end if;
 if p_id is not null then
  insert into admin_events_private.reads(user_id,event_id) select uid,id from admin_events_private.events where id=p_id on conflict do nothing;
 else
  select coalesce(max(id),0) into max_id from admin_events_private.events;
  insert into admin_events_private.read_watermarks(user_id,through_id) values(uid,least(p_through_id,max_id))
  on conflict(user_id) do update set through_id=greatest(admin_events_private.read_watermarks.through_id,excluded.through_id);
 end if;
end;
$$;
revoke all on function public.admin_notifications_read(bigint,bigint) from public,anon;
grant execute on function public.admin_notifications_read(bigint,bigint) to authenticated;

-- Start with outstanding work; do not flood the inbox with old completed activity.
select admin_events_private.add_event('page_submitted:'||id||':created','page_submitted','pages','طلب إنشاء صفحة بانتظار المعاينة',name,'#review-business/'||id,id,coalesce(submitted_at,created_at)) from public.business_applications where status in ('pending','publishing');
select admin_events_private.add_event('place_report:'||r.id||':created','place_report','reports','بلاغ عن محل أو مكان',s.name,'#dashboard/place-reports',r.id,r.created_at) from public.place_reports r left join public.stores s on s.id=r.store_id where r.status='new';
select admin_events_private.add_event('offer_report:'||id||':created','offer_report','reports','بلاغ عن عرض','','#offer-reports',id,created_at) from public.daily_offer_reports where status='new';
select admin_events_private.add_event('post_report:'||id||':created','post_report','reports','بلاغ عن إعلان أو منشور','','#board-reports',id,created_at) from public.daraya_post_reports where status='new';
select admin_events_private.add_event('offer_submitted:'||id||':created','offer_submitted','offers','عرض بانتظار الموافقة',title,'#offer-review',id,created_at) from public.daily_offers where status='pending';
select admin_events_private.add_event('data_request:'||id||':created','data_request','privacy',case when kind='deletion' then 'طلب حذف حساب' else 'طلب متعلق ببيانات الحساب' end,'',case when kind='deletion' then '#account-deletion-admin' else '#data-requests' end,id,created_at) from public.customer_data_requests where status='pending';
select admin_events_private.add_event('order_created:'||o.id||':created','order_created','orders','طلب شراء جديد',s.name||' · '||left(o.id::text,8),'#dashboard/orders/'||o.store_id,o.id,o.created_at) from public.orders o join public.stores s on s.id=o.store_id where o.status='جديد' and not s.is_example;
select admin_events_private.add_event('account_created:'||id||':created','account_created','accounts','مستخدم جديد','تم تسجيل حساب جديد في الموقع','#dashboard/accounts',id,created_at) from auth.users where created_at>=now()-interval '7 days' and not coalesce(is_anonymous,false) and deleted_at is null;
select admin_events_private.add_event('booking_created:'||b.id||':created','booking_created','bookings','طلب حجز خدمة جديد',s.name,'#dashboard/setup/'||b.store_id||'/tools',b.id,b.created_at) from public.service_bookings b left join public.stores s on s.id=b.store_id where b.status='new';
