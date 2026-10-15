-- Trusted confirmation timestamps; offer expiry and moderation are unchanged.
begin;
create table if not exists public.daily_offer_availability(
 offer_id uuid primary key references public.daily_offers(id) on delete cascade,
 confirmed_at timestamptz not null default now()
);
alter table public.daily_offer_availability enable row level security;
revoke all on public.daily_offer_availability from public,anon,authenticated;
grant select on public.daily_offer_availability to anon,authenticated;
drop policy if exists offer_availability_public_read on public.daily_offer_availability;
create policy offer_availability_public_read on public.daily_offer_availability for select using(
 exists(select 1 from public.daily_offers o where o.id=offer_id and o.status='approved' and o.ends_at>now())
);
create or replace function public.confirm_daily_offer_availability(p_offer uuid)
returns timestamptz language plpgsql security definer set search_path=pg_catalog,public as $$
declare target_store uuid; stamp timestamptz;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select o.store_id into target_store from public.daily_offers o join public.stores s on s.id=o.store_id
 where o.id=p_offer and o.status='approved' and o.ends_at>now() and s.active and coalesce(to_jsonb(s)->>'deleted_at','')=''
 and not public.daraya_account_is_banned(o.user_id) and not public.daraya_publisher_hidden(o.user_id);
 if target_store is null or not (public.manages_store(target_store) or public.is_admin()) then raise exception 'Active offer owner required';end if;
 stamp=clock_timestamp();
 insert into public.daily_offer_availability(offer_id,confirmed_at) values(p_offer,stamp)
 on conflict(offer_id) do update set confirmed_at=excluded.confirmed_at;
 return stamp;
end;$$;
revoke all on function public.confirm_daily_offer_availability(uuid) from public,anon;
grant execute on function public.confirm_daily_offer_availability(uuid) to authenticated;
-- Compatibility with stores schemas that use active without deleted_at.
do $fix$
declare def text;
begin
 if to_regprocedure('public.record_daily_offer_event(uuid,uuid,text)') is not null then
  select pg_get_functiondef('public.record_daily_offer_event(uuid,uuid,text)'::regprocedure) into def;
  if position('and s.deleted_at is null' in def)>0 then execute replace(def,'and s.deleted_at is null',$guard$and coalesce(to_jsonb(s)->>'deleted_at','')=''$guard$);end if;
 end if;
end;$fix$;
notify pgrst,'reload schema';
commit;
