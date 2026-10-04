begin;
set local lock_timeout='5s';
-- Only the authenticated server service can bind an Auth identity to a driver.
create or replace function public.provision_driver_code(p_actor uuid,p_store uuid,p_driver uuid,p_user uuid,p_name text,p_phone text,p_email text,p_expected_user uuid default null) returns uuid language plpgsql security definer set search_path=public as $$
declare d store_drivers%rowtype; actor_email text;
begin
 select lower(email) into actor_email from auth.users where id=p_actor;
 if actor_email is null or not (exists(select 1 from platform_admins where user_id=p_actor) or (p_store is not null and exists(select 1 from stores where id=p_store and deleted_at is null and lower(owner_email)=actor_email))) then raise exception 'لا تملك صلاحية إدارة المندوب';end if;
 if p_store is not null and not exists(select 1 from stores where id=p_store and deleted_at is null) then raise exception 'المتجر غير متاح';end if;
 if p_email !~ '^[0-9a-f]{64}@driver\.damascus-shop\.invalid$' or not exists(select 1 from auth.users where id=p_user and email=p_email and coalesce((raw_app_meta_data->>'driver_code_only')::boolean,false)) then raise exception 'حساب المندوب غير صالح';end if;
 if trim(p_name)='' or length(trim(p_name))>100 or length(p_phone)>40 then raise exception 'تحقق من اسم المندوب ورقمه';end if;
 select * into d from store_drivers where id=p_driver for update;
 if found then
 if d.store_id is distinct from p_store or d.user_id is distinct from p_expected_user then raise exception 'تغير حساب المندوب. حدّث الصفحة وأعد المحاولة';end if;
 if not d.active then raise exception 'أعد تفعيل المندوب قبل إنشاء رمز جديد';end if;
 update store_drivers set user_id=p_user,email=p_email,invite_token=gen_random_uuid() where id=d.id;
 else
 if p_expected_user is not null then raise exception 'المندوب غير موجود';end if;
 insert into store_drivers(id,store_id,user_id,name,phone,email) values(p_driver,p_store,p_user,trim(p_name),trim(p_phone),p_email);
 end if;
 return p_driver;
end $$;
revoke all on function public.provision_driver_code(uuid,uuid,uuid,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.provision_driver_code(uuid,uuid,uuid,uuid,text,text,text,uuid) to service_role;
commit;
