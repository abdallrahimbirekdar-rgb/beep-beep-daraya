begin;
set local lock_timeout='5s';
alter table public.store_drivers add column if not exists deleted_at timestamptz;
-- Credentials are never exposed through the roster or a browser-accessible RPC.
create table public.driver_code_secrets (
 driver_id uuid primary key references public.store_drivers(id) on delete cascade,
 user_id uuid not null,
 code text not null check(code ~ '^[0-9]{12}$')
);
alter table public.driver_code_secrets enable row level security;
revoke all on public.driver_code_secrets from public,anon,authenticated;
grant all on public.driver_code_secrets to service_role;
create function public.provision_driver_code_with_secret(p_actor uuid,p_store uuid,p_driver uuid,p_user uuid,p_name text,p_phone text,p_email text,p_expected_user uuid,p_code text) returns uuid language plpgsql security definer set search_path=public as $$
declare did uuid;
begin
 if p_code !~ '^[0-9]{12}$' or p_email <> encode(extensions.digest(p_code,'sha256'),'hex')||'@driver.damascus-shop.invalid' then raise exception 'رمز غير صالح';end if;
 did:=public.provision_driver_code(p_actor,p_store,p_driver,p_user,p_name,p_phone,p_email,p_expected_user);
 insert into driver_code_secrets(driver_id,user_id,code) values(did,p_user,p_code) on conflict(driver_id) do update set user_id=excluded.user_id,code=excluded.code;
 return did;
end $$;
create function public.manage_driver_code(p_actor uuid,p_driver uuid,p_action text) returns jsonb language plpgsql security definer set search_path=public as $$
declare d store_drivers%rowtype; actor_email text; result jsonb;
begin
 select lower(email) into actor_email from auth.users where id=p_actor;
 select * into d from store_drivers where id=p_driver and deleted_at is null for update;
 if not found or actor_email is null or not (exists(select 1 from platform_admins where user_id=p_actor) or (d.store_id is not null and exists(select 1 from stores where id=d.store_id and deleted_at is null and lower(owner_email)=actor_email))) then raise exception 'لا تملك صلاحية إدارة مندوب التوصيل';end if;
 if p_action='view' then
 select jsonb_build_object('code',code) into result from driver_code_secrets where driver_id=d.id and user_id=d.user_id;
 return coalesce(result,'{}'::jsonb);
 elsif p_action='delete' then
 update store_drivers set active=false,user_id=null,invite_token=gen_random_uuid(),deleted_at=now() where id=d.id;
 update order_driver_locations set shared=false where driver_id=d.id;
 delete from driver_code_secrets where driver_id=d.id;
 return jsonb_build_object('deleted',true);
 end if;
 raise exception 'العملية غير صالحة';
end $$;
create or replace function public.set_store_driver_active(p_driver uuid,p_active boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from store_drivers where id=p_driver and deleted_at is null and manages_store(store_id) for update;
 if not found then raise exception 'لا تملك صلاحية إدارة مندوب التوصيل';end if;
 update store_drivers set active=p_active where id=p_driver;
end $$;
revoke all on function public.provision_driver_code_with_secret(uuid,uuid,uuid,uuid,text,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.provision_driver_code_with_secret(uuid,uuid,uuid,uuid,text,text,text,uuid,text) to service_role;
revoke all on function public.manage_driver_code(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.manage_driver_code(uuid,uuid,text) to service_role;
commit;
