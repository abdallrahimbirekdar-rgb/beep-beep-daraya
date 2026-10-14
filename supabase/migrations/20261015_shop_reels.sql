begin;
set local lock_timeout = '5s';
-- Uploads remain off until the private bucket AND scheduled cleanup are set up.
create table if not exists public.shop_reels_config (
 id boolean primary key default true check(id), enabled boolean not null default false
);
alter table public.shop_reels_config enable row level security;
revoke all on public.shop_reels_config from public,anon,authenticated;
insert into public.shop_reels_config(id,enabled) values(true,false) on conflict(id) do nothing;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('shop-reels','shop-reels',false,52428800,array['video/mp4','video/webm'])
on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['video/mp4','video/webm'];

create or replace function public.daraya_terms_accepted() returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from auth.users where id=auth.uid() and raw_user_meta_data->>'terms_version'='2026-10-15');
$$;
revoke all on function public.daraya_terms_accepted() from public;
grant execute on function public.daraya_terms_accepted() to anon,authenticated;
create or replace function public.shop_reels_terms_version() returns text
language sql immutable set search_path=pg_catalog as $$select '2026-10-15'::text$$;
revoke all on function public.shop_reels_terms_version() from public;
grant execute on function public.shop_reels_terms_version() to anon,authenticated;

create or replace function public.shop_reels_ready() returns boolean
language sql stable security definer set search_path=pg_catalog,public,storage as $$
 select coalesce((select enabled from public.shop_reels_config where id=true),false)
 and exists(select 1 from storage.buckets where id='shop-reels' and not public and file_size_limit=52428800);
$$;
revoke all on function public.shop_reels_ready() from public;
grant execute on function public.shop_reels_ready() to anon,authenticated;

create or replace function public.shop_reel_path(details text) returns text
language plpgsql immutable set search_path=pg_catalog as $$
declare m jsonb;
begin
 m:=details::jsonb;
 if m->>'type'='daraya-shop-offer-v1' and m->>'kind'='video' then return m->'video'->>'path';end if;
 return null;
exception when invalid_text_representation then return null;
end;$$;
revoke all on function public.shop_reel_path(text) from public;
grant execute on function public.shop_reel_path(text) to anon,authenticated,service_role;

create or replace function public.shop_reel_can_upload(path text) returns boolean
language plpgsql volatile security definer set search_path=pg_catalog,public,storage as $$
begin
 if auth.uid() is null or not public.shop_reels_ready() or not public.daraya_terms_accepted()
 or public.daraya_account_is_banned(auth.uid()) then return false;end if;
 if path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|webm)$'
 or split_part(path,'/',1)<>auth.uid()::text then return false;end if;
 if not public.can_submit_daily_offer_store(split_part(path,'/',2)::uuid) then return false;end if;
 perform pg_advisory_xact_lock(hashtext('reel-global-cap'));
 if (select count(*) from storage.objects where bucket_id='shop-reels')>=10 then return false;end if;
 perform pg_advisory_xact_lock(hashtext('reel-shop:'||split_part(path,'/',2)));
 if exists(select 1 from storage.objects where bucket_id='shop-reels' and split_part(name,'/',2)=split_part(path,'/',2)) then return false;end if;
 perform pg_advisory_xact_lock(hashtext('reel-upload:'||auth.uid()::text));
 return (select count(*) from storage.objects where bucket_id='shop-reels'
 and split_part(name,'/',1)=auth.uid()::text and created_at>now()-interval '1 day')<10;
end;$$;
revoke all on function public.shop_reel_can_upload(text) from public;
grant execute on function public.shop_reel_can_upload(text) to authenticated;

create or replace function public.shop_reel_can_read(path text) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select public.is_admin() or (auth.uid() is not null and split_part(path,'/',1)=auth.uid()::text)
 or exists(select 1 from public.daily_offers o join public.stores s on s.id=o.store_id
 where public.shop_reel_path(o.details)=path and o.status='approved' and o.ends_at>now()
 and s.active and s.deleted_at is null and not public.daraya_account_is_banned(o.user_id)
 and not public.daraya_publisher_hidden(o.user_id));
$$;
revoke all on function public.shop_reel_can_read(text) from public;
grant execute on function public.shop_reel_can_read(text) to anon,authenticated;

