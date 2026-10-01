rollback;
begin;
set local statement_timeout='30s';
insert into auth.users(id,email,email_confirmed_at,created_at,updated_at) values('babababa-1000-4000-8000-000000000001','customer-qa-1@example.invalid',now(),now(),now()),('babababa-1000-4000-8000-000000000002','customer-qa-2@example.invalid',now(),now(),now()),('babababa-1000-4000-8000-000000000003','customer-qa-3@example.invalid',null,now(),now());
insert into public.stores(id,name,category,owner_email,active,is_open,delivery_fee,minimum_order,areas,pickup_enabled) values('babababa-2000-4000-8000-000000000001','Customer QA','restaurant','merchant-qa@example.invalid',true,true,10,0,array['QA'],true);
insert into public.products(id,store_id,name,price,cost_price) values('babababa-3000-4000-8000-000000000001','babababa-2000-4000-8000-000000000001','QA product',100,40);
select set_config('request.jwt.claims','{"sub":"babababa-1000-4000-8000-000000000001","role":"authenticated","email":"customer-qa-1@example.invalid"}',true);
set local role authenticated;
insert into public.customer_profiles(user_id,display_name,phone,address) values(auth.uid(),'QA first','0999999991','QA address');
insert into public.customer_favorites(user_id,store_id) values(auth.uid(),'babababa-2000-4000-8000-000000000001');
select set_config('qa.receipt',(public.place_order_v3('babababa-2000-4000-8000-000000000001','QA','0999999991','QA address','QA','', '[{"id":"babababa-3000-4000-8000-000000000001","quantity":2}]','delivery'))::text,true);
do $$declare result jsonb;receipt jsonb;begin
 result:=public.my_orders();if (result->>'count')::integer<>1 then raise exception 'History attribution failed';end if;
 receipt:=public.my_order((current_setting('qa.receipt')::jsonb->>'id')::uuid);
 if (receipt->>'total')::integer<>210 or receipt?'product_cost_total' or receipt?'commission_amount' then raise exception 'Receipt totals/privacy failed';end if;
 if public.track_order((receipt->>'id')::uuid,(receipt->>'token')::uuid) is null then raise exception 'Own tracking failed';end if;
 if exists(select 1 from public.orders) then raise exception 'Customer gained merchant order table access';end if;
 begin insert into public.customer_profiles(user_id,display_name) values('babababa-1000-4000-8000-000000000002','Other');raise exception 'Foreign profile insert accepted';exception when insufficient_privilege then null;end;
end;$$;
reset role;
select set_config('request.jwt.claims','{"sub":"babababa-1000-4000-8000-000000000002","role":"authenticated","email":"customer-qa-2@example.invalid"}',true);
set local role authenticated;
do $$declare receipt jsonb:=current_setting('qa.receipt')::jsonb;begin
 if (public.my_orders()->>'count')::integer<>0 then raise exception 'Foreign order history leaked';end if;
 if public.my_order((receipt->>'id')::uuid) is not null or public.track_order((receipt->>'id')::uuid,(receipt->>'token')::uuid) is not null then raise exception 'Foreign receipt/tracking leaked';end if;
 if exists(select 1 from public.customer_profiles) or exists(select 1 from public.customer_favorites) then raise exception 'Foreign profile/favorites leaked';end if;
end;$$;
reset role;
select set_config('request.jwt.claims','{"sub":"babababa-1000-4000-8000-000000000003","role":"authenticated","email":"customer-qa-3@example.invalid"}',true);
set local role authenticated;
do $$begin
 begin perform public.place_order_v3('babababa-2000-4000-8000-000000000001','QA','0999999993','QA address','QA','', '[{"id":"babababa-3000-4000-8000-000000000001","quantity":1}]','delivery');raise exception 'Unconfirmed order accepted';exception when raise_exception then if sqlerrm<>'أكد بريدك الإلكتروني أولاً' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$begin
 if has_function_privilege(current_user,'public.place_order_v3(uuid,text,text,text,text,text,jsonb,text,numeric,numeric)','execute') or has_function_privilege(current_user,'public.place_order_v2(uuid,text,text,text,text,text,jsonb,text)','execute') or has_function_privilege(current_user,'public.place_order(uuid,text,text,text,text,text,jsonb)','execute') then raise exception 'Guest order API is executable';end if;
 if has_function_privilege(current_user,'public.my_orders(integer,integer,text,date,date)','execute') then raise exception 'Guest history API is executable';end if;
end;$$;
reset role;
select 'passed: required confirmed account, order attribution, receipt totals, customer isolation, no merchant financial access, legacy APIs blocked for guests' as customer_validation;
rollback;
