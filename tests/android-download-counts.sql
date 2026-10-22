begin;
do $$
declare before_count bigint;after_count bigint;result jsonb;admin_id uuid;
begin
 assert not has_table_privilege('anon','public.android_download_daily','SELECT');
 assert not has_table_privilege('authenticated','public.android_download_daily','SELECT');
 assert not has_table_privilege('anon','public.android_download_daily','INSERT');
 assert not has_function_privilege('anon','public.admin_android_download_stats()','EXECUTE');
 assert has_function_privilege('anon','public.record_android_download()','EXECUTE');
 assert has_function_privilege('authenticated','public.admin_android_download_stats()','EXECUTE');
 assert (select relrowsecurity from pg_class where oid='public.android_download_daily'::regclass);
 perform set_config('request.jwt.claim.sub','',true);
 select coalesce(sum(requests),0) into before_count from public.android_download_daily;
 perform public.record_android_download();perform public.record_android_download();
 select coalesce(sum(requests),0) into after_count from public.android_download_daily;
 assert after_count=before_count+2,'counter must increment atomically';
 begin perform public.admin_android_download_stats();raise exception 'anonymous report access allowed';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin perform public.admin_android_download_stats();raise exception 'nonadmin report access allowed';exception when insufficient_privilege then null;end;
 select user_id into admin_id from public.platform_admins limit 1;
 assert admin_id is not null;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 result:=public.admin_android_download_stats();assert (result->>'total')::bigint=after_count;
 assert (result->>'today')::bigint>=2;
 perform public.record_android_download();
 assert (select coalesce(sum(requests),0) from public.android_download_daily)=after_count,'exclude admin';
 assert (select count(*) from information_schema.columns where table_schema='public' and table_name='android_download_daily')=2,'no identifiers';
end;$$;
rollback;
