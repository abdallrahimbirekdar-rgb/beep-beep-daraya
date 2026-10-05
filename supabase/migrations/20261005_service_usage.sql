-- Read-only, administrator-only measurements. No account secrets needed.
create or replace function public.admin_service_usage()
returns jsonb language plpgsql security definer set search_path = public, pg_catalog
as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 select jsonb_build_object(
  'measured_at',now(),
  'database_bytes',pg_database_size(current_database()),
  'storage_bytes',(select coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::numeric else 0 end),0) from storage.objects),
  'storage_objects',(select count(*) from storage.objects),
  'registered_users',(select count(*) from auth.users),
  'storage_source','object_metadata'
 ) into result;
 return result;
end;
$$;
revoke all on function public.admin_service_usage() from public, anon;
grant execute on function public.admin_service_usage() to authenticated;
