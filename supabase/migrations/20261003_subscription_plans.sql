begin;
create table if not exists public.subscription_plans(id text primary key,name text not null,features jsonb not null);
create table if not exists public.store_subscriptions(store_id uuid primary key references public.stores(id) on delete cascade,plan_id text not null references public.subscription_plans(id),active boolean not null default true,overrides jsonb not null default '{}');
create table if not exists public.store_page_photos(id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id) on delete cascade,image text not null check(image like 'https://%'),caption text not null default '',position integer not null default 0,created_at timestamptz not null default now());
insert into public.subscription_plans values('free','المجاني','{"phone":false,"max_photos":1,"caption_length":0,"catalog":false,"description_length":0,"ordering":false,"hours":false,"gps":true,"featured_home":false,"featured_category":false}') on conflict(id) do nothing;
insert into public.subscription_plans values('iron','الحديدي','{"phone":true,"max_photos":2,"caption_length":0,"catalog":false,"description_length":0,"ordering":false,"hours":false,"gps":true,"featured_home":false,"featured_category":false}') on conflict(id) do nothing;
insert into public.subscription_plans values('bronze','البرونزي','{"phone":true,"max_photos":5,"caption_length":120,"catalog":true,"description_length":120,"ordering":true,"hours":true,"gps":true,"featured_home":false,"featured_category":false}') on conflict(id) do nothing;
insert into public.subscription_plans values('silver','الفضي','{"phone":true,"max_photos":20,"caption_length":1000,"catalog":true,"description_length":1000,"ordering":true,"hours":true,"gps":true,"featured_home":false,"featured_category":false}') on conflict(id) do nothing;
insert into public.subscription_plans values('gold','الذهبي','{"phone":true,"max_photos":20,"caption_length":1000,"catalog":true,"description_length":1000,"ordering":true,"hours":true,"gps":true,"featured_home":true,"featured_category":true}') on conflict(id) do nothing;
alter table public.subscription_plans enable row level security;
alter table public.store_subscriptions enable row level security;
alter table public.store_page_photos enable row level security;
create policy plans_read on public.subscription_plans for select using(true);
create policy plans_write on public.subscription_plans for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy subscriptions_read on public.store_subscriptions for select using(true);
create policy subscriptions_write on public.store_subscriptions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy page_photos_read on public.store_page_photos for select using(exists(select 1 from public.stores s where s.id=store_id and s.active and s.deleted_at is null) or public.manages_store(store_id));
create policy page_photos_write on public.store_page_photos for all to authenticated using(public.manages_store(store_id)) with check(public.manages_store(store_id));
grant select on public.subscription_plans,public.store_subscriptions,public.store_page_photos to anon,authenticated;
grant insert,update,delete on public.subscription_plans,public.store_subscriptions,public.store_page_photos to authenticated;
create or replace function public.store_plan_features(sid uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select case when ss.store_id is null then '{"phone":true,"max_photos":1000,"caption_length":1000,"catalog":true,"description_length":1000,"ordering":true,"hours":true,"gps":true,"featured_home":false,"featured_category":false}'::jsonb
 when ss.active then p.features||ss.overrides else (select features from subscription_plans where id='free') end
 from (select sid as id) x left join store_subscriptions ss on ss.store_id=x.id left join subscription_plans p on p.id=ss.plan_id;
$$;
create or replace function public.assign_free_place() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into store_subscriptions(store_id,plan_id) values(new.id,'free') on conflict do nothing;return new;end $$;
create trigger assign_free_place after insert on public.stores for each row execute function public.assign_free_place();
create or replace function public.enforce_place_plan() returns trigger language plpgsql security definer set search_path=public as $$
declare f jsonb;sid uuid;total integer;extra integer;oldextra integer;
begin
 if public.is_admin() or auth.uid() is null then return new;end if;
 sid:=new.store_id;perform pg_advisory_xact_lock(hashtext(sid::text));f:=store_plan_features(sid);
 if tg_table_name='store_page_photos' then
 if length(new.caption)>coalesce((f->>'caption_length')::integer,0) then raise exception 'وصف الصورة يتجاوز حد الاشتراك';end if;
 extra:=1;oldextra:=case when tg_op='UPDATE' then 1 else 0 end;
 else
 if not coalesce((f->>'catalog')::boolean,false) then raise exception 'عرض المنتجات غير متاح في الاشتراك';end if;
 if length(new.description)>coalesce((f->>'description_length')::integer,0) then raise exception 'وصف المنتج يتجاوز حد الاشتراك';end if;
 extra:=(case when new.image<>'' then 1 else 0 end)+jsonb_array_length(coalesce(to_jsonb(new.gallery),'[]'::jsonb));
 oldextra:=case when tg_op='UPDATE' then (case when old.image<>'' then 1 else 0 end)+jsonb_array_length(coalesce(to_jsonb(old.gallery),'[]'::jsonb)) else 0 end;
 end if;
 select (case when s.image<>'' then 1 else 0 end)+(select count(*) from store_page_photos where store_id=sid)+(select coalesce(sum((case when p.image<>'' then 1 else 0 end)+jsonb_array_length(coalesce(to_jsonb(p.gallery),'[]'::jsonb))),0) from products p where p.store_id=sid) into total from stores s where s.id=sid;
 if total-oldextra+extra>coalesce((f->>'max_photos')::integer,1) and extra>oldextra then raise exception 'بلغت الحد الأقصى لصور الاشتراك';end if;
 return new;
end $$;
create trigger page_photo_plan before insert or update on public.store_page_photos for each row execute function public.enforce_place_plan();
create trigger product_plan before insert or update on public.products for each row execute function public.enforce_place_plan();
commit;