-- All accounts, reports and offers in this test are synthetic and rolled back.
begin;
set local statement_timeout='40s';
do $$
declare a uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); pid uuid:=gen_random_uuid(); appid uuid:=gen_random_uuid(); offer uuid:=gen_random_uuid(); rid uuid; report uuid; r jsonb; denied boolean;
begin
 insert into auth.users(id,email,email_confirmed_at) values(a,a::text||'@review-test.invalid',now()),(u,u::text||'@review-test.invalid',now()),(v,v::text||'@review-test.invalid',now());
 insert into public.platform_admins(user_id) values(a);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 r:=public.submit_account_deletion_request('Temporary request');rid:=(r->>'id')::uuid;
 if (public.submit_account_deletion_request('Retry')->>'id')::uuid<>rid then raise exception 'Duplicate request created';end if;
 denied:=false;begin perform public.admin_reply_account_deletion(rid,'Not an admin');exception when others then denied:=SQLERRM='ADMIN_REQUIRED';end;
 if not denied then raise exception 'Non-admin can reply';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 perform public.admin_reply_account_deletion(rid,'Temporary response, not deletion confirmation');
 if not exists(select 1 from jsonb_array_elements(public.admin_account_deletion_requests()) x where x->>'id'=rid::text and x->>'admin_reply'='Temporary response, not deletion confirmation') then raise exception 'Admin queue reply missing';end if;
 insert into public.stores(id,name,category,owner_email,pickup_enabled,is_example) values(sid,'Disposable review test','shop',a::text||'@review-test.invalid',true,true);
 insert into public.daraya_posts(id,user_id,kind,title,details,phone,image) values(pid,u,'used','Temporary','Temporary','+963900000001','data:image/webp;base64,AAAA');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 insert into public.business_applications(id,owner_id,facade_data) values(appid,u,'data:image/webp;base64,AAAA');
 insert into storage.buckets(id,name) values(u::text,u::text);
 insert into storage.objects(bucket_id,name,owner,owner_id) values(u::text,'fixture.webp',u,u::text);
 if public.account_deletion_status()->>'reason'<>'STORED_FILES' then raise exception 'Stored file is not guarded';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 if not ((public.admin_account_deletion_preview(u::text||'@review-test.invalid')->'blockers')?'STORED_FILES') then raise exception 'Admin media guard missing';end if;
 -- Metadata only: no real bytes were uploaded. Reassign within the rollback fixture.
 update storage.objects set owner=v,owner_id=v::text where bucket_id=u::text;
 -- End-to-end store report: publisher submits, admin reads and resolves.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v,'role','authenticated')::text,true);
 report:=public.create_place_report(sid,'other','Temporary test report');
 denied:=false;begin perform public.resolve_place_report(report);exception when others then denied:=SQLERRM='Admin access required';end;
 if not denied then raise exception 'Ordinary user resolved report';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 if not exists(select 1 from public.place_reports where id=report and status='new') then raise exception 'Submitted report missing';end if;
 perform public.resolve_place_report(report);
 if not exists(select 1 from public.place_reports where id=report and status='resolved') then raise exception 'Report was not resolved';end if;
 -- End-to-end offer moderation on an isolated example shop, never committed.
 insert into public.daily_offers(id,user_id,store_id,title,address,details,ends_at,status) values(offer,u,sid,'Temporary review offer','Temporary address','{"type":"daraya-shop-offer-v1","kind":"text"}',now()+interval '1 day','pending');
 update public.daily_offers set status='approved' where id=offer;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v,'role','authenticated')::text,true);
 perform public.report_daily_offer(offer,'Temporary test report');
 select id into report from public.daily_offer_reports where offer_id=offer and reporter_id=v;
 if report is null then raise exception 'Offer report missing';end if;
 denied:=false;begin perform public.review_daily_offer_report(report,true);exception when others then denied:=SQLERRM='Admin required';end;
 if not denied then raise exception 'User moderated offer';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 perform public.review_daily_offer_report(report,true);
 if not exists(select 1 from public.daily_offers where id=offer and status='rejected') or not exists(select 1 from public.daily_offer_reports where id=report and status='resolved') then raise exception 'Offer moderation failed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 r:=public.delete_my_account('DELETE');
 if r->>'deleted'<>'true' or exists(select 1 from auth.users where id=u) or exists(select 1 from public.customer_data_requests where user_id=u) then raise exception 'Final deletion failed';end if;
 if not exists(select 1 from auth.users where id=v) then raise exception 'Unrelated account affected';end if;
 if has_function_privilege('anon','public.submit_account_deletion_request(text)','EXECUTE') or has_function_privilege('anon','public.admin_reply_account_deletion(uuid,text)','EXECUTE') then raise exception 'Guest grant exposed';end if;
 if has_column_privilege('authenticated','public.customer_data_requests','admin_reply','INSERT') then raise exception 'User may forge admin reply on insert';end if;
end;$$;
rollback;
select 'PASS: deletion request/retry, admin reply guard, file guards, rollback-safe final deletion, store report submit/read/resolve, offer review/report/hide, unrelated account isolation.' as result;