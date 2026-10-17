-- All fixtures and deletion actions are rolled back. No real user is modified.
begin;
set local statement_timeout='30s';
do $$
declare actor uuid:=gen_random_uuid(); target uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid();
 sid uuid:=gen_random_uuid(); oid uuid:=gen_random_uuid(); pid uuid:=gen_random_uuid(); req uuid:=gen_random_uuid();
 old_token uuid:=gen_random_uuid(); response jsonb; n bigint; denied boolean;
 email text:=gen_random_uuid()::text||'@admin-delete-test.invalid';
begin
 select count(*) into n from auth.users;
 insert into auth.users(id,email,email_confirmed_at) values(actor,actor::text||'@admin-delete-test.invalid',now()),(target,email,now()),(other_user,other_user::text||'@admin-delete-test.invalid',now());
 insert into public.platform_admins(user_id) values(actor);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 insert into public.stores(id,name,category,owner_email,pickup_enabled) values(sid,'Disposable deletion test','shop',other_user::text||'@admin-delete-test.invalid',true);
 insert into public.customer_profiles(user_id,display_name,phone,address) values(target,'Disposable profile','+963900000001','Private test address') on conflict(user_id) do update set display_name='Disposable profile';
 insert into public.customer_favorites(user_id,store_id) values(target,sid);
 insert into public.customer_data_requests(id,user_id,kind,note) values(req,target,'deletion','Disposable test request');
 insert into public.business_applications(id,owner_id) values(gen_random_uuid(),target);
 insert into public.daraya_posts(id,user_id,kind,title,details,phone) values(pid,target,'used','Disposable post','Test','+963900000001');
 insert into public.daraya_post_reports(post_id,reporter,reason) values(pid,other_user,'Disposable report');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',target,'role','authenticated')::text,true);
 insert into public.orders(id,store_id,customer_id,customer_name,phone,address,area,notes,items,subtotal,delivery_fee,total,status,tracking_token,latitude,longitude)
 values(oid,sid,target,'Disposable customer','+963900000001','Private address','Test area','Private note','[]',123,0,123,'جديد',old_token,33.4,36.2);
 denied:=false;begin perform public.admin_account_deletion_preview(email);exception when others then denied:=SQLERRM='ADMIN_REQUIRED';end;
 if not denied then raise exception 'Non-admin preview accepted';end if;
 denied:=false;begin perform public.admin_execute_account_deletion(target,'DELETE '||email,true,req);exception when others then denied:=SQLERRM='ADMIN_REQUIRED';end;
 if not denied then raise exception 'Non-admin deletion accepted';end if;
 perform set_config('request.jwt.claims','{}',true);
 denied:=false;begin perform public.admin_account_deletion_requests();exception when others then denied:=SQLERRM='ADMIN_REQUIRED';end;
 if not denied then raise exception 'Guest can list requests';end if;
 if has_function_privilege('anon','public.admin_execute_account_deletion(uuid,text,boolean,uuid)','EXECUTE') then raise exception 'Anon execute granted';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 response:=public.admin_account_deletion_preview(actor::text||'@admin-delete-test.invalid');
 if not ((response->'blockers')?'SELF_ACCOUNT') then raise exception 'Self account not protected';end if;
 response:=public.admin_account_deletion_preview(other_user::text||'@admin-delete-test.invalid');
 if not ((response->'blockers')?'BUSINESS_ACCOUNT') then raise exception 'Business account not protected';end if;
 response:=public.admin_account_deletion_preview(email);
 if not ((response->'blockers')?'ACTIVE_TRANSACTIONS') then raise exception 'Open order not protected';end if;
 denied:=false;begin perform public.admin_execute_account_deletion(target,'DELETE '||email,true,req);exception when others then denied:=SQLERRM='ACCOUNT_NEEDS_HANDLING';end;
 if not denied then raise exception 'Open order deletion accepted';end if;
 update public.orders set status='تم التسليم' where id=oid;
 insert into storage.buckets(id,name) values(target::text,target::text);
 insert into storage.objects(bucket_id,name,owner,owner_id) values(target::text,'disposable-test',target,target::text);
 response:=public.admin_account_deletion_preview(email);
 if not ((response->'blockers')?'STORED_FILES') then raise exception 'External file not protected';end if;
 -- Only synthetic metadata exists here; no file bytes were created. Move its ownership
 -- to the separate fixture, and roll back all of it at the end.
 update storage.objects set owner=other_user,owner_id=other_user::text where bucket_id=target::text;
 update public.daraya_posts set image='data:image/webp;base64,AAAA' where id=pid;
 denied:=false;begin perform public.admin_execute_account_deletion(target,'DELETE wrong',true,req);exception when others then denied:=SQLERRM='CONFIRMATION_REQUIRED';end;
 if not denied then raise exception 'Wrong confirmation accepted';end if;
 denied:=false;begin perform public.admin_execute_account_deletion(target,'DELETE '||email,false,req);exception when others then denied:=SQLERRM='VERIFICATION_REQUIRED';end;
 if not denied then raise exception 'Unverified request accepted';end if;
 denied:=false;begin perform public.admin_execute_account_deletion(target,'DELETE '||email,true,gen_random_uuid());exception when others then denied:=SQLERRM='REQUEST_MISMATCH';end;
 if not denied then raise exception 'Mismatched request accepted';end if;
 if not exists(select 1 from jsonb_array_elements(public.admin_account_deletion_requests()) x where x->>'id'=req::text) then raise exception 'Pending request missing';end if;
 response:=public.admin_execute_account_deletion(target,'DELETE '||email,true,req);
 if response->>'deleted'<>'true' then raise exception 'Deletion unconfirmed';end if;
 if exists(select 1 from auth.users where id=target) or exists(select 1 from public.customer_profiles where user_id=target)
 or exists(select 1 from public.customer_favorites where user_id=target) or exists(select 1 from public.customer_data_requests where user_id=target)
 or exists(select 1 from public.business_applications where owner_id=target) or exists(select 1 from public.daraya_posts where user_id=target)
 or exists(select 1 from public.daraya_post_reports where post_id=pid) then raise exception 'Personal records remain';end if;
 if not exists(select 1 from public.orders where id=oid and customer_id is null and customer_name='حساب محذوف' and phone='' and address='' and area='' and notes='' and latitude is null and longitude is null and tracking_token<>old_token and total=123) then raise exception 'Order anonymization failed';end if;
 if not exists(select 1 from public.account_deletion_audit where id=(response->>'receipt')::uuid and actor_id=actor and deleted_user_id=target and request_id=req and orders_anonymized=1) then raise exception 'Audit receipt missing';end if;
 if (select count(*) from auth.users)<>n+2 or not exists(select 1 from auth.users where id=other_user) then raise exception 'Another account changed';end if;
end; $$;
rollback;
select 'PASS: admin-only access, self/business/open-order/file guards, identity confirmation, ownership check, request matching, deletion, personal cleanup, order anonymization, audit and isolation. All fixtures rolled back.' as result;
