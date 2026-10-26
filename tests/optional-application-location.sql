-- New test rows only; every change is rolled back.
begin;
set local statement_timeout='30s';
do $$
declare uid uuid; aid uuid; a jsonb; sid uuid; kind text;
begin
 select id into uid from auth.users where deleted_at is null limit 1;
 if uid is null then raise exception 'No user available for rollback-only validation';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 foreach kind in array array['shop','services'] loop
  aid:=gen_random_uuid();
  -- Insert a new private fixture directly so existing users' open-request quotas do not affect the test.
  insert into public.business_applications(id,owner_id,kind,name,address,contact_phone,facade_data,revision)
  values(aid,uid,kind,'اختبار غير منشور','داريا - عنوان اختبار','+963999999999','data:image/webp;base64,UklGRg==',0);
  a:=public.submit_business_application(aid,0);
  if a->>'status'<>'pending' or a->>'latitude' is not null or a->>'longitude' is not null then raise exception 'Request without GPS failed';end if;
  if public.submit_business_application(aid,0)->>'status'<>'pending' then raise exception 'Retry is not idempotent';end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
   perform public.submit_business_application(aid,(a->>'revision')::integer);
   raise exception 'Another owner submitted the request';
  exception when others then if sqlerrm<>'الطلب غير موجود' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  delete from public.business_applications where id=aid;
 end loop;
 aid:=gen_random_uuid();
 insert into public.business_applications(id,owner_id,kind,name,address,contact_phone,facade_data,revision)
 values(aid,uid,'services','اختبار مسودة غير منشورة','داريا - عنوان اختبار','0999999999','data:image/webp;base64,UklGRg==',0);
 sid:=public.prepare_business_application_store(aid,0);
 select to_jsonb(b) into a from public.business_applications b where id=aid;
 a:=public.submit_business_application(aid,(a->>'revision')::integer);
 if a->>'status'<>'pending' or a->>'latitude' is not null or (select active from public.stores where id=sid) then raise exception 'Linked private draft without GPS failed';end if;
 aid:=gen_random_uuid();
 insert into public.business_applications(id,owner_id,kind,revision) values(aid,uid,'shop',0);
 begin
  perform public.submit_business_application(aid,0);
  raise exception 'Incomplete request accepted';
 exception when others then if sqlerrm not like 'قبل طلب المعاينة:%' then raise;end if;end;
 if has_function_privilege('anon','public.submit_business_application(uuid,integer)','execute') then raise exception 'Anonymous submission became accessible';end if;
end;$$;
rollback;
select 'Passed: shop, service and linked draft without GPS; required details, ownership and private review preserved. All test rows rolled back.' as result;
