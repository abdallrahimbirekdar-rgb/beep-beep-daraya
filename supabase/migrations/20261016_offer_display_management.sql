begin;
-- Independent of merchant-owned offer content: only platform admins can write rules.
create table if not exists public.offer_display_rules (
 kind text not null check(kind in ('shop','offer')),
 target_id uuid not null,
 manual_rank integer check(manual_rank between 1 and 100000),
 tier text not null default 'normal' check(tier in ('normal','gold','diamond')),
 starts_at timestamptz,
 ends_at timestamptz,
 pinned_until timestamptz,
 hidden boolean not null default false,
 revision integer not null default 1,
 updated_at timestamptz not null default now(),
 primary key(kind,target_id),
 check(tier='normal' or (starts_at is not null and ends_at is not null and ends_at>starts_at))
);
alter table public.offer_display_rules enable row level security;
revoke all on public.offer_display_rules from public,anon,authenticated;
grant select on public.offer_display_rules to anon,authenticated;
drop policy if exists offer_display_public_read on public.offer_display_rules;
create policy offer_display_public_read on public.offer_display_rules for select to anon,authenticated using(true);

create or replace function public.offer_display_level(r public.offer_display_rules)
returns integer language sql stable set search_path=public as $$
 select case when r.starts_at<=now() and r.ends_at>now() then case r.tier when 'diamond' then 2 when 'gold' then 1 else 0 end else 0 end
$$;
revoke all on function public.offer_display_level(public.offer_display_rules) from public;
grant execute on function public.offer_display_level(public.offer_display_rules) to anon,authenticated;

-- This restrictive policy supplements existing approval, ban and owner policies.
-- Owners/admins may still inspect hidden records, visitors cannot fetch them directly.
drop policy if exists offer_display_visibility on public.daily_offers;
create policy offer_display_visibility on public.daily_offers as restrictive for select to anon,authenticated using(
 user_id=auth.uid() or public.is_admin() or not exists(
  select 1 from public.offer_display_rules r where r.hidden and
   ((r.kind='offer' and r.target_id=daily_offers.id) or (r.kind='shop' and r.target_id=daily_offers.store_id))
 )
);

create or replace function public.save_offer_display_rules(p_changes jsonb)
returns setof public.offer_display_rules language plpgsql security definer set search_path=public as $$
declare item jsonb; old_revision integer; result public.offer_display_rules;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 1000 then raise exception 'INVALID_CHANGES';end if;
 for item in select value from jsonb_array_elements(p_changes) loop
  if item->>'kind' not in ('shop','offer') or item->>'target_id' is null then raise exception 'INVALID_TARGET';end if;
  if item->>'kind'='shop' then
   if not exists(select 1 from public.stores where id=(item->>'target_id')::uuid) then raise exception 'SHOP_NOT_FOUND';end if;
  elsif not exists(select 1 from public.daily_offers where id=(item->>'target_id')::uuid) then raise exception 'OFFER_NOT_FOUND';end if;
  old_revision:=coalesce((item->>'revision')::integer,0);
  insert into public.offer_display_rules as existing(kind,target_id,manual_rank,tier,starts_at,ends_at,pinned_until,hidden)
  values(item->>'kind',(item->>'target_id')::uuid,(item->>'manual_rank')::integer,coalesce(item->>'tier','normal'),
   (item->>'starts_at')::timestamptz,(item->>'ends_at')::timestamptz,(item->>'pinned_until')::timestamptz,coalesce((item->>'hidden')::boolean,false))
  on conflict(kind,target_id) do update set manual_rank=excluded.manual_rank,tier=excluded.tier,starts_at=excluded.starts_at,
   ends_at=excluded.ends_at,pinned_until=excluded.pinned_until,hidden=excluded.hidden,revision=existing.revision+1,updated_at=now()
   where existing.revision=old_revision
  returning * into result;
  if not found then raise exception 'DISPLAY_RULE_CHANGED_RELOAD';end if;
  -- A stale edit must not recreate a deleted rule with a nonzero expected revision.
  if result.revision=1 and old_revision<>0 then raise exception 'DISPLAY_RULE_CHANGED_RELOAD';end if;
  return next result;
 end loop;
