begin;
create table if not exists public.daraya_account_bans (
 user_id uuid primary key references auth.users(id) on delete cascade,
 reason text not null check(char_length(reason) between 3 and 1000),
 banned_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
alter table public.daraya_account_bans enable row level security;
revoke all on public.daraya_account_bans from anon,authenticated;
drop policy if exists daraya_bans_read on public.daraya_account_bans;
create policy daraya_bans_read on public.daraya_account_bans for select to authenticated using(user_id=auth.uid() or public.is_admin());
grant select on public.daraya_account_bans to authenticated;
create or replace function public.daraya_account_is_banned(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from daraya_account_bans where user_id=p_user); $$;
revoke all on function public.daraya_account_is_banned(uuid) from public;
grant execute on function public.daraya_account_is_banned(uuid) to anon,authenticated;
drop policy if exists daraya_posts_read on public.daraya_posts;
create policy daraya_posts_read on public.daraya_posts for select using((status='active' and expires_at>now() and not public.daraya_account_is_banned(user_id)) or user_id=auth.uid() or public.is_admin());
create or replace function public.guard_daraya_banned_publisher()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if public.daraya_account_is_banned(new.user_id) and (new.status='active' or (not public.is_admin() and new.status<>'deleted')) then raise exception 'DARAYA_ACCOUNT_BANNED';end if;
 return new;
end;$$;
drop trigger if exists daraya_banned_publisher on public.daraya_posts;
create trigger daraya_banned_publisher before insert or update on public.daraya_posts for each row execute function public.guard_daraya_banned_publisher();
create or replace function public.ban_daraya_publisher(p_post uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Admin access required';end if;
 select user_id into target from daraya_posts where id=p_post;
 if target is null or target=auth.uid() then raise exception 'Account unavailable';end if;
 perform pg_advisory_xact_lock(hashtext('daraya-post:'||target::text));
 insert into daraya_account_bans(user_id,reason,banned_by) values(target,trim(p_reason),auth.uid()) on conflict(user_id) do update set reason=excluded.reason,banned_by=excluded.banned_by,created_at=now();
 update daraya_posts set status='hidden',updated_at=now() where user_id=target and status='active';
end;$$;
create or replace function public.unban_daraya_publisher(p_user uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Admin access required';end if;
 perform pg_advisory_xact_lock(hashtext('daraya-post:'||p_user::text));
 delete from daraya_account_bans where user_id=p_user;
end;$$;
create or replace function public.list_daraya_bans(p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Admin access required';end if;
 select coalesce(jsonb_agg(row_to_json(q)),'[]'::jsonb) into result from (
 select b.user_id,b.reason,b.created_at,u.email,(select p.title from daraya_posts p where p.user_id=b.user_id order by p.created_at desc limit 1) as last_title
 from daraya_account_bans b join auth.users u on u.id=b.user_id order by b.created_at desc limit 21 offset greatest(0,least(coalesce(p_offset,0),1000000))) q;
 return result;
end;$$;
revoke all on function public.ban_daraya_publisher(uuid,text),public.unban_daraya_publisher(uuid),public.list_daraya_bans(integer),public.guard_daraya_banned_publisher() from public,anon,authenticated;
grant execute on function public.ban_daraya_publisher(uuid,text),public.unban_daraya_publisher(uuid),public.list_daraya_bans(integer) to authenticated;
commit;
