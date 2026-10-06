begin;
create table if not exists public.daraya_posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('used','ads')), title text not null check(char_length(title) between 3 and 150),
 details text not null check(char_length(details) between 3 and 3000), phone text not null check(phone ~ '^\+?[0-9 ()-]{7,25}$'),
 image text not null default '' check(char_length(image)<=300000 and (image='' or image ~ '^data:image/webp;base64,[A-Za-z0-9+/=]+$')),
 video text not null default '' check(char_length(video)<=2000 and (video='' or video ~ '^https://')),
 status text not null default 'active' check(status in ('active','hidden','deleted')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists daraya_posts_feed on public.daraya_posts(kind,created_at desc) where status='active';
create table if not exists public.daraya_post_reports (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.daraya_posts(id), reporter uuid not null,
 reason text not null check(char_length(reason) between 3 and 1000), status text not null default 'new' check(status in ('new','resolved')),
 created_at timestamptz not null default now(), unique(post_id,reporter)
);
alter table public.daraya_posts enable row level security;
alter table public.daraya_post_reports enable row level security;
revoke all on public.daraya_posts,public.daraya_post_reports from anon,authenticated;
drop policy if exists daraya_posts_read on public.daraya_posts;
create policy daraya_posts_read on public.daraya_posts for select using(status='active' or user_id=auth.uid() or public.is_admin());
drop policy if exists daraya_reports_read on public.daraya_post_reports;
create policy daraya_reports_read on public.daraya_post_reports for select to authenticated using(public.is_admin());
grant select on public.daraya_posts to anon,authenticated;
grant select on public.daraya_post_reports to authenticated;
create or replace function public.save_daraya_post(p_id uuid,p_kind text,p_title text,p_details text,p_phone text,p_image text,p_video text)
returns uuid language plpgsql security definer set search_path=public as $$
declare existing daraya_posts%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if p_kind='used' and coalesce(p_image,'')='' and coalesce(p_video,'')='' then raise exception 'Photo or video required';end if;
 perform pg_advisory_xact_lock(hashtext('daraya-post:'||auth.uid()::text));
 select * into existing from daraya_posts where id=p_id for update;
 if found then
  if existing.user_id<>auth.uid() or existing.status<>'active' then raise exception 'Post unavailable';end if;
  update daraya_posts set title=trim(p_title),details=trim(p_details),phone=trim(p_phone),image=p_image,video=p_video,updated_at=now() where id=p_id;
 else
  if (select count(*) from daraya_posts where user_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Daily post limit';end if;
  insert into daraya_posts(id,user_id,kind,title,details,phone,image,video) values(p_id,auth.uid(),p_kind,trim(p_title),trim(p_details),trim(p_phone),p_image,p_video);
 end if;
 return p_id;
end;$$;
create or replace function public.delete_daraya_post(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 update daraya_posts set status='deleted',updated_at=now() where id=p_id and (user_id=auth.uid() or public.is_admin());
 if not found then raise exception 'Post unavailable';end if;
end;$$;
create or replace function public.report_daraya_post(p_post uuid,p_reporter uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if p_reporter is null then raise exception 'Reporter required';end if;
 perform pg_advisory_xact_lock(hashtext('daraya-report:'||p_reporter::text));
 if not exists(select 1 from daraya_posts where id=p_post and status='active') then raise exception 'Post unavailable';end if;
 if (select count(*) from daraya_post_reports where reporter=p_reporter and created_at>now()-interval '1 day')>=10 then raise exception 'Daily report limit';end if;
 insert into daraya_post_reports(post_id,reporter,reason) values(p_post,p_reporter,trim(p_reason)) on conflict(post_id,reporter) do nothing;
end;$$;
create or replace function public.review_daraya_report(p_report uuid,p_hide boolean)
returns void language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Admin access required';end if;
 select post_id into target from daraya_post_reports where id=p_report for update;
 if not found then raise exception 'Report unavailable';end if;
 if p_hide then update daraya_posts set status='hidden',updated_at=now() where id=target and status='active';end if;
 update daraya_post_reports set status='resolved' where id=p_report;
end;$$;
revoke all on function public.save_daraya_post(uuid,text,text,text,text,text,text),public.delete_daraya_post(uuid),public.report_daraya_post(uuid,uuid,text),public.review_daraya_report(uuid,boolean) from public,anon,authenticated;
grant execute on function public.save_daraya_post(uuid,text,text,text,text,text,text),public.delete_daraya_post(uuid),public.review_daraya_report(uuid,boolean) to authenticated;
grant execute on function public.report_daraya_post(uuid,uuid,text) to anon,authenticated;
commit;