drop policy if exists shop_reels_upload on storage.objects;
create policy shop_reels_upload on storage.objects for insert to authenticated
with check(bucket_id='shop-reels' and public.shop_reel_can_upload(name));
drop policy if exists shop_reels_read on storage.objects;
create policy shop_reels_read on storage.objects for select to anon,authenticated
using(bucket_id='shop-reels' and public.shop_reel_can_read(name));
drop policy if exists shop_reels_delete on storage.objects;
create policy shop_reels_delete on storage.objects for delete to authenticated
using(bucket_id='shop-reels' and (public.is_admin() or split_part(name,'/',1)=auth.uid()::text));
-- No overwrite/update policy: a reviewed video cannot be silently replaced.

create or replace function public.guard_shop_reel_offer() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,storage as $$
declare m jsonb; path text;
begin
 if tg_op='INSERT' then
  if new.ends_at<=now() or new.ends_at>now()+interval '7 days' then raise exception 'OFFER_MAX_SEVEN_DAYS';end if;
 elsif new.ends_at is distinct from old.ends_at then
  if old.ends_at<=now() then raise exception 'EXPIRED_OFFER_CANNOT_EXTEND';end if;
  if new.ends_at<=now() or new.ends_at>new.created_at+interval '7 days' then raise exception 'OFFER_MAX_SEVEN_DAYS';end if;
 end if;
 begin m:=new.details::jsonb;exception when invalid_text_representation then return new;end;
 if m->>'type'<>'daraya-shop-offer-v1' then return new;end if;
 if m ? 'kind' and m->>'kind' not in ('text','image','video') then raise exception 'INVALID_OFFER_KIND';end if;
 if m->>'kind'='video' then
  if new.store_id is null then raise exception 'REEL_STORE_REQUIRED';end if;
  if tg_op='UPDATE' then
   if old.status='rejected' and new.status<>'rejected' then raise exception 'REJECTED_REEL_REQUIRES_NEW_OFFER';end if;
  end if;
  if not public.shop_reels_ready() then raise exception 'REEL_UPLOADS_DISABLED';end if;
  path:=m->'video'->>'path';
  if path is null or path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|webm)$'
  or split_part(path,'/',1)<>new.user_id::text or split_part(path,'/',2)<>new.store_id::text
  or split_part(split_part(path,'/',3),'.',1)<>new.id::text then raise exception 'INVALID_REEL_PATH';end if;
  if jsonb_typeof(m->'video'->'duration') is distinct from 'number'
  or (m->'video'->>'duration')::numeric<=0 or (m->'video'->>'duration')::numeric>30
  or jsonb_typeof(m->'video'->'size') is distinct from 'number'
  or (m->'video'->>'size')::numeric<=0 or (m->'video'->>'size')::numeric>52428800 then raise exception 'INVALID_REEL_LIMITS';end if;
  if not exists(select 1 from storage.objects where bucket_id='shop-reels' and name=path) then raise exception 'REEL_FILE_MISSING';end if;
 end if;
 return new;
end;$$;
revoke all on function public.guard_shop_reel_offer() from public,anon,authenticated;
drop trigger if exists guard_shop_reel_offer on public.daily_offers;
create trigger guard_shop_reel_offer before insert or update on public.daily_offers
for each row execute function public.guard_shop_reel_offer();

-- The cleanup worker deletes bytes through Storage API, then removes expired rows.
-- Never DELETE storage.objects directly: that alone leaves underlying file bytes.
create or replace function public.shop_reel_cleanup_candidates(p_limit integer default 100)
returns table(offer_id uuid,path text,cutoff timestamptz)
language sql stable security definer set search_path=pg_catalog,public,storage as $$
 (select o.id,public.shop_reel_path(o.details),now() from public.daily_offers o
 where o.ends_at<=now() or o.status='rejected' order by o.ends_at limit greatest(1,least(coalesce(p_limit,100),100)))
 union all
 (select null::uuid,f.name,now() from storage.objects f
 where f.bucket_id='shop-reels' and f.created_at<now()-interval '2 hours'
 and not exists(select 1 from public.daily_offers o where public.shop_reel_path(o.details)=f.name)
 order by f.created_at limit 100);
$$;
revoke all on function public.shop_reel_cleanup_candidates(integer) from public,anon,authenticated;
grant execute on function public.shop_reel_cleanup_candidates(integer) to service_role;
notify pgrst,'reload schema';
commit;
