begin;
-- One shared setting, readable by everyone and writable only by platform admins.
create table if not exists public.platform_settings (
 id boolean primary key default true check(id),
 subscriptions_enabled boolean not null default false
);
insert into public.platform_settings(id,subscriptions_enabled) values(true,false) on conflict(id) do nothing;
alter table public.platform_settings enable row level security;
drop policy if exists platform_settings_read on public.platform_settings;
create policy platform_settings_read on public.platform_settings for select using(true);
drop policy if exists platform_settings_update on public.platform_settings;
create policy platform_settings_update on public.platform_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.platform_settings to anon,authenticated;
grant update(subscriptions_enabled) on public.platform_settings to authenticated;
alter table public.stores alter column delivery_enabled set default false;
-- Preserve existing shop choices. Assigning/upgrading a plan never enables delivery.
create or replace function public.store_plan_features(sid uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select case when not coalesce((select subscriptions_enabled from platform_settings where id=true),false)
 then '{"phone":true,"max_photos":1000,"caption_length":1000,"catalog":true,"description_length":1000,"ordering":true,"hours":true,"gps":true,"delivery":true,"featured_home":false,"featured_category":false}'::jsonb
 when ss.store_id is null then '{"phone":true,"max_photos":1000,"caption_length":1000,"catalog":true,"description_length":1000,"ordering":true,"hours":true,"gps":true,"delivery":false,"featured_home":false,"featured_category":false}'::jsonb
 when ss.active then p.features||ss.overrides||jsonb_build_object('delivery',ss.plan_id in ('silver','gold'))
 else (select features from subscription_plans where id='free')||'{"delivery":false}'::jsonb end
 from (select sid as id) x left join store_subscriptions ss on ss.store_id=x.id left join subscription_plans p on p.id=ss.plan_id;
$$;
create or replace function public.enforce_delivery_subscription() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.delivery_enabled and (tg_op='INSERT' or new.delivery_enabled is distinct from old.delivery_enabled)
 and not coalesce((store_plan_features(new.id)->>'delivery')::boolean,false)
 then raise exception 'خدمة التوصيل متاحة من الاشتراك الفضي فما فوق';end if;
 return new;
end $$;
drop trigger if exists delivery_subscription on public.stores;
create trigger delivery_subscription before insert or update on public.stores for each row execute function public.enforce_delivery_subscription();
create or replace function public.enforce_order_subscription() returns trigger language plpgsql security definer set search_path=public as $$
declare f jsonb;
begin
 f:=store_plan_features(new.store_id);
 if not coalesce((f->>'ordering')::boolean,false) then raise exception 'المتجر لا يستقبل طلبات في الاشتراك الحالي';end if;
 if new.fulfillment_method='delivery' and not coalesce((f->>'delivery')::boolean,false)
 then raise exception 'خدمة التوصيل غير متاحة في الاشتراك الحالي';end if;
 return new;
end $$;
commit;