end;
$$;
revoke all on function public.save_offer_display_rules(jsonb) from public,anon;
grant execute on function public.save_offer_display_rules(jsonb) to authenticated;

-- Order before pagination so an older promoted shop is never buried on a later page.
create or replace function public.list_display_daily_offers(p_offset integer default 0,p_limit integer default 20,p_store uuid default null,p_following uuid[] default null)
returns setof public.daily_offers language sql stable security invoker set search_path=public as $$
 with ranked as (
  select o, o.store_id sid, o.created_at created, o.id oid, sr.manual_rank shop_rank, ar.manual_rank offer_rank,
   greatest(public.offer_display_level(sr),public.offer_display_level(ar)) level,
   coalesce(sr.pinned_until>now(),false) or coalesce(ar.pinned_until>now(),false) pinned
  from public.daily_offers o
  left join public.offer_display_rules sr on sr.kind='shop' and sr.target_id=o.store_id
  left join public.offer_display_rules ar on ar.kind='offer' and ar.target_id=o.id
  where o.status='approved' and o.ends_at>now() and o.store_id is not null and not coalesce(sr.hidden,false) and not coalesce(ar.hidden,false)
   and (p_store is null or o.store_id=p_store) and (p_following is null or o.store_id=any(p_following))
 ), grouped as (
  select *,max(pinned::integer) over(partition by sid) shop_pin,max(level) over(partition by sid) shop_level,max(created) over(partition by sid) newest from ranked
 )
 select (o).* from grouped order by coalesce(shop_rank,2147483647),shop_pin desc,shop_level desc,newest desc,sid,
  coalesce(offer_rank,2147483647),pinned desc,level desc,created desc,oid desc
 offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,20),1),100)
$$;
revoke all on function public.list_display_daily_offers(integer,integer,uuid,uuid[]) from public;
grant execute on function public.list_display_daily_offers(integer,integer,uuid,uuid[]) to anon,authenticated;

-- Small ordering index includes promoted offers outside the current page.
create or replace function public.get_offer_display_shop_order()
returns table(store_id uuid) language sql stable security invoker set search_path=public as $$
 select o.store_id from public.daily_offers o
 left join public.offer_display_rules sr on sr.kind='shop' and sr.target_id=o.store_id
 left join public.offer_display_rules ar on ar.kind='offer' and ar.target_id=o.id
 where o.status='approved' and o.ends_at>now() and o.store_id is not null and not coalesce(sr.hidden,false) and not coalesce(ar.hidden,false)
 group by o.store_id,sr.manual_rank
 order by coalesce(sr.manual_rank,2147483647),
  max((coalesce(sr.pinned_until>now(),false) or coalesce(ar.pinned_until>now(),false))::integer) desc,
  max(greatest(public.offer_display_level(sr),public.offer_display_level(ar))) desc,max(o.created_at) desc,o.store_id
$$;
revoke all on function public.get_offer_display_shop_order() from public;
grant execute on function public.get_offer_display_shop_order() to anon,authenticated;

create or replace function public.clean_offer_display_rules() returns trigger language plpgsql security definer set search_path=public as $$
begin
 delete from public.offer_display_rules where kind=case when tg_table_name='stores' then 'shop' else 'offer' end and target_id=old.id;
 return old;
end;
$$;
revoke all on function public.clean_offer_display_rules() from public,anon,authenticated;
drop trigger if exists clean_shop_display_rules on public.stores;
create trigger clean_shop_display_rules after delete on public.stores for each row execute function public.clean_offer_display_rules();
drop trigger if exists clean_offer_display_rules on public.daily_offers;
create trigger clean_offer_display_rules after delete on public.daily_offers for each row execute function public.clean_offer_display_rules();
notify pgrst,'reload schema';
commit;
