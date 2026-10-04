-- Isolated fixtures are rolled back; no real accounts or orders are changed.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('f1000000-0000-0000-0000-000000000001','driver-test-owner@example.invalid',now(),'{}','{}'),
('f1000000-0000-0000-0000-000000000002','driver-test-one@example.invalid',now(),'{}','{}'),
('f1000000-0000-0000-0000-000000000003','driver-test-two@example.invalid',now(),'{}','{}'),
('f1000000-0000-0000-0000-000000000004','driver-test-unverified@example.invalid',null,'{}','{}');
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000001","email":"driver-test-owner@example.invalid","role":"authenticated"}',true);
insert into public.stores(id,name,category,owner_email,address,delivery_enabled,pickup_enabled) values
('f2000000-0000-0000-0000-000000000001','اختبار المندوبين','shop','driver-test-owner@example.invalid','عنوان اختباري',true,true),
('f2000000-0000-0000-0000-000000000002','اختبار المتجر الثاني','shop','driver-test-owner@example.invalid','عنوان اختباري',true,true);
insert into public.orders(id,store_id,customer_name,phone,address,area,items,subtotal,delivery_fee,total,status,created_at) values
('f3000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000001','اختبار','0000000000','عنوان اختباري','منطقة','[]',100,10,110,'قيد التحضير',now()-interval '1 day'),
('f3000000-0000-0000-0000-000000000002','f2000000-0000-0000-0000-000000000001','اختبار','0000000000','عنوان اختباري','منطقة','[]',100,10,110,'قيد التحضير',now()-interval '2 days');
do $$ declare d uuid;begin
 d:=public.add_store_driver('f2000000-0000-0000-0000-000000000001','مندوب أول','0000000000','driver-test-one@example.invalid');perform set_config('test.driver1',d::text,true);
 d:=public.add_store_driver('f2000000-0000-0000-0000-000000000001','مندوب ثان','0000000000','driver-test-two@example.invalid');perform set_config('test.driver2',d::text,true);
 d:=public.add_store_driver('f2000000-0000-0000-0000-000000000002','مندوب متجر آخر','0000000000','driver-test-one@example.invalid');perform set_config('test.otherdriver',d::text,true);
 d:=public.add_store_driver('f2000000-0000-0000-0000-000000000001','غير مؤكد','0000000000','driver-test-unverified@example.invalid');perform set_config('test.unverified',d::text,true);
 perform set_config('test.token1',(select invite_token::text from public.store_drivers where id=current_setting('test.driver1')::uuid),true);
 perform set_config('test.token2',(select invite_token::text from public.store_drivers where id=current_setting('test.driver2')::uuid),true);
 perform set_config('test.unverifiedtoken',(select invite_token::text from public.store_drivers where id=current_setting('test.unverified')::uuid),true);
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000002","email":"driver-test-one@example.invalid","role":"authenticated"}',true);
do $$ declare rejected boolean:=false;begin
 begin perform public.accept_driver_invite(current_setting('test.token2')::uuid);exception when others then rejected:=true;end;
 if not rejected then raise exception 'Wrong-email invitation accepted';end if;
 perform public.accept_driver_invite(current_setting('test.token1')::uuid);
 if jsonb_array_length(public.my_driver_memberships())<>1 then raise exception 'Membership not linked';end if;
 if exists(select 1 from public.store_drivers) then raise exception 'Driver can read merchant roster';end if;
 if exists(select 1 from public.orders) then raise exception 'Driver can read merchant orders';end if;
 rejected:=false;begin perform public.add_store_driver('f2000000-0000-0000-0000-000000000001','غير مسموح','','intruder@example.invalid');exception when others then rejected:=true;end;
 if not rejected then raise exception 'Driver can manage roster';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000004","email":"driver-test-unverified@example.invalid","role":"authenticated"}',true);
do $$ declare rejected boolean:=false;begin
 begin perform public.accept_driver_invite(current_setting('test.unverifiedtoken')::uuid);exception when others then rejected:=true;end;
 if not rejected then raise exception 'Unverified invitation accepted';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000003","email":"driver-test-two@example.invalid","role":"authenticated"}',true);
