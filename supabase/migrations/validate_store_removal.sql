-- Disposable fixtures only. This entire validation rolls back.
begin;
set local statement_timeout='30s';
do $$
declare sid uuid:=gen_random_uuid();pid uuid:=gen_random_uuid();oid uuid:=gen_random_uuid();aid uuid;rev integer;
begin
 select user_id into aid from public.platform_admins limit 1;
 if aid is null then raise exception 'An admin is required for this validation';end if;
 insert into public.stores(id,name,category,owner_email,online_ordering,delivery_enabled,pickup_enabled) values(sid,'Removal validation','shop','removal-qa@example.invalid',false,false,false);
 insert into public.products(id,store_id,name,price) values(pid,sid,'QA product',1);
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.admin_set_store_deleted(sid,0,true);raise exception 'Unauthenticated deletion accepted';exception when raise_exception then if sqlerrm<>'حذف المحلات واستعادتها متاح لإدارة المنصة فقط' then raise;end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 begin perform public.admin_set_store_deleted(sid,0,true);raise exception 'Non-admin deletion accepted';exception when raise_exception then if sqlerrm<>'حذف المحلات واستعادتها متاح لإدارة المنصة فقط' then raise;end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',aid,'role','authenticated')::text,true);
 insert into public.orders(id,store_id,customer_name,phone,address,area,items,subtotal,delivery_fee,total,status)
 values(oid,sid,'QA','+963999999991','QA','QA',jsonb_build_array(jsonb_build_object('id',pid,'quantity',1,'options','[]'::jsonb)),1,0,1,'جديد');
 select revision into rev from public.stores where id=sid;
 begin perform public.admin_set_store_deleted(sid,rev,true);raise exception 'Pending-order deletion accepted';exception when raise_exception then if sqlerrm<>'يوجد طلب غير مكتمل لهذا المحل. أكمل الطلبات أو ألغها قبل الحذف.' then raise;end if;end;
 update public.orders set status='ملغي' where id=oid;
 perform public.admin_set_store_deleted(sid,rev,true);
 if not exists(select 1 from public.stores where id=sid and deleted_at is not null and not active and not is_open) then raise exception 'Store not archived safely';end if;
 if not exists(select 1 from public.products where id=pid) or not exists(select 1 from public.orders where id=oid) then raise exception 'History was deleted';end if;
 begin perform public.admin_set_store_deleted(sid,rev,false);raise exception 'Stale restore accepted';exception when raise_exception then if sqlerrm<>'تغيّرت البيانات. حدّث الصفحة وأعد المحاولة.' then raise;end if;end;
 select revision into rev from public.stores where id=sid;
 perform public.admin_set_store_deleted(sid,rev,false);
 if not exists(select 1 from public.stores where id=sid and deleted_at is null and not active and not is_open) then raise exception 'Restore published the store';end if;
end;$$;
select 'Passed: admin-only deletion, pending-order guard, preserved history, stale revision and inactive restore' as validation;
rollback;
