begin;
create table if not exists public.daraya_user_blocks(
 user_id uuid not null references auth.users(id) on delete cascade,
 blocked_user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,blocked_user_id),
 check(user_id<>blocked_user_id));
alter table public.daraya_user_blocks enable row level security;
revoke all on public.daraya_user_blocks from public,anon,authenticated;
grant select,insert,delete on public.daraya_user_blocks to authenticated;
drop policy if exists user_blocks_read on public.daraya_user_blocks;
create policy user_blocks_read on public.daraya_user_blocks for select to authenticated using(user_id=auth.uid());
drop policy if exists user_blocks_add on public.daraya_user_blocks;
create policy user_blocks_add on public.daraya_user_blocks for insert to authenticated with check(user_id=auth.uid() and user_id<>blocked_user_id);
drop policy if exists user_blocks_remove on public.daraya_user_blocks;
create policy user_blocks_remove on public.daraya_user_blocks for delete to authenticated using(user_id=auth.uid());
create or replace function public.daraya_publisher_hidden(target uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from daraya_user_blocks where user_id=auth.uid() and blocked_user_id=target)$$;
create or replace function public.daraya_terms_accepted() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from auth.users where id=auth.uid() and raw_user_meta_data->>'terms_version'='2026-10-10')$$;
revoke all on function public.daraya_publisher_hidden(uuid),public.daraya_terms_accepted() from public;
grant execute on function public.daraya_publisher_hidden(uuid),public.daraya_terms_accepted() to anon,authenticated;
drop policy if exists daraya_posts_read on public.daraya_posts;
create policy daraya_posts_read on public.daraya_posts for select using(
(status='active' and expires_at>now() and not public.daraya_account_is_banned(user_id) and not public.daraya_publisher_hidden(user_id)) or user_id=auth.uid() or public.is_admin());
drop policy if exists daily_offers_read on public.daily_offers;
create policy daily_offers_read on public.daily_offers for select using(
(status='approved' and ends_at>now() and not public.daraya_account_is_banned(user_id) and not public.daraya_publisher_hidden(user_id)) or user_id=auth.uid() or public.is_admin());
create or replace function public.guard_daraya_publication() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then
  if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'SIGN_IN_REQUIRED';end if;
  if not public.daraya_terms_accepted() then raise exception 'TERMS_REQUIRED';end if;
  if public.daraya_account_is_banned(new.user_id) then raise exception 'DARAYA_ACCOUNT_BANNED';end if;
 end if;
 return new;
end;$$;
drop trigger if exists daraya_terms_publication on public.daraya_posts;
create trigger daraya_terms_publication before insert or update of title,details,image,video on public.daraya_posts for each row execute function public.guard_daraya_publication();
drop trigger if exists daily_terms_publication on public.daily_offers;
create trigger daily_terms_publication before insert or update on public.daily_offers for each row execute function public.guard_daraya_publication();
create table if not exists public.daily_offer_reports(
 id uuid primary key default gen_random_uuid(), offer_id uuid not null references public.daily_offers(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(length(trim(reason)) between 3 and 1000),
 status text not null default 'new' check(status in ('new','resolved')),
 created_at timestamptz not null default now(), unique(offer_id,reporter_id));
alter table public.daily_offer_reports enable row level security;
revoke all on public.daily_offer_reports from public,anon,authenticated;
grant select on public.daily_offer_reports to authenticated;
drop policy if exists offer_reports_read on public.daily_offer_reports;
create policy offer_reports_read on public.daily_offer_reports for select to authenticated using(public.is_admin());
create or replace function public.report_daily_offer(p_offer uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED';end if;
 if not exists(select 1 from daily_offers where id=p_offer and status='approved' and ends_at>now()) then raise exception 'Offer unavailable';end if;
 perform pg_advisory_xact_lock(hashtext('offer-report:'||auth.uid()::text));
 if (select count(*) from daily_offer_reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Report limit';end if;
 insert into daily_offer_reports(offer_id,reporter_id,reason) values(p_offer,auth.uid(),trim(p_reason)) on conflict(offer_id,reporter_id) do nothing;
end;$$;
create or replace function public.review_daily_offer_report(p_report uuid,p_hide boolean) returns void language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Admin required';end if;
 select offer_id into target from daily_offer_reports where id=p_report for update;
 if target is null then raise exception 'Report unavailable';end if;
 if p_hide then update daily_offers set status='rejected' where id=target;end if;
 update daily_offer_reports set status='resolved' where id=p_report;
end;$$;
create or replace function public.ban_daily_offer_publisher(p_offer uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Admin required';end if;
 select user_id into target from daily_offers where id=p_offer;
 if target is null or target=auth.uid() then raise exception 'Account unavailable';end if;
 perform pg_advisory_xact_lock(hashtext('daraya-post:'||target::text));
 insert into daraya_account_bans(user_id,reason,banned_by) values(target,trim(p_reason),auth.uid()) on conflict(user_id) do update set reason=excluded.reason,banned_by=excluded.banned_by,created_at=now();
 update daily_offers set status='rejected' where user_id=target;
 update daraya_posts set status='hidden',updated_at=now() where user_id=target and status='active';
end;$$;
revoke all on function public.report_daily_offer(uuid,text),public.review_daily_offer_report(uuid,boolean),public.ban_daily_offer_publisher(uuid,text),public.guard_daraya_publication() from public,anon,authenticated;
grant execute on function public.report_daily_offer(uuid,text),public.review_daily_offer_report(uuid,boolean),public.ban_daily_offer_publisher(uuid,text) to authenticated;
commit;
