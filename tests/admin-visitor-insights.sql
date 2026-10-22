-- Read-only checks; all request-identity settings are rolled back.
begin;
do $$
declare actor uuid; report jsonb; days integer; blocked boolean;
begin
 select user_id into actor from public.platform_admins limit 1;
 if actor is null then raise exception 'An existing admin test principal is required';end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 foreach days in array array[7,30,90] loop
  report:=public.admin_visitor_insights(days);
  assert (report->>'days')::integer=days;
  assert jsonb_array_length(report->'daily')=days;
  assert jsonb_array_length(report->'hours')=24;
  assert (report#>>'{audience,new}')::integer+(report#>>'{audience,returning}')::integer=(report#>>'{current,visitors}')::integer;
  assert report::text not like '%"visitor_id"%' and report::text not like '%"session_id"%';
 end loop;
 assert (public.admin_visitor_insights(999)->>'days')::integer=7;
 assert not has_function_privilege('anon','public.admin_visitor_insights(integer)','EXECUTE');
 assert has_function_privilege('authenticated','public.admin_visitor_insights(integer)','EXECUTE');
 assert not has_table_privilege('authenticated','public.website_visit_sessions','SELECT');
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 blocked:=false;
 begin perform public.admin_visitor_insights(7);exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Non-admin read must be denied';
 perform set_config('request.jwt.claim.sub','',true);
 blocked:=false;
 begin perform public.admin_visitor_insights(7);exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Signed-out read must be denied';
end;
$$;
rollback;
