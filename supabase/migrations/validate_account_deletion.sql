-- Disposable fixtures exist ONLY inside this rolled-back transaction.
begin;
set local statement_timeout='30s';
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); merchant uuid:=gen_random_uuid();
 sid uuid:=gen_random_uuid(); oid uuid:=gen_random_uuid(); pid uuid:=gen_random_uuid();
 token uuid:=gen_random_uuid(); result jsonb; rejected boolean; total_users bigint;
begin
 select count(*) into total_users from auth.users;
 insert into auth.users(id,email,email_confirmed_at) values
 (a,a::text||'@deletion-test.invalid',now()),(b,b::text||'@deletion-test.invalid',now()),
 (merchant,merchant::text||'@deletion-test.invalid',now());
 insert into public.stores(id,name,category,owner_email,pickup_enabled) values(sid,'Deletion test fixture','shop',merchant::text||'@deletion-test.invalid',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','email',a::text||'@deletion-test.invalid')::text,true);
 insert into public.customer_profiles(user_id,display_name,phone,address,area) values(a,'Test customer','+963900000001','Test address','Test area') on conflict(user_id) do update set display_name='Test customer';
 insert into public.customer_profiles(user_id,display_name) values(b,'Other customer') on conflict(user_id) do update set display_name='Other customer';
 insert into public.customer_favorites(user_id,store_id) values(a,sid);
 insert into public.business_applications(id,owner_id) values(gen_random_uuid(),a);
 insert into public.daraya_posts(id,user_id,kind,title,details,phone) values(pid,a,'used','Test title','Test details','+963900000001');
 insert into public.daraya_post_reports(post_id,reporter,reason) values(pid,b,'Test report');
 insert into public.orders(id,store_id,customer_name,phone,address,area,notes,items,subtotal,delivery_fee,total,status,tracking_token,latitude,longitude)
 values(oid,sid,'Test customer','+963900000001','Test address','Test area','Private note','[]',100,0,100,'جديد',token,33.4,36.2);
 rejected:=false;
 begin perform public.delete_my_account('wrong'); exception when others then rejected:=SQLERRM='CONFIRMATION_REQUIRED'; end;
 if not rejected then raise exception 'Wrong confirmation was accepted'; end if;
 rejected:=false;
 begin perform public.delete_my_account('DELETE'); exception when others then rejected:=SQLERRM='ACTIVE_TRANSACTIONS'; end;
 if not rejected or not exists(select 1 from auth.users where id=a) then raise exception 'Active order protection failed'; end if;
 update public.orders set status='ملغي' where id=oid;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',merchant,'role','authenticated')::text,true);
 rejected:=false;
 begin perform public.delete_my_account('DELETE'); exception when others then rejected:=SQLERRM='BUSINESS_ACCOUNT'; end;
 if not rejected then raise exception 'Business protection failed'; end if;
 perform set_config('request.jwt.claims','{}',true);
 rejected:=false;
 begin perform public.delete_my_account('DELETE'); exception when others then rejected:=SQLERRM='SIGN_IN_REQUIRED'; end;
 if not rejected then raise exception 'Unauthenticated deletion accepted'; end if;
 if has_function_privilege('anon','public.delete_my_account(text)','EXECUTE') then raise exception 'Anonymous grant detected'; end if;
 if not has_function_privilege('authenticated','public.delete_my_account(text)','EXECUTE') then raise exception 'Authenticated grant missing'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 result:=public.delete_my_account('DELETE');
 if result->>'deleted'<>'true' then raise exception 'Deletion did not confirm success'; end if;
 if exists(select 1 from auth.users where id=a) or exists(select 1 from public.customer_profiles where user_id=a)
 or exists(select 1 from public.customer_favorites where user_id=a) or exists(select 1 from public.business_applications where owner_id=a)
 or exists(select 1 from public.daraya_posts where user_id=a) or exists(select 1 from public.daraya_post_reports where post_id=pid)
 then raise exception 'Personal rows remain'; end if;
 if not exists(select 1 from public.orders where id=oid and customer_id is null and phone='' and address='' and area='' and notes=''
 and latitude is null and longitude is null and tracking_token<>token and total=100)
 then raise exception 'Receipt anonymization failed'; end if;
 if not exists(select 1 from auth.users where id=b) or not exists(select 1 from public.customer_profiles where user_id=b and display_name='Other customer')
 or not exists(select 1 from auth.users where id=merchant) then raise exception 'Another user was modified'; end if;
 if (select count(*) from auth.users)<>total_users+2 then raise exception 'Unexpected auth deletion'; end if;
 result:=public.delete_my_account('DELETE');
 if result->>'deleted'<>'true' then raise exception 'Retry failed'; end if;
end; $$;
rollback;
select 'PASS: confirmation, active order, business, anonymous, personal cleanup, receipt anonymization, other users, retry; all fixtures rolled back' as account_deletion_tests;
