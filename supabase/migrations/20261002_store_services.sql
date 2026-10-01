begin;
alter table public.stores add column if not exists online_ordering boolean not null default true;
alter table public.stores alter column auto_hours set default true;
alter table public.stores drop constraint if exists store_fulfillment;
alter table public.stores add constraint store_fulfillment check(not online_ordering or delivery_enabled or pickup_enabled);
grant select(online_ordering) on public.stores to anon,authenticated;
create or replace function public.store_open_hours(s public.stores,at_time timestamptz default now()) returns boolean language plpgsql stable set search_path=public as $$
declare local_time timestamp:=at_time at time zone 'Asia/Damascus'; keys text[]:=array['sun','mon','tue','wed','thu','fri','sat']; day integer:=extract(dow from local_time)::integer; h jsonb; yesterday jsonb; clock time:=local_time::time;
begin
 if not s.active then return false;end if;
 if s.opening_hours='{}'::jsonb then return s.is_open;end if;
 h:=s.opening_hours->keys[day+1];yesterday:=s.opening_hours->keys[((day+6)%7)+1];
 if h is not null and coalesce((h->>'closed')::boolean,true)=false and (h->>'open') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and (h->>'close') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
  if (h->>'open')::time<(h->>'close')::time and clock>=(h->>'open')::time and clock<(h->>'close')::time then return true;end if;
  if (h->>'open')::time>(h->>'close')::time and clock>=(h->>'open')::time then return true;end if;
 end if;
 if yesterday is not null and coalesce((yesterday->>'closed')::boolean,true)=false and (yesterday->>'open') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and (yesterday->>'close') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and (yesterday->>'open')::time>(yesterday->>'close')::time and clock<(yesterday->>'close')::time then return true;end if;
 return false;
exception when others then return false;
end;$$;
create or replace function public.store_accepts_orders(s public.stores,at_time timestamptz default now()) returns boolean language sql stable set search_path=public as $$
 select s.active and s.is_open and s.online_ordering and (s.delivery_enabled or s.pickup_enabled) and public.store_open_hours(s,at_time);
$$;
update public.stores set auto_hours=true where auto_hours=false and opening_hours<>'{}'::jsonb;
update public.stores set online_ordering=false,delivery_enabled=false,pickup_enabled=false,delivery_fee=0,minimum_order=0 where name in ('أناقة داريا الرجالية','لمسة للألبسة النسائية','صغار داريا','داريا فون للإكسسوارات');
-- Assertions use in-memory records, never insert fake orders or modify real stock.
do $$
declare s public.stores;
begin
 select * into strict s from public.stores limit 1;
 s.active:=true;s.is_open:=true;s.online_ordering:=true;s.delivery_enabled:=true;s.pickup_enabled:=false;s.auto_hours:=false;
 s.opening_hours:='{"wed":{"closed":false,"open":"18:00","close":"02:00"},"thu":{"closed":true}}';
 if not public.store_accepts_orders(s,'2026-10-01T00:30:00+03:00') then raise exception 'overnight opening failed';end if;
 if public.store_accepts_orders(s,'2026-10-01T02:00:00+03:00') then raise exception 'closing boundary failed';end if;
 s.online_ordering:=false;
 if public.store_accepts_orders(s,'2026-10-01T00:30:00+03:00') then raise exception 'catalogue accepted order';end if;
 if not public.store_open_hours(s,'2026-10-01T00:30:00+03:00') then raise exception 'catalogue opening status failed';end if;
 s.online_ordering:=true;s.is_open:=false;
 if public.store_accepts_orders(s,'2026-10-01T00:30:00+03:00') then raise exception 'manual pause failed';end if;
 if not public.store_open_hours(s,'2026-10-01T00:30:00+03:00') then raise exception 'physical opening changed by order pause';end if;
end;$$;
commit;
select name,online_ordering,delivery_enabled,pickup_enabled,public.store_open_hours(stores) as open_now,public.store_accepts_orders(stores) as accepts_orders from public.stores order by name;