select public.accept_driver_invite(current_setting('test.token2')::uuid);
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000001","email":"driver-test-owner@example.invalid","role":"authenticated"}',true);
do $$ declare rejected boolean:=false;begin
 begin perform public.assign_order_driver('f3000000-0000-0000-0000-000000000001',current_setting('test.otherdriver')::uuid);exception when others then rejected:=true;end;
 if not rejected then raise exception 'Wrong-store assignment accepted';end if;
 perform public.assign_order_driver('f3000000-0000-0000-0000-000000000001',current_setting('test.driver1')::uuid);
 perform public.assign_order_driver('f3000000-0000-0000-0000-000000000002',current_setting('test.driver2')::uuid);
 rejected:=false;begin perform public.assign_order_driver('f3000000-0000-0000-0000-000000000001',null,null);exception when others then rejected:=true;end;
 if not rejected then raise exception 'Stale assignment accepted';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000002","email":"driver-test-one@example.invalid","role":"authenticated"}',true);
do $$ declare rejected boolean:=false;data jsonb;begin
 data:=public.my_driver_orders();if jsonb_array_length(data)<>1 or data->0->>'id'<>'f3000000-0000-0000-0000-000000000001' then raise exception 'Assigned-order isolation failed';end if;
 if data->0 ? 'customer_id' or data->0 ? 'tracking_token' then raise exception 'Private order fields exposed';end if;
 begin perform public.driver_set_order_status('f3000000-0000-0000-0000-000000000002','في الطريق');exception when others then rejected:=true;end;
 if not rejected then raise exception 'Other driver order changed';end if;
 rejected:=false;begin perform public.driver_set_order_status('f3000000-0000-0000-0000-000000000001','تم التسليم');exception when others then rejected:=true;end;
 if not rejected then raise exception 'Delivery skipped in-transit';end if;
 perform public.driver_set_order_status('f3000000-0000-0000-0000-000000000001','في الطريق');
 if public.my_driver_orders()->0->>'status'<>'في الطريق' then raise exception 'Start delivery failed';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000001","email":"driver-test-owner@example.invalid","role":"authenticated"}',true);
select public.set_store_driver_active(current_setting('test.driver1')::uuid,false);
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000002","email":"driver-test-one@example.invalid","role":"authenticated"}',true);
do $$ declare rejected boolean:=false;begin
 if public.my_driver_orders()<>'[]'::jsonb then raise exception 'Suspended driver sees orders';end if;
 begin perform public.driver_set_order_status('f3000000-0000-0000-0000-000000000001','تم التسليم');exception when others then rejected:=true;end;
 if not rejected then raise exception 'Suspended driver updates orders';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000001","email":"driver-test-owner@example.invalid","role":"authenticated"}',true);
select public.set_store_driver_active(current_setting('test.driver1')::uuid,true);
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000002","email":"driver-test-one@example.invalid","role":"authenticated"}',true);
select public.driver_set_order_status('f3000000-0000-0000-0000-000000000001','تم التسليم');
do $$ begin
 if public.my_driver_orders()->0->>'status'<>'تم التسليم' then raise exception 'Delivery completion failed';end if;
 if has_function_privilege('anon','public.my_driver_orders()','EXECUTE') then raise exception 'Anonymous driver access allowed';end if;
 if has_table_privilege('authenticated','public.orders','UPDATE') then raise exception 'Direct order updates allowed';end if;
end $$;
reset role;
-- Platform/GPS fixtures, still inside the rollback-only transaction.
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values('f1000000-0000-0000-0000-000000000005','driver-test-admin@example.invalid',now(),'{}','{}');
insert into public.platform_admins(user_id) values('f1000000-0000-0000-0000-000000000005');
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000001","email":"driver-test-owner@example.invalid","role":"authenticated"}',true);
insert into public.orders(id,store_id,customer_name,phone,address,area,items,subtotal,delivery_fee,total,status,created_at) values('f3000000-0000-0000-0000-000000000003','f2000000-0000-0000-0000-000000000002','اختبار','0000000000','عنوان اختباري','منطقة','[]',100,10,110,'قيد التحضير',now()-interval '3 days');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000005","email":"driver-test-admin@example.invalid","role":"authenticated"}',true);
do $$ declare d uuid;begin
 d:=public.add_store_driver(null,'مندوب الموقع','0000000000','driver-test-two@example.invalid');perform set_config('test.platformdriver',d::text,true);
 perform set_config('test.platformtoken',(select invite_token::text from public.store_drivers where id=d),true);
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000003","email":"driver-test-two@example.invalid","role":"authenticated"}',true);
select public.accept_driver_invite(current_setting('test.platformtoken')::uuid);
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000005","email":"driver-test-admin@example.invalid","role":"authenticated"}',true);
select public.assign_order_driver('f3000000-0000-0000-0000-000000000002',current_setting('test.platformdriver')::uuid,current_setting('test.driver2')::uuid);
select public.assign_order_driver('f3000000-0000-0000-0000-000000000003',current_setting('test.platformdriver')::uuid);
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000001","email":"driver-test-owner@example.invalid","role":"authenticated"}',true);
do $$ declare denied boolean;begin
 denied:=false;begin perform public.add_store_driver(null,'غير مسموح','','blocked@example.invalid');exception when others then denied:=true;end;if not denied then raise exception 'Merchant created platform driver';end if;
 denied:=false;begin perform public.assign_order_driver('f3000000-0000-0000-0000-000000000002',null,current_setting('test.platformdriver')::uuid);exception when others then denied:=true;end;if not denied then raise exception 'Merchant changed platform assignment';end if;
 denied:=false;begin perform public.set_store_driver_active(current_setting('test.platformdriver')::uuid,false);exception when others then denied:=true;end;if not denied then raise exception 'Merchant suspended platform driver';end if;
 if exists(select 1 from public.store_drivers where store_id is null) then raise exception 'Platform roster exposed to merchant';end if;
 if not exists(select 1 from jsonb_array_elements(public.managed_order_driver_summaries()) x where x->>'driver_type'='platform') then raise exception 'Assigned platform name missing';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000003","email":"driver-test-two@example.invalid","role":"authenticated"}',true);
