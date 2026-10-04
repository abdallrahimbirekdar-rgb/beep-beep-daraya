begin;
insert into auth.users(id,email,raw_app_meta_data) values
('c1000000-0000-4000-8000-000000000001','code-owner@example.invalid','{}'),
('c1000000-0000-4000-8000-000000000002','code-other@example.invalid','{}'),
('c1000000-0000-4000-8000-000000000003',repeat('a',64)||'@driver.damascus-shop.invalid','{"driver_code_only":true}'),
('c1000000-0000-4000-8000-000000000004',repeat('b',64)||'@driver.damascus-shop.invalid','{"driver_code_only":true}');
insert into stores(id,name,category,owner_email,active,is_open,delivery_fee,minimum_order,areas,pickup_enabled) values('c2000000-0000-4000-8000-000000000001','Code QA','shop','code-owner@example.invalid',true,true,0,0,array['QA'],true);
do $$
begin
 if has_function_privilege('anon','public.provision_driver_code(uuid,uuid,uuid,uuid,text,text,text,uuid)','execute') or has_function_privilege('authenticated','public.provision_driver_code(uuid,uuid,uuid,uuid,text,text,text,uuid)','execute') then raise exception 'public binding access';end if;
 if not has_function_privilege('service_role','public.provision_driver_code(uuid,uuid,uuid,uuid,text,text,text,uuid)','execute') then raise exception 'service missing';end if;
 begin
 perform provision_driver_code('c1000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000003','D','0999',repeat('a',64)||'@driver.damascus-shop.invalid');
 raise exception 'unauthorized allowed';exception when others then if sqlerrm='unauthorized allowed' then raise;end if;end;
 perform provision_driver_code('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000003','D','0999',repeat('a',64)||'@driver.damascus-shop.invalid');
 if not exists(select 1 from store_drivers where id='c3000000-0000-4000-8000-000000000001' and user_id='c1000000-0000-4000-8000-000000000003') then raise exception 'binding failed';end if;
 begin
 perform provision_driver_code('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000004','D','0999',repeat('b',64)||'@driver.damascus-shop.invalid',null);
 raise exception 'stale rotation allowed';exception when others then if sqlerrm='stale rotation allowed' then raise;end if;end;
 perform provision_driver_code('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000004','D','0999',repeat('b',64)||'@driver.damascus-shop.invalid','c1000000-0000-4000-8000-000000000003');
 if exists(select 1 from store_drivers where id='c3000000-0000-4000-8000-000000000001' and user_id='c1000000-0000-4000-8000-000000000003') then raise exception 'old driver retains access';end if;
 update store_drivers set active=false where id='c3000000-0000-4000-8000-000000000001';
 begin
 perform provision_driver_code('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000003','D','0999',repeat('a',64)||'@driver.damascus-shop.invalid','c1000000-0000-4000-8000-000000000004');
 raise exception 'inactive rotation allowed';exception when others then if sqlerrm='inactive rotation allowed' then raise;end if;end;
end $$;
select true as driver_code_security_checks_passed;
rollback;
