begin;
do $$
declare owner_id uuid:=gen_random_uuid();other_id uuid:=gen_random_uuid();admin_id uuid:=gen_random_uuid();
 mine_id uuid:=gen_random_uuid();foreign_id uuid:=gen_random_uuid();stale_id uuid:=gen_random_uuid();linked_id uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();
 pending_id uuid:=gen_random_uuid();publishing_id uuid:=gen_random_uuid();approved_id uuid:=gen_random_uuid();needs_id uuid:=gen_random_uuid();denied boolean;rid uuid;
begin
 insert into auth.users(id,email) values(owner_id,owner_id||'@test.invalid'),(other_id,other_id||'@test.invalid'),(admin_id,admin_id||'@test.invalid');
 insert into public.platform_admins(user_id) values(admin_id);
 insert into public.stores(id,name,category,owner_email,active,is_open,online_ordering,delivery_enabled,pickup_enabled)
 values(sid,'__unfinished_request_rollback_test__','shop',owner_id||'@test.invalid',false,false,false,false,false);
 insert into public.business_applications(id,owner_id,status,name,store_id) values
 (mine_id,owner_id,'draft','__draft_test__',null),(foreign_id,other_id,'draft','__foreign_test__',null),
 (stale_id,owner_id,'draft','__stale_test__',null),(linked_id,owner_id,'draft','__linked_test__',sid),
 (pending_id,owner_id,'pending','__pending_test__',null),(publishing_id,owner_id,'publishing','__publishing_test__',null),
 (approved_id,owner_id,'approved','__approved_test__',null),(needs_id,other_id,'needs_changes','__needs_test__',null);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 perform public.delete_unfinished_business_application(mine_id,1);
 denied:=false;begin perform public.delete_unfinished_business_application(foreign_id,1);exception when others then denied:=true;end;if not denied then raise exception 'another owner request was deletable';end if;
 denied:=false;begin perform public.delete_unfinished_business_application(stale_id,0);exception when others then denied:=true;end;if not denied then raise exception 'stale revision was accepted';end if;
 denied:=false;begin perform public.delete_unfinished_business_application(stale_id,null);exception when others then denied:=true;end;if not denied then raise exception 'null revision was accepted';end if;
 foreach rid in array array[pending_id,publishing_id,approved_id] loop
  denied:=false;begin perform public.delete_unfinished_business_application(rid,1);exception when others then denied:=true;end;if not denied then raise exception 'completed or active request was deletable';end if;
 end loop;
 perform public.delete_unfinished_business_application(linked_id,1);
 execute 'reset role';
 if exists(select 1 from public.business_applications where id in (mine_id,linked_id)) then raise exception 'draft deletion failed';end if;
 if not exists(select 1 from public.stores where id=sid) then raise exception 'linked shop was deleted';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 perform public.delete_unfinished_business_application(needs_id,1);
 execute 'reset role';
 if exists(select 1 from public.business_applications where id=needs_id) then raise exception 'admin could not remove unfinished request';end if;
 if (select count(*) from public.business_applications where id in (foreign_id,stale_id,pending_id,publishing_id,approved_id))<>5 then raise exception 'protected request changed';end if;
 perform set_config('request.jwt.claims','{}',true);execute 'set local role anon';
 denied:=false;begin perform public.delete_unfinished_business_application(stale_id,1);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'anonymous execution allowed';end if;
 execute 'reset role';
 if has_table_privilege('authenticated','public.business_applications','DELETE') then raise exception 'raw table delete granted';end if;
end $$;
rollback;
