-- Exercise policies as real API roles. No live drafts are created; all test rows roll back.
begin;
set local statement_timeout='20s';
do $$declare a uuid:=gen_random_uuid(); u uuid:=gen_random_uuid();begin
 insert into auth.users(id,email,email_confirmed_at) values(a,a::text||'@fb-studio-test.invalid',now()),(u,u::text||'@fb-studio-test.invalid',now());
 insert into public.platform_admins(user_id) values(a);
 perform set_config('fb.test_admin',a::text,true);perform set_config('fb.test_user',u::text,true);
end;$$;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('fb.test_admin'),'role','authenticated')::text,true);
do $$declare r public.facebook_studio_drafts; changed integer;begin
 insert into public.facebook_studio_drafts(source_kind,title,body,planned_at) values('shop','Temporary planning test','Public test text',now()+interval '1 day') returning * into r;
 perform set_config('fb.test_draft',r.id::text,true);
 if r.created_by is distinct from auth.uid() then raise exception 'Creator default failed';end if;
 update public.facebook_studio_drafts set status='ready',title='Updated test' where id=r.id and revision=1;
 if not exists(select 1 from public.facebook_studio_drafts where id=r.id and revision=2 and status='ready') then raise exception 'Admin edit failed';end if;
 update public.facebook_studio_drafts set title='Stale edit' where id=r.id and revision=1;get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Concurrent edit overwrote newer draft';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('fb.test_user'),'role','authenticated')::text,true);
do $$declare changed integer; denied boolean:=false;begin
 if exists(select 1 from public.facebook_studio_drafts) then raise exception 'Visitor can read admin drafts';end if;
 begin insert into public.facebook_studio_drafts(source_kind,title,body) values('shop','Forbidden','Forbidden');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Visitor can insert drafts';end if;
 update public.facebook_studio_drafts set title='Forbidden edit' where id=current_setting('fb.test_draft')::uuid;get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Visitor can change draft';end if;
end;$$;
reset role;
set local role anon;
do $$declare denied boolean:=false;begin
 begin perform count(*) from public.facebook_studio_drafts;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Guest can access drafts';end if;
end;$$;
reset role;
rollback;
select 'PASS: admin draft save, versioned update, stale edit protection, visitor isolation and guest denial. All test data rolled back.' result;
