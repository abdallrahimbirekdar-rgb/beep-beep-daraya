begin;
do $$
declare u uuid:=gen_random_uuid();v uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email) values(u,u::text||'@rls-review.invalid'),(v,v::text||'@rls-review.invalid');
 insert into public.customer_data_requests(user_id,kind,note,admin_reply) values(u,'deletion','Own request','Own reply'),(v,'deletion','Other request','Other reply');
 perform set_config('review.user',u::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
end;$$;
set local role authenticated;
do $$
declare n integer;denied boolean;
begin
 select count(*) into n from public.customer_data_requests;
 if n<>1 then raise exception 'RLS exposes other requests';end if;
 if not exists(select 1 from public.customer_data_requests where admin_reply='Own reply') then raise exception 'Own reply unreadable';end if;
 denied:=false;begin insert into public.customer_data_requests(user_id,kind,note,admin_reply) values(auth.uid(),'deletion','Forged','Forged team reply');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'User forged team reply';end if;
 denied:=false;begin perform public.admin_reply_account_deletion(gen_random_uuid(),'Unauthorized');exception when others then denied:=SQLERRM='ADMIN_REQUIRED';end;
 if not denied then raise exception 'User replied as admin';end if;
 if public.submit_account_deletion_request('Retry')->>'admin_reply'<>'Own reply' then raise exception 'User RPC ignored existing pending request';end if;
end;$$;
reset role;
rollback;
select 'PASS: actual authenticated role sees only its own request and reply, cannot forge replies, and can reuse its own pending request.' as result;