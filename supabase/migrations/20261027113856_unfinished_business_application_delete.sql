begin;
create schema if not exists business_application_private;
revoke all on schema business_application_private from public,anon;
grant usage on schema business_application_private to authenticated;
create or replace function business_application_private.delete_unfinished(p_id uuid,p_revision integer)
returns void language plpgsql security definer set search_path='' as $$
declare a public.business_applications;
begin
 if auth.uid() is null then raise exception 'سجل الدخول أولاً';end if;
 select * into a from public.business_applications
 where id=p_id and (owner_id=auth.uid() or public.is_admin()) for update;
 if not found then raise exception 'الطلب غير موجود أو غير مسموح بحذفه';end if;
 if a.status not in ('draft','needs_changes') then raise exception 'يمكن حذف الطلب غير المكتمل فقط. لا يمكن حذف طلب قيد المعاينة أو معتمد.';end if;
 if p_revision is null or a.revision<>p_revision then raise exception 'تغير الطلب. حدّث القائمة قبل الحذف.';end if;
 -- Only the application is deleted. Never remove a linked shop or its files here.
 delete from public.business_applications where id=a.id;
end;$$;
create or replace function public.delete_unfinished_business_application(p_id uuid,p_revision integer)
returns void language sql security invoker set search_path='' as $$
 select business_application_private.delete_unfinished(p_id,p_revision);
$$;
revoke all on function business_application_private.delete_unfinished(uuid,integer),public.delete_unfinished_business_application(uuid,integer) from public,anon,authenticated;
grant execute on function business_application_private.delete_unfinished(uuid,integer),public.delete_unfinished_business_application(uuid,integer) to authenticated;
commit;
