-- Run after the migration, in an isolated transaction. All fixture data rolls back.
begin;
set local statement_timeout='30s';
insert into auth.users(id,email,email_confirmed_at,created_at,updated_at) values
 ('acacacac-1000-4000-8000-000000000001','market-qa-1@example.invalid',now(),now(),now()),
 ('acacacac-1000-4000-8000-000000000002','market-qa-2@example.invalid',now(),now(),now()),
 ('acacacac-1000-4000-8000-000000000003','market-qa-owner@example.invalid',now(),now(),now());
insert into public.stores(id,name,category,owner_email,active,is_open,delivery_fee,minimum_order,areas,pickup_enabled) values('acacacac-2000-4000-8000-000000000001','Stock QA','shop','market-qa-owner@example.invalid',true,true,10,0,array['QA'],true);
select set_config('request.jwt.claims','{"sub":"acacacac-1000-4000-8000-000000000003","role":"authenticated","email":"market-qa-owner@example.invalid"}',true);
set local role authenticated;
select public.save_market_product('{"id":"acacacac-3000-4000-8000-000000000001","store_id":"acacacac-2000-4000-8000-000000000001","name":"QA shirt","description":"QA","price":100,"cost_price":40,"image":"","available":true,"section":"QA","gallery":[],"translations":{},"stock_tracking":true,"option_groups":[{"id":"size","name":"Size","required":true,"multiple":false,"options":[{"id":"m","name":"M","price":0}]}]}',0,'[{"options":[{"group":"size","id":"m"}],"stock":2,"revision":0}]');
reset role;
select set_config('qa.market_product',(select to_jsonb(p)::text from products p where id='acacacac-3000-4000-8000-000000000001'),true);
select set_config('request.jwt.claims','{"sub":"acacacac-1000-4000-8000-000000000001","role":"authenticated","email":"market-qa-1@example.invalid"}',true);
set local role authenticated;
select set_config('qa.market_receipt',public.place_order_v4('acacacac-4000-4000-8000-000000000001','acacacac-2000-4000-8000-000000000001','QA','+963999999991','QA address','QA','', '[{"id":"acacacac-3000-4000-8000-000000000001","quantity":2,"options":[{"group":"size","id":"m"}]}]','delivery')::text,true);
do $$declare receipt jsonb;begin
 receipt:=public.place_order_v4('acacacac-4000-4000-8000-000000000001','acacacac-2000-4000-8000-000000000001','QA','+963999999991','QA address','QA','', '[{"id":"acacacac-3000-4000-8000-000000000001","quantity":2,"options":[{"group":"size","id":"m"}]}]','delivery');
 if receipt<>current_setting('qa.market_receipt')::jsonb then raise exception 'Duplicate request returned a different receipt';end if;
 if (select stock from product_stock where product_id='acacacac-3000-4000-8000-000000000001')<>0 then raise exception 'Stock not reserved exactly once';end if;
 if (public.my_orders()->>'count')::integer<>1 then raise exception 'Duplicate order created';end if;
 insert into customer_data_requests(user_id,kind) values(auth.uid(),'correction');
 begin insert into customer_data_requests(user_id,kind) values('acacacac-1000-4000-8000-000000000002','deletion');raise exception 'Foreign data request accepted';exception when insufficient_privilege then null;end;
end;$$;
reset role;
select set_config('request.jwt.claims','{"sub":"acacacac-1000-4000-8000-000000000002","role":"authenticated","email":"market-qa-2@example.invalid"}',true);
set local role authenticated;
do $$begin
 if exists(select 1 from customer_data_requests) then raise exception 'Foreign privacy request leaked';end if;
 begin perform public.place_order_v4('acacacac-4000-4000-8000-000000000002','acacacac-2000-4000-8000-000000000001','QA','+963999999992','QA address','QA','', '[{"id":"acacacac-3000-4000-8000-000000000001","quantity":1,"options":[{"group":"size","id":"m"}]}]','delivery');raise exception 'Oversold stock';exception when raise_exception then if sqlerrm<>'الكمية أو المقاس المختار لم يعد متوفراً. عدّل السلة وحاول مجدداً.' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claims','{"sub":"acacacac-1000-4000-8000-000000000003","role":"authenticated","email":"market-qa-owner@example.invalid"}',true);
set local role authenticated;
do $$begin
 begin perform public.save_market_product(current_setting('qa.market_product')::jsonb,1,'[{"options":[{"group":"size","id":"m"}],"stock":2,"revision":1}]');raise exception 'Stale stock save accepted';exception when raise_exception then if sqlerrm<>'تغيّر المخزون أثناء التعديل. انسخ بياناتك وحدّث الصفحة قبل الحفظ.' then raise;end if;end;
end;$$;
reset role;
do $$declare old_revision integer;new_revision integer;begin
 select revision into old_revision from products where id='acacacac-3000-4000-8000-000000000001';
 update products set description='New' where id='acacacac-3000-4000-8000-000000000001';
 select revision into new_revision from products where id='acacacac-3000-4000-8000-000000000001';
 if new_revision<>old_revision+1 then raise exception 'Revision not incremented';end if;
 update orders set status='ملغي' where id=(current_setting('qa.market_receipt')::jsonb->>'id')::uuid;
 update orders set notes='QA cancelled' where id=(current_setting('qa.market_receipt')::jsonb->>'id')::uuid;
 if (select stock from product_stock where product_id='acacacac-3000-4000-8000-000000000001')<>2 then raise exception 'Cancellation did not restore stock exactly once';end if;
 if (select count(*) from orders where store_id='acacacac-2000-4000-8000-000000000001')<>1 then raise exception 'Failed order persisted';end if;
end;$$;
set local role authenticated;
do $$begin
 begin perform public.save_market_product(current_setting('qa.market_product')::jsonb,1,'[{"options":[{"group":"size","id":"m"}],"stock":2,"revision":3}]');raise exception 'Stale product save accepted';exception when raise_exception then if sqlerrm<>'تغيّرت البيانات منذ فتح الصفحة. انسخ تعديلاتك ثم حدّث البيانات وأعد المحاولة.' then raise;end if;end;
end;$$;
reset role;
select 'passed: idempotency, stock reservation, overselling rejection, cancellation restoration, revisions, privacy request isolation' as market_validation;
rollback;
