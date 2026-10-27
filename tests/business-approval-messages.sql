begin;
do $$
declare owner_uid uuid:=gen_random_uuid(); other_uid uuid:=gen_random_uuid(); app_id uuid:=gen_random_uuid(); pending_id uuid:=gen_random_uuid(); store_id uuid:=gen_random_uuid(); recorded timestamptz;
begin
 insert into auth.users(id,email) values(owner_uid,owner_uid||'@approval-test.invalid'),(other_uid,other_uid||'@approval-test.invalid');
 insert into public.stores(id,name,category,owner_email,active,online_ordering) values(store_id,'QA approval','shop',owner_uid||'@approval-test.invalid',false,false);
 insert into public.business_applications(id,owner_id,name,store_id,status) values(app_id,owner_uid,'QA approval',store_id,'publishing'),(pending_id,owner_uid,'QA pending',null,'pending');
 if (select approval_message_read_at from public.business_applications where id=app_id) is not null then raise exception 'Approval message starts read';end if;
 insert into public.platform_admins(user_id) values(other_uid);
 perform set_config('request.jwt.claim.sub',other_uid::text,true);
 perform public.finish_business_application_approval(app_id,'https://example.com/approval-fixture.webp');
 if not exists(select 1 from public.business_applications where id=app_id and status='approved' and approval_message_read_at is null) then raise exception 'Approval did not create an unread welcome message';end if;
 begin perform public.acknowledge_business_approval(app_id);raise exception 'Foreign owner acknowledged message';exception when raise_exception then if sqlerrm='Foreign owner acknowledged message' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',owner_uid::text,true);
 begin perform public.acknowledge_business_approval(pending_id);raise exception 'Pending request accepted';exception when raise_exception then if sqlerrm='Pending request accepted' then raise;end if;end;
 if not public.acknowledge_business_approval(app_id) then raise exception 'Owner acknowledgement failed';end if;
 select approval_message_read_at into recorded from public.business_applications where id=app_id;
 if recorded is null then raise exception 'Read timestamp missing';end if;
 perform public.acknowledge_business_approval(app_id);
 if (select approval_message_read_at from public.business_applications where id=app_id) is distinct from recorded then raise exception 'Repeat acknowledgement changed timestamp';end if;
 if (select status from public.business_applications where id=pending_id)<>'pending' then raise exception 'Acknowledgement changed request status';end if;
 if has_table_privilege('authenticated','public.business_applications','UPDATE') then raise exception 'Client has broad table UPDATE';end if;
 if has_function_privilege('anon','public.acknowledge_business_approval(uuid)','EXECUTE') then raise exception 'Anonymous acknowledgement exposed';end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.acknowledge_business_approval(app_id);raise exception 'No user accepted';exception when raise_exception then if sqlerrm='No user accepted' then raise;end if;end;
end;$$;
rollback;
