-- Only installs tools. Does not modify existing accounts, files, shops or orders.
create table if not exists public.account_deletion_actions (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null, target_id uuid not null,
 action text not null, resource_id uuid not null, destination_id uuid, created_at timestamptz not null default now()
);
alter table public.account_deletion_actions enable row level security;
revoke all on public.account_deletion_actions from public,anon,authenticated;
grant select on public.account_deletion_actions to authenticated;
create policy deletion_actions_admin_read on public.account_deletion_actions for select to authenticated using ((select public.is_admin()));

create or replace function daraya_private.admin_deletion_details(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; result jsonb;
begin
 s:=daraya_private.admin_deletion_state(p_user);
 select jsonb_build_object(
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'shop',st.name,'status',o.status,'driver_order',o.customer_id is distinct from p_user)) from public.orders o left join public.stores st on st.id=o.store_id where o.status not in ('تم التسليم','ملغي') and (o.store_id in(select id from public.stores where lower(owner_email)=lower((select email from auth.users where id=p_user))) or o.customer_id=p_user or o.driver_id in(select id from public.store_drivers where user_id=p_user or lower(email)=lower((select email from auth.users where id=p_user))))),'[]'),
 'bookings',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'shop',st.name,'status',b.status)) from public.service_bookings b left join public.stores st on st.id=b.store_id where (b.user_id=p_user or b.store_id in(select id from public.stores where lower(owner_email)=lower((select email from auth.users where id=p_user)))) and b.status in ('new','accepted')),'[]'),
 'drivers',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'shop',st.name)) from public.store_drivers d left join public.stores st on st.id=d.store_id where d.user_id=p_user or lower(d.email)=lower((select email from auth.users where id=p_user))),'[]'),
 'applications',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'store_id',store_id)) from public.business_applications where owner_id=p_user and store_id is not null),'[]'),
 'files',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'bucket',o.bucket_id,'name',o.name,'referenced',
 exists(select 1 from public.stores st where st.deleted_at is null and position(o.name in concat(st.image,' ',st.translations::text))>0)
 or exists(select 1 from public.products pr join public.stores ps on ps.id=pr.store_id where ps.deleted_at is null and position(o.name in concat(pr.image,' ',pr.gallery::text,' ',pr.translations::text))>0)
 or exists(select 1 from public.store_page_photos ph join public.stores fs on fs.id=ph.store_id where fs.deleted_at is null and position(o.name in ph.image)>0))) from storage.objects o where o.owner_id=p_user::text or o.owner=p_user),'[]'),
 'email_automatic',false) into result;
 return result;
end; $$;

