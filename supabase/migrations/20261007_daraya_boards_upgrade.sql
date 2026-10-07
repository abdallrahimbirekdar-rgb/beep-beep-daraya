begin;
alter table public.daraya_posts add column if not exists price bigint check(price between 0 and 1000000000000);
alter table public.daraya_posts add column if not exists negotiable boolean not null default false;
alter table public.daraya_posts add column if not exists expires_at timestamptz not null default now()+interval '30 days';
alter table public.daraya_posts drop constraint if exists daraya_posts_status_check;
alter table public.daraya_posts add constraint daraya_posts_status_check check(status in ('active','closed','hidden','deleted'));
drop policy if exists daraya_posts_read on public.daraya_posts;
create policy daraya_posts_read on public.daraya_posts for select using((status='active' and expires_at>now()) or user_id=auth.uid() or public.is_admin());
create or replace function public.save_daraya_post_v2(p_id uuid,p_kind text,p_title text,p_details text,p_phone text,p_image text,p_video text,p_price bigint,p_negotiable boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare existing daraya_posts%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if p_kind='used' and coalesce(p_image,'')='' and coalesce(p_video,'')='' then raise exception 'Photo or video required';end if;
 perform pg_advisory_xact_lock(hashtext('daraya-post:'||auth.uid()::text));
 select * into existing from daraya_posts where id=p_id for update;
 if found then
  if existing.user_id<>auth.uid() or existing.status not in ('active','closed') or existing.kind<>p_kind then raise exception 'Post unavailable';end if;
  update daraya_posts set title=trim(p_title),details=trim(p_details),phone=trim(p_phone),image=p_image,video=p_video,price=case when p_kind='used' then p_price end,negotiable=p_kind='used' and coalesce(p_negotiable,false),updated_at=now() where id=p_id;
 else
  if (select count(*) from daraya_posts where user_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Daily post limit';end if;
  insert into daraya_posts(id,user_id,kind,title,details,phone,image,video,price,negotiable) values(p_id,auth.uid(),p_kind,trim(p_title),trim(p_details),trim(p_phone),p_image,p_video,case when p_kind='used' then p_price end,p_kind='used' and coalesce(p_negotiable,false));
 end if;return p_id;
end;$$;
create or replace function public.manage_daraya_post(p_id uuid,p_action text)
returns void language plpgsql security definer set search_path=public as $$
declare p daraya_posts%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 perform pg_advisory_xact_lock(hashtext('daraya-manage:'||auth.uid()::text));
 select * into p from daraya_posts where id=p_id for update;
 if not found then raise exception 'Post unavailable';end if;
 if p_action='restore' and public.is_admin() and p.status='hidden' then
  update daraya_posts set status='active',expires_at=now()+interval '30 days',updated_at=now() where id=p_id;
 elsif p.user_id=auth.uid() and p.status in ('active','closed') then
  if p_action='close' then update daraya_posts set status='closed',updated_at=now() where id=p_id;
  elsif p_action='renew' then update daraya_posts set status='active',expires_at=now()+interval '30 days',updated_at=now() where id=p_id;
  else raise exception 'Action unavailable';end if;
 else raise exception 'Access denied';end if;
end;$$;
revoke all on function public.save_daraya_post_v2(uuid,text,text,text,text,text,text,bigint,boolean),public.manage_daraya_post(uuid,text) from public,anon,authenticated;
grant execute on function public.save_daraya_post_v2(uuid,text,text,text,text,text,text,bigint,boolean),public.manage_daraya_post(uuid,text) to authenticated;
commit;
