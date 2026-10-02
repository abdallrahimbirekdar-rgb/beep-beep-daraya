begin;
alter table public.stores add column if not exists deleted_at timestamptz;
grant select(deleted_at) on public.stores to anon,authenticated;
alter table public.stores add constraint deleted_store_inactive check (deleted_at is null or (not active and not is_open));
create or replace function public.guard_store_removal() returns trigger language plpgsql set search_path=public as $$
begin
 if new.deleted_at is distinct from old.deleted_at and auth.role() is not null and not public.is_admin() then raise exception 'حذف المحلات واستعادتها متاح لإدارة المنصة فقط';end if;
 return new;
end;$$;
create trigger guard_store_removal before update on public.stores for each row execute function public.guard_store_removal();
create or replace function public.admin_set_store_deleted(p_store uuid,p_revision integer,p_deleted boolean) returns uuid
language plpgsql security definer set search_path=public as $$
declare s public.stores;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'حذف المحلات واستعادتها متاح لإدارة المنصة فقط';end if;
 if p_deleted is null then raise exception 'اختر الإجراء';end if;
 select * into s from public.stores where id=p_store for update;
 if not found then raise exception 'المحل غير موجود';end if;
 if p_revision is null or s.revision<>p_revision then raise exception 'تغيّرت البيانات. حدّث الصفحة وأعد المحاولة.';end if;
 if p_deleted and exists(select 1 from public.orders where store_id=p_store and status not in ('تم التسليم','ملغي')) then raise exception 'يوجد طلب غير مكتمل لهذا المحل. أكمل الطلبات أو ألغها قبل الحذف.';end if;
 update public.stores set deleted_at=case when p_deleted then now() else null end,active=false,is_open=false where id=p_store;
 return p_store;
end;$$;
revoke all on function public.admin_set_store_deleted(uuid,integer,boolean) from public,anon;
grant execute on function public.admin_set_store_deleted(uuid,integer,boolean) to authenticated;
commit;
