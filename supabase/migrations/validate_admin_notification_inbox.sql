-- All inserted events, accounts, requests and read markers are rolled back.
begin;
do $$
declare a uuid;b uuid;ordinary uuid;store_id uuid;rid uuid:=gen_random_uuid();bid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();eid bigint;fresh bigint;base integer;feed jsonb;denied boolean;
begin
 select user_id into a from public.platform_admins order by user_id limit 1;
 select user_id into b from public.platform_admins where user_id<>a limit 1;
 select id into ordinary from auth.users where id not in(select user_id from public.platform_admins) limit 1;
 select id into store_id from public.stores where not is_example limit 1;
 assert a is not null and ordinary is not null and store_id is not null;
 assert not has_schema_privilege('anon','admin_events_private','usage');
 assert not has_schema_privilege('authenticated','admin_events_private','usage');
 assert not has_function_privilege('anon','public.admin_notifications_feed(text,integer,boolean)','execute');
 assert not has_function_privilege('authenticated','admin_events_private.add_event(text,text,text,text,text,text,uuid,timestamptz)','execute');
 perform set_config('request.jwt.claim.sub',ordinary::text,true);
 set local role authenticated;
 denied:=false;begin perform public.admin_notifications_feed();exception when insufficient_privilege then denied:=true;end;
 assert denied,'ordinary user read rejected';
 denied:=false;begin perform public.admin_notifications_read(null,0);exception when insufficient_privilege then denied:=true;end;
 assert denied,'ordinary user write rejected';reset role;
 perform set_config('request.jwt.claim.sub',a::text,true);
 -- Actual signup table trigger, without any Auth network request or email.
 insert into auth.users(id,aud,role,email,created_at,updated_at) values(sid,'authenticated','authenticated','inbox-test-'||sid||'@example.test',now(),now());
 assert exists(select 1 from admin_events_private.events where source_id=sid and kind='account_created');
 delete from auth.users where id=sid;
 assert not exists(select 1 from admin_events_private.events where source_id=sid and kind='account_created'),'signup notice cleaned on account removal';
 -- Drafts stay silent; only submission creates the page-review event.
 insert into public.business_applications(id,owner_id,name) values(bid,a,'Inbox transactional test');
 assert not exists(select 1 from admin_events_private.events where source_id=bid);
 update public.business_applications set status='pending',submitted_at=now() where id=bid;
 assert (select count(*)=1 from admin_events_private.events where source_id=bid and kind='page_submitted');
 update public.business_applications set status='pending' where id=bid;
 assert (select count(*)=1 from admin_events_private.events where source_id=bid and kind='page_submitted'),'no duplicate on unchanged status';
 insert into public.place_reports(id,user_id,store_id,reason,note) values(rid,a,store_id,'other','Inbox transactional test');
 select id into eid from admin_events_private.events where source_id=rid and kind='place_report';
 assert eid is not null,'report event captured';
 set local role authenticated;
 feed:=public.admin_notifications_feed('reports',0,false);
 assert exists(select 1 from jsonb_array_elements(feed->'items') n where (n->>'id')::bigint=eid and not(n->>'read')::boolean);
 perform public.admin_notifications_read(eid,null);
 feed:=public.admin_notifications_feed('reports',0,false);
 assert exists(select 1 from jsonb_array_elements(feed->'items') n where (n->>'id')::bigint=eid and (n->>'read')::boolean);
 reset role;
 if b is not null then
  perform set_config('request.jwt.claim.sub',b::text,true);set local role authenticated;
  feed:=public.admin_notifications_feed('reports',0,false);
  assert exists(select 1 from jsonb_array_elements(feed->'items') n where (n->>'id')::bigint=eid and not(n->>'read')::boolean),'read status isolated by administrator';reset role;
 end if;
 perform set_config('request.jwt.claim.sub',a::text,true);set local role authenticated;
 feed:=public.admin_notifications_feed();perform public.admin_notifications_read(null,(feed->>'latest_id')::bigint);reset role;
 perform admin_events_private.add_event('test-after-read:'||rid,'test','reports','Test after watermark','','#dashboard/place-reports',rid,now());
 select max(id) into fresh from admin_events_private.events;
 set local role authenticated;feed:=public.admin_notifications_feed('reports',0,true);
 assert exists(select 1 from jsonb_array_elements(feed->'items') n where (n->>'id')::bigint=fresh and not(n->>'read')::boolean),'new events survive mark-all watermark';reset role;
end $$;
rollback;
select 'PASS: permissions, signup capture/cleanup, draft/submission deduplication, report capture, per-admin read state, and mark-all race' as result;