create or replace function daraya_private.admin_deletion_handle(p_user uuid,p_action text,p_resource uuid,p_destination text,p_confirmation text,p_verified boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; target_email text; dest uuid; dest_email text; n integer; receipt uuid; shop_revision integer;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED';end if;
 if p_verified is distinct from true then raise exception 'VERIFICATION_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user::text));
 perform 1 from auth.users where id=p_user for update;
 if not found then raise exception 'ACCOUNT_NOT_FOUND';end if;
 s:=daraya_private.admin_deletion_state(p_user);
 if p_confirmation is distinct from ('HANDLE '||(s->>'identity')) then raise exception 'CONFIRMATION_REQUIRED';end if;
 if (s->'blockers') ?| array['SELF_ACCOUNT','ADMIN_ACCOUNT'] then raise exception 'PROTECTED_ACCOUNT';end if;
 select u.email into target_email from auth.users u where id=p_user;
 if p_action in ('transfer_shop','transfer_file') then
  select u.id,u.email into dest,dest_email from auth.users u where lower(u.email)=lower(btrim(p_destination)) and u.id<>p_user and (u.banned_until is null or u.banned_until<now()) for share;
  if dest is null then raise exception 'DESTINATION_NOT_FOUND';end if;
 end if;
 if p_action='delete_shop' then
  select revision into shop_revision from public.stores where id=p_resource and lower(owner_email)=lower(target_email) for update;
  if not found then raise exception 'RESOURCE_CHANGED';end if;
  perform 1 from public.orders where store_id=p_resource for update;
  perform 1 from public.service_bookings where store_id=p_resource for update;
  if exists(select 1 from public.orders where store_id=p_resource and status not in ('تم التسليم','ملغي'))
   or exists(select 1 from public.service_bookings where store_id=p_resource and status in ('new','accepted')) then raise exception 'STORE_TRANSACTIONS_OPEN';end if;
  perform public.admin_set_store_deleted(p_resource,shop_revision,true);
  -- Normal site removal retains business/order records for admin recovery. It is not a storage purge.
  update public.stores set owner_email='',online_ordering=false,delivery_enabled=false where id=p_resource;
  delete from public.daily_offers where store_id=p_resource;
  update public.business_applications set store_id=null,status='draft' where owner_id=p_user and store_id=p_resource;
  n:=1;
 elsif p_action='transfer_shop' then
  update public.stores set owner_email=dest_email where id=p_resource and lower(owner_email)=lower(target_email);
  get diagnostics n=row_count;
  if n=1 then
   -- The original personal application stays with its owner until final deletion.
   update public.business_applications set store_id=null,status='draft' where owner_id=p_user and store_id=p_resource;
  end if;
 elsif p_action='detach_application' then
  if exists(select 1 from public.business_applications b join public.stores st on st.id=b.store_id where b.id=p_resource and b.owner_id=p_user and lower(st.owner_email)=lower(target_email)) then raise exception 'TRANSFER_SHOP_FIRST';end if;
  update public.business_applications set store_id=null,status='draft' where id=p_resource and owner_id=p_user and store_id is not null;
  get diagnostics n=row_count;
 elsif p_action='cancel_order' then
  update public.orders set status='ملغي' where id=p_resource and status not in ('تم التسليم','ملغي') and (store_id in(select id from public.stores where lower(owner_email)=lower(target_email)) or customer_id=p_user or driver_id in(select id from public.store_drivers where user_id=p_user or lower(store_drivers.email)=lower(target_email)));
  get diagnostics n=row_count;
 elsif p_action='cancel_booking' then
  update public.service_bookings set status='cancelled' where id=p_resource and (user_id=p_user or store_id in(select id from public.stores where lower(owner_email)=lower(target_email))) and status in ('new','accepted');
  get diagnostics n=row_count;
 elsif p_action='detach_driver' then
  perform 1 from public.store_drivers where id=p_resource and (user_id=p_user or lower(store_drivers.email)=lower(target_email)) for update;
  if not found then raise exception 'RESOURCE_CHANGED';end if;
  if exists(select 1 from public.orders where driver_id=p_resource and status not in ('تم التسليم','ملغي')) then raise exception 'DRIVER_ORDERS_OPEN';end if;
  delete from public.order_driver_locations where driver_id=p_resource;
  delete from public.driver_code_secrets where driver_id=p_resource;
  update public.store_drivers set user_id=null,name='حساب محذوف',phone='',email=p_resource::text||'@deleted.damascus-shop.invalid',active=false,deleted_at=now(),invite_token=pg_catalog.gen_random_uuid() where id=p_resource;
  get diagnostics n=row_count;
 elsif p_action='transfer_file' then
  -- Ownership metadata only: the real object is retained, never SQL-deleted.
  update storage.objects set owner_id=dest::text,owner=dest where id=p_resource and (owner_id=p_user::text or owner=p_user);
  get diagnostics n=row_count;
 else raise exception 'INVALID_ACTION';
 end if;
 if n is distinct from 1 then raise exception 'RESOURCE_CHANGED';end if;
 insert into public.account_deletion_actions(actor_id,target_id,action,resource_id,destination_id) values(auth.uid(),p_user,p_action,p_resource,dest) returning id into receipt;
 return jsonb_build_object('handled',true,'receipt',receipt);
end; $$;

create or replace function public.admin_account_deletion_details(p_user uuid)
returns jsonb language sql security invoker set search_path='' as $$select daraya_private.admin_deletion_details(p_user);$$;
create or replace function public.admin_handle_account_deletion(p_user uuid,p_action text,p_resource uuid,p_destination text,p_confirmation text,p_verified boolean)
returns jsonb language sql security invoker set search_path='' as $$select daraya_private.admin_deletion_handle(p_user,p_action,p_resource,p_destination,p_confirmation,p_verified);$$;
revoke all on function daraya_private.admin_deletion_details(uuid),daraya_private.admin_deletion_handle(uuid,text,uuid,text,text,boolean),public.admin_account_deletion_details(uuid),public.admin_handle_account_deletion(uuid,text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function daraya_private.admin_deletion_details(uuid),daraya_private.admin_deletion_handle(uuid,text,uuid,text,text,boolean),public.admin_account_deletion_details(uuid),public.admin_handle_account_deletion(uuid,text,uuid,text,text,boolean) to authenticated;

create or replace function daraya_private.admin_deletion_file(p_user uuid,p_resource uuid,p_confirmation text,p_verified boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; f jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED';end if;
 if p_verified is distinct from true then raise exception 'VERIFICATION_REQUIRED';end if;
 s:=daraya_private.admin_deletion_state(p_user);
 if p_confirmation is distinct from ('HANDLE '||(s->>'identity')) then raise exception 'CONFIRMATION_REQUIRED';end if;
 if (s->'blockers') ?| array['SELF_ACCOUNT','ADMIN_ACCOUNT'] then raise exception 'PROTECTED_ACCOUNT';end if;
 select x into f from jsonb_array_elements(daraya_private.admin_deletion_details(p_user)->'files') x where x->>'id'=p_resource::text;
 if f is null then raise exception 'RESOURCE_CHANGED';end if;
 if (f->>'referenced')::boolean then raise exception 'FILE_IN_USE';end if;
 return f;
end; $$;
create or replace function public.admin_account_deletion_file(p_user uuid,p_resource uuid,p_confirmation text,p_verified boolean)
returns jsonb language sql security invoker set search_path='' as $$select daraya_private.admin_deletion_file(p_user,p_resource,p_confirmation,p_verified);$$;
revoke all on function daraya_private.admin_deletion_file(uuid,uuid,text,boolean),public.admin_account_deletion_file(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function daraya_private.admin_deletion_file(uuid,uuid,text,boolean),public.admin_account_deletion_file(uuid,uuid,text,boolean) to authenticated;