do $$ declare denied boolean:=false;begin
 if jsonb_array_length(public.my_driver_orders())<>2 then raise exception 'Platform cross-store assignment failed';end if;
 begin perform public.update_driver_location('f3000000-0000-0000-0000-000000000003',0,0,25);exception when others then denied:=true;end;if not denied then raise exception 'GPS shared before departure';end if;
 perform public.driver_set_order_status('f3000000-0000-0000-0000-000000000002','في الطريق');
 perform public.update_driver_location('f3000000-0000-0000-0000-000000000002',0,0,25);
 denied:=false;begin perform public.update_driver_location('f3000000-0000-0000-0000-000000000002',1000,0,25);exception when others then denied:=true;end;if not denied then raise exception 'Invalid GPS accepted';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000001","email":"driver-test-owner@example.invalid","role":"authenticated"}',true);
do $$ declare point jsonb;begin
 point:=public.order_driver_location('f3000000-0000-0000-0000-000000000002');if point is null or point->>'driver_type'<>'platform' or (point->>'latitude')::numeric<>0 then raise exception 'Customer location missing';end if;
 if point ? 'email' or point ? 'user_id' or point ? 'invite_token' then raise exception 'Driver private fields exposed';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000002","email":"driver-test-one@example.invalid","role":"authenticated"}',true);
do $$ declare denied boolean:=false;begin
 begin perform public.order_driver_location('f3000000-0000-0000-0000-000000000002');exception when others then denied:=true;end;if not denied then raise exception 'Unrelated customer sees GPS';end if;
 denied:=false;begin perform public.update_driver_location('f3000000-0000-0000-0000-000000000002',0,0,25);exception when others then denied:=true;end;if not denied then raise exception 'Unassigned driver spoofed GPS';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000003","email":"driver-test-two@example.invalid","role":"authenticated"}',true);
select public.stop_driver_location('f3000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000001","email":"driver-test-owner@example.invalid","role":"authenticated"}',true);
do $$ begin if public.order_driver_location('f3000000-0000-0000-0000-000000000002') is not null then raise exception 'Stopped GPS exposed';end if;end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000003","email":"driver-test-two@example.invalid","role":"authenticated"}',true);
select public.update_driver_location('f3000000-0000-0000-0000-000000000002',0,0,25);
reset role;
update public.order_driver_locations set updated_at=now()-interval '6 minutes' where order_id='f3000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000001","email":"driver-test-owner@example.invalid","role":"authenticated"}',true);
do $$ begin if public.order_driver_location('f3000000-0000-0000-0000-000000000002') is not null then raise exception 'Expired GPS exposed';end if;end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000003","email":"driver-test-two@example.invalid","role":"authenticated"}',true);
select public.update_driver_location('f3000000-0000-0000-0000-000000000002',0,0,25);
select public.driver_set_order_status('f3000000-0000-0000-0000-000000000002','تم التسليم');
select set_config('request.jwt.claims','{"sub":"f1000000-0000-0000-0000-000000000001","email":"driver-test-owner@example.invalid","role":"authenticated"}',true);
do $$ begin
 if public.order_driver_location('f3000000-0000-0000-0000-000000000002') is not null then raise exception 'GPS exposed after delivery';end if;
 if has_table_privilege('authenticated','public.order_driver_locations','SELECT') or has_function_privilege('anon','public.order_driver_location(uuid)','EXECUTE') then raise exception 'Public GPS access allowed';end if;
end $$;
reset role;
rollback;
select true as platform_and_gps_security_checks_passed;
