begin;

create or replace function public.valid_offer_reminder_times(values_to_check text[])
returns boolean language sql immutable set search_path=public as $$
 select values_to_check is not null
   and cardinality(values_to_check) between 0 and 6
   and not exists(select 1 from unnest(values_to_check) t where t is null or t !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
   and cardinality(values_to_check)=(select count(distinct t) from unnest(values_to_check) t)
$$;

create table if not exists public.offer_reminder_settings (
 id boolean primary key default true check(id=true),
 enabled boolean not null default true,
 times text[] not null default array['11:00','18:00'],
 timezone text not null default 'Asia/Damascus' check(timezone='Asia/Damascus'),
 updated_at timestamptz not null default now(),
 constraint reminder_times_valid check(public.valid_offer_reminder_times(times)),
 constraint reminder_enabled_has_times check(not enabled or cardinality(times)>0)
);
insert into public.offer_reminder_settings(id) values(true) on conflict(id) do nothing;
alter table public.offer_reminder_settings enable row level security;
drop policy if exists offer_reminders_public_read on public.offer_reminder_settings;
create policy offer_reminders_public_read on public.offer_reminder_settings for select to anon,authenticated using(true);
drop policy if exists offer_reminders_admin_update on public.offer_reminder_settings;
create policy offer_reminders_admin_update on public.offer_reminder_settings for update to authenticated
 using(public.is_admin()) with check(public.is_admin());
revoke all on public.offer_reminder_settings from anon,authenticated;
grant select on public.offer_reminder_settings to anon,authenticated;
grant update(enabled,times) on public.offer_reminder_settings to authenticated;

create or replace function public.stamp_offer_reminder_settings()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now();return new;end;
$$;
drop trigger if exists stamp_offer_reminder_settings on public.offer_reminder_settings;
create trigger stamp_offer_reminder_settings before update on public.offer_reminder_settings
 for each row execute function public.stamp_offer_reminder_settings();

notify pgrst,'reload schema';
commit;
