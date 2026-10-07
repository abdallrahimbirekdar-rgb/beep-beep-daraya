-- Tests use only new rows in a transaction that is rolled back.
-- No existing shop, account or application is changed.
begin;
set local statement_timeout='30s';
do $$
declare uid uuid; mail text; aid uuid:=gen_random_uuid(); a jsonb; sid uuid;
begin
 select p.user_id,u.email into uid,mail from public.platform_admins p join auth.users u on u.id=p.user_id limit 1;
 if uid is null then raise exception 'No platform administrator available for validation';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','email',mail)::text,true);
 a:=public.save_business_application(aid,0,'{"kind":"services"}');
 begin
  perform public.submit_business_application(aid,(a->>'revision')::integer);
  raise exception 'Incomplete application was accepted';
 exception when others then
  if sqlerrm not like 'قبل طلب المعاينة:%' then raise;end if;
 end;
 a:=public.save_business_application(aid,(a->>'revision')::integer,'{"kind":"services","name":"اختبار داخلي غير منشور","address":"داريا - اختبار غير منشور","contact_phone":"+963999999999","contact_method":"whatsapp","latitude":33.458,"longitude":36.236,"facade_data":"data:image/webp;base64,UklGRg=="}');
 a:=public.submit_business_application(aid,(a->>'revision')::integer);
 if a->>'status'<>'pending' then raise exception 'Submission did not enter review';end if;
 sid:=public.begin_business_application_approval(aid,(a->>'revision')::integer);
 if (select active from public.stores where id=sid) then raise exception 'Staged page was public';end if;
 if public.begin_business_application_approval(aid,(a->>'revision')::integer)<>sid then raise exception 'Approval retry duplicated the page';end if;
 perform public.finish_business_application_approval(aid,'https://damascus-shop.com/daraya-logo-gold.webp');
 if not (select active and owner_email=mail and latitude=33.458 and longitude=36.236 from public.stores where id=sid) then raise exception 'Approved page is incomplete';end if;
 if (select status from public.business_applications where id=aid)<>'approved' then raise exception 'Approval status was not saved';end if;
end;$$;
rollback;
select 'نجحت اختبارات طلبات المتاجر والخدمات، ولم يتم حفظ أي بيانات اختبار.' as result;
