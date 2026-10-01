begin;
set local statement_timeout='30s';
insert into public.stores(id,name,category,owner_email,delivery_fee,minimum_order,commission_rate,areas,pickup_enabled) values
('e0000000-0000-4000-8000-000000000001','QA shop A','restaurant','qa-owner@example.invalid',10,100,10,array['QA area'],true),
('e0000000-0000-4000-8000-000000000002','QA shop B','restaurant','qa-other@example.invalid',0,0,0,array['QA area'],true);
insert into public.products(id,store_id,name,price,cost_price,option_groups) values('e0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000001','QA meal',100,40,'[{"id":"extra","name":"Extra","required":true,"multiple":false,"options":[{"id":"cheese","name":"Cheese","price":20},{"id":"large","name":"Large","price":40}]}]');
insert into public.store_ledger(store_id,entry_type,amount,category) values('e0000000-0000-4000-8000-000000000001','expense',30,'QA A'),('e0000000-0000-4000-8000-000000000002','expense',50,'QA B');
do $$ declare r jsonb; o public.orders; s public.stores; blocked boolean:=false; begin
 r:=public.place_order_v3('e0000000-0000-4000-8000-000000000001','QA','0000000000','QA address','QA area','', '[{"id":"e0000000-0000-4000-8000-000000000003","quantity":2,"price":0,"options":[{"group":"extra","id":"cheese"}]}]','delivery');
 select * into o from orders where id=(r->>'id')::uuid;
 if o.total<>250 or o.commission_amount<>24 or o.product_cost_total<>80 then raise exception 'server pricing failed';end if;
 if public.track_order(o.id,gen_random_uuid()) is not null then raise exception 'tracking token failed';end if;
 r:=public.track_order(o.id,o.tracking_token);
 if r is null or r?'phone' or r?'address' or r?'customer_name' or r?'tracking_token' or r?'latitude' then raise exception 'tracking privacy failed';end if;
 begin perform public.place_order_v3('e0000000-0000-4000-8000-000000000001','QA','0000000001','QA address','QA area','', '[{"id":"e0000000-0000-4000-8000-000000000003","quantity":2,"options":[]}]','delivery');exception when others then if sqlerrm='اختر خيارات الوجبة المطلوبة' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'required option bypassed';end if;
 select * into s from stores where id='e0000000-0000-4000-8000-000000000001';s.auto_hours:=true;s.opening_hours:='{"wed":{"closed":false,"open":"20:00","close":"02:00"},"thu":{"closed":true}}';
 if not public.store_accepts_orders(s,'2026-10-01T01:00:00+03:00') or public.store_accepts_orders(s,'2026-10-01T02:00:00+03:00') then raise exception 'overnight hours failed';end if;
 s.is_open:=false;if public.store_accepts_orders(s,'2026-10-01T01:00:00+03:00') then raise exception 'manual pause failed';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e0000000-0000-4000-8000-000000000004","role":"authenticated","email":"qa-owner@example.invalid"}',true);
do $$ declare r jsonb; blocked boolean:=false; begin
 if (select count(*) from store_ledger)<>1 then raise exception 'ledger RLS failed';end if;
 r:=public.merchant_private_data();if jsonb_array_length(r->'stores')<>1 or r->'products'->0->>'cost_price'<>'40' then raise exception 'private cost access failed';end if;
 begin update stores set commission_rate=99 where id='e0000000-0000-4000-8000-000000000001';exception when others then if sqlerrm='ليس لديك صلاحية تغيير صاحب المحل أو التفعيل أو العمولة' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'commission guard failed';end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ declare blocked boolean:=false; begin
 begin perform cost_price from products limit 1;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'anonymous costs exposed';end if;
 if public.track_order('e0000000-0000-4000-8000-000000000001',gen_random_uuid()) is not null then raise exception 'unknown tracking exposed';end if;
end $$;
reset role;
rollback;
select 'passed: pricing, required options, tracking privacy, overnight hours, manual pause, ledger isolation, private costs, commission guard' as growth_validation;
