-- Anonymous session counts. No names, IP addresses, emails or locations.
create table if not exists public.website_visit_sessions (
  visit_day date not null default ((now() at time zone 'Asia/Damascus')::date),
  session_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (visit_day, session_id)
);
alter table public.website_visit_sessions enable row level security;
revoke all on public.website_visit_sessions from anon, authenticated;
create or replace function public.record_website_visit(p_session uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_session is null then return; end if;
  if exists(select 1 from public.platform_admins where user_id=auth.uid()) then return; end if;
  insert into public.website_visit_sessions(session_id) values(p_session) on conflict do nothing;
end;
$$;
revoke all on function public.record_website_visit(uuid) from public;
grant execute on function public.record_website_visit(uuid) to anon,authenticated;
create or replace function public.website_visit_stats()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare d date := (now() at time zone 'Asia/Damascus')::date; result jsonb;
begin
  if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then
    raise exception 'Administrator access required';
  end if;
  select jsonb_build_object(
    'today',count(*) filter(where visit_day=d),
    'week',count(*) filter(where visit_day>=d-6),
    'month',count(*) filter(where visit_day>=d-29),
    'total',count(*),
    'started',min(visit_day)
  ) into result from public.website_visit_sessions;
  return result;
end;
$$;
revoke all on function public.website_visit_stats() from public;
grant execute on function public.website_visit_stats() to authenticated;

alter table public.website_visit_sessions add column if not exists visitor_id uuid;
create or replace function public.record_website_visit(p_session uuid,p_visitor uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if p_session is null or p_visitor is null then return; end if;
 if exists(select 1 from public.platform_admins where user_id=auth.uid()) then return; end if;
 insert into public.website_visit_sessions(session_id,visitor_id) values(p_session,p_visitor) on conflict do nothing;
end; $$;
revoke all on function public.record_website_visit(uuid,uuid) from public;
grant execute on function public.record_website_visit(uuid,uuid) to anon,authenticated;
create or replace function public.website_visit_stats()
returns jsonb language plpgsql security definer set search_path=public as $$
declare d date := (now() at time zone 'Asia/Damascus')::date; result jsonb;
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Administrator access required'; end if;
 select jsonb_build_object('today',count(*) filter(where visit_day=d),'week',count(*) filter(where visit_day>=d-6),'month',count(*) filter(where visit_day>=d-29),'total',count(*),'visitors',count(distinct visitor_id),'today_visitors',count(distinct visitor_id) filter(where visit_day=d),'started',min(visit_day)) into result from public.website_visit_sessions;
 return result;
end; $$;
