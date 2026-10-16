-- Community ideas: review before publication; one authenticated vote per idea.
begin;
create table if not exists public.community_ideas (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(btrim(title)) between 5 and 120),
 details text not null check (char_length(btrim(details)) between 10 and 2000),
 category text not null default 'idea' check (category in ('idea','service','improvement','problem')),
 status text not null default 'pending' check (status in ('pending','rejected','published','in_progress','implemented')),
 author_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
create table if not exists public.community_idea_votes (
 idea_id uuid not null references public.community_ideas(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (idea_id,user_id)
);
create index if not exists community_ideas_status_date on public.community_ideas(status,created_at desc);
alter table public.community_ideas enable row level security;
alter table public.community_idea_votes enable row level security;
revoke all on public.community_ideas,public.community_idea_votes from public,anon,authenticated;
-- Do not expose pending rows or raw voter identities to clients.
create or replace function public.community_ideas_public()
returns table(id uuid,title text,details text,category text,status text,created_at timestamptz,votes bigint)
language sql stable security definer set search_path=public as $$
 select i.id,i.title,i.details,i.category,i.status,i.created_at,count(v.user_id)
 from public.community_ideas i left join public.community_idea_votes v on v.idea_id=i.id
 where i.status in ('published','in_progress','implemented')
 group by i.id order by count(v.user_id) desc,i.created_at desc limit 100
$$;
create or replace function public.community_idea_submit(p_title text,p_details text,p_category text default 'idea')
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'سجل الدخول لإرسال اقتراح'; end if;
 if length(btrim(coalesce(p_title,''))) not between 5 and 120
 or length(btrim(coalesce(p_details,''))) not between 10 and 2000
 or coalesce(p_category,'') not in ('idea','service','improvement','problem') then
  raise exception 'تحقق من عنوان الاقتراح وتفاصيله';
 end if;
 -- Authenticated submissions only; retain global and per-account throttles.
 perform pg_advisory_xact_lock(hashtext('community_idea_submit'));
 if (select count(*) from public.community_ideas where created_at>now()-interval '1 minute')>=12 then
  raise exception 'طلبات كثيرة حاليًا، حاول لاحقًا';
 end if;
 if exists (
  select 1 from public.community_ideas where author_id=auth.uid()
  and created_at>now()-interval '10 minutes') then
  raise exception 'انتظر 10 دقائق قبل إرسال اقتراح آخر';
 end if;
 insert into public.community_ideas(title,details,category,author_id)
 values (btrim(p_title),btrim(p_details),p_category,auth.uid()) returning id into result;
 return result;
end;$$;
create or replace function public.community_idea_vote(p_id uuid,p_vote boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'سجل الدخول للتصويت';end if;
 if not exists(select 1 from public.community_ideas where id=p_id and status in ('published','in_progress','implemented')) then
  raise exception 'هذا الاقتراح غير متاح للتصويت';
 end if;
 if p_vote then
  insert into public.community_idea_votes(idea_id,user_id) values(p_id,auth.uid()) on conflict do nothing;
 else
  delete from public.community_idea_votes where idea_id=p_id and user_id=auth.uid();
 end if;
end;$$;
create or replace function public.community_ideas_admin()
returns setof public.community_ideas language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'غير مسموح';end if;
 return query select * from public.community_ideas order by created_at desc limit 200;
end;$$;
create or replace function public.community_idea_moderate(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'غير مسموح';end if;
 if p_status not in ('pending','rejected','published','in_progress','implemented') then
  raise exception 'حالة غير صالحة';
 end if;
 update public.community_ideas set status=p_status,reviewed_at=now() where id=p_id;
 if not found then raise exception 'الاقتراح غير موجود';end if;
end;$$;
revoke all on function public.community_ideas_public(),public.community_idea_submit(text,text,text),public.community_idea_vote(uuid,boolean),public.community_ideas_admin(),public.community_idea_moderate(uuid,text) from public,anon,authenticated;
grant execute on function public.community_ideas_public() to anon,authenticated;
-- Only signed-in users can submit; the RPC itself also checks auth.uid().
grant execute on function public.community_idea_submit(text,text,text) to authenticated;
grant execute on function public.community_idea_vote(uuid,boolean),public.community_ideas_admin(),public.community_idea_moderate(uuid,text) to authenticated;
commit;
