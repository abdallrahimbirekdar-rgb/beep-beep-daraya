begin;
create table if not exists public.daily_offers (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid references public.stores(id) on delete cascade,
 title text not null check(length(trim(title)) between 3 and 150),
 address text not null check(length(trim(address)) between 3 and 500),
 details text not null check(length(trim(details)) between 3 and 1500),
 price numeric check(price between 0 and 1000000000000),
 ends_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
alter table public.daily_offers enable row level security;
grant select on public.daily_offers to anon, authenticated;
grant insert,update,delete on public.daily_offers to authenticated;
drop policy if exists daily_offers_read on public.daily_offers;
drop policy if exists daily_offers_add on public.daily_offers;
drop policy if exists daily_offers_review on public.daily_offers;
drop policy if exists daily_offers_delete on public.daily_offers;
create policy daily_offers_read on public.daily_offers for select using ((status='approved' and ends_at>now()) or user_id=auth.uid() or public.is_admin());
create or replace function public.can_submit_daily_offer_store(sid uuid) returns boolean language sql stable security definer set search_path=public as $select auth.uid() is not null and exists(select 1 from public.stores s where s.id=sid and s.active and coalesce(s.translations->'_directory'->>'mode','') <> 'info' and coalesce(s.translations->'_directory'->>'kind','') not in ('doctor','pharmacy') and coalesce(s.category,'') not in ('doctor','pharmacy') and (coalesce(s.name,'')||' '||coalesce(s.description,'')) !~ 'صيدل|طبيب|عيادة|دكتور' and (public.is_admin() or lower(s.owner_email)=lower(auth.jwt()->>'email')))$;
revoke all on function public.can_submit_daily_offer_store(uuid) from public,anon;
grant execute on function public.can_submit_daily_offer_store(uuid) to authenticated;
create policy daily_offers_add on public.daily_offers for insert to authenticated with check (user_id=auth.uid() and status='pending' and ends_at>now() and ends_at<=now()+interval '30 days' and (store_id is null or public.can_submit_daily_offer_store(store_id)));
create policy daily_offers_review on public.daily_offers for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy daily_offers_delete on public.daily_offers for delete to authenticated using(user_id=auth.uid() or public.is_admin());
create index if not exists daily_offers_public on public.daily_offers(status,ends_at,created_at desc);
commit;
