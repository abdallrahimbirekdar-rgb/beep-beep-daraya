-- Daily aggregate only: no visitor, session, IP, device, or account identifiers.
create table public.android_download_daily (
 download_day date primary key,
 requests bigint not null default 0 check (requests >= 0)
);
alter table public.android_download_daily enable row level security;
revoke all on public.android_download_daily from public,anon,authenticated;
comment on table public.android_download_daily is 'Website APK link requests by Damascus date; not completed downloads or installations. No per-person records.';
create or replace function public.record_android_download()
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if exists(select 1 from public.platform_admins where user_id=auth.uid()) then return; end if;
 insert into public.android_download_daily as counts(download_day,requests)
 values((now() at time zone 'Asia/Damascus')::date,1)
 on conflict(download_day) do update set requests=counts.requests+1;
end;
$$;
revoke all on function public.record_android_download() from public,anon,authenticated;
grant execute on function public.record_android_download() to anon,authenticated;
create or replace function public.admin_android_download_stats()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare d date:=(now() at time zone 'Asia/Damascus')::date;
begin
 if auth.uid() is null or not exists(select 1 from public.platform_admins where user_id=auth.uid()) then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 return (select jsonb_build_object('total',coalesce(sum(requests),0),'today',coalesce(sum(requests) filter(where download_day=d),0),'week',coalesce(sum(requests) filter(where download_day>=d-6),0),'month',coalesce(sum(requests) filter(where download_day>=d-29),0),'started',min(download_day)) from public.android_download_daily);
end;
$$;
revoke all on function public.admin_android_download_stats() from public,anon,authenticated;
grant execute on function public.admin_android_download_stats() to authenticated;
