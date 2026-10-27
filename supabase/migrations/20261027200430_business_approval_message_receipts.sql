begin;
set local lock_timeout='3s';
alter table public.business_applications add column if not exists approval_message_read_at timestamptz;
comment on column public.business_applications.approval_message_read_at is 'Applicant acknowledgement of the approved-store welcome message. NULL keeps it visible after approval.';
create index if not exists business_approvals_unread_owner on public.business_applications(owner_id,reviewed_at desc) where status='approved' and approval_message_read_at is null;
create schema if not exists business_application_private;
revoke all on schema business_application_private from public,anon;
grant usage on schema business_application_private to authenticated;
-- The table remains SELECT-only for clients. This narrowly scoped function only
-- marks the caller's own approved application as read; it cannot approve a request.
create or replace function business_application_private.acknowledge_approval(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'سجل الدخول أولًا';end if;
 update public.business_applications set approval_message_read_at=coalesce(approval_message_read_at,clock_timestamp())
 where id=p_id and owner_id=auth.uid() and status='approved' and store_id is not null;
 if not found then raise exception 'رسالة الموافقة غير موجودة أو غير مسموح بالوصول إليها';end if;
 return true;
end;$$;
create or replace function public.acknowledge_business_approval(p_id uuid)
returns boolean language sql security invoker set search_path='' as $$
 select business_application_private.acknowledge_approval(p_id);
$$;
revoke all on function business_application_private.acknowledge_approval(uuid),public.acknowledge_business_approval(uuid) from public,anon,authenticated;
grant execute on function business_application_private.acknowledge_approval(uuid),public.acknowledge_business_approval(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
