begin;
set local lock_timeout='5s';
-- Run AFTER 20261012_shop_cards.sql. Existing purchases and follow dates are preserved.
-- Disable former reward endpoints even for cached clients and old links.
create or replace function public.request_shop_reward(p_store uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
begin raise exception 'REWARDS_DISABLED'; end; $$;
create or replace function public.shop_reward_owner(p_token uuid,p_confirm boolean default false) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
begin raise exception 'REWARDS_DISABLED'; end; $$;
create or replace function public.save_shop_cards(p_store uuid,p_follow boolean,p_purchase boolean,p_count integer,p_total numeric,p_reward text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
begin raise exception 'REWARDS_DISABLED_USE_PURCHASE_HISTORY'; end; $$;
revoke all on function public.request_shop_reward(uuid),public.shop_reward_owner(uuid,boolean),public.save_shop_cards(uuid,boolean,boolean,integer,numeric,text) from public,anon,authenticated;
-- Archived redemption records remain private for deletion/audit, but cannot be used.
update public.shop_card_rewards set expires_at=least(expires_at,now()) where redeemed_at is null;
create index if not exists shop_purchase_history_member on public.shop_purchase_stamps(store_id,user_id,created_at);
create or replace function public.get_shop_cards(p_store uuid) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare c public.shop_card_settings%rowtype; f_at timestamptz; is_following boolean;
 n bigint:=0; amount numeric:=0; last_at timestamptz;
begin
 if not public.shop_cards_allowed(p_store) then raise exception 'CARDS_UNAVAILABLE'; end if;
 select * into c from public.shop_card_settings where store_id=p_store;
 select followed_at into f_at from public.customer_favorites where user_id=auth.uid() and store_id=p_store;
 is_following:=found;
 if c.purchase_enabled and auth.uid() is not null then
  -- All purchases across previous program versions and redemptions; no cycle reset.
  select count(*),coalesce(sum(s.amount),0),max(s.created_at)
  into n,amount,last_at from public.shop_purchase_stamps s
  where s.store_id=p_store and s.user_id=auth.uid();
 end if;
 return jsonb_build_object('history_only',true,
  'follow_enabled',coalesce(c.follow_enabled,false),'purchase_enabled',coalesce(c.purchase_enabled,false),
  'following',is_following,'followed_at',f_at,'lifetime_count',n,'lifetime_total',amount,'last_purchase_at',last_at,
  'count',n,'total',amount);
end; $$;
create or replace function public.save_shop_purchase_cards(p_store uuid,p_follow boolean,p_purchase boolean) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if auth.uid() is null or not public.manages_store(p_store) or not public.shop_cards_allowed(p_store) then raise exception 'OWNER_REQUIRED'; end if;
 if p_follow is null or p_purchase is null then raise exception 'INVALID_SETTINGS'; end if;
 perform pg_advisory_xact_lock(hashtext('shop-card:'||p_store::text));
 insert into public.shop_card_settings(store_id,follow_enabled,purchase_enabled)
 values(p_store,p_follow,p_purchase)
 on conflict(store_id) do update set follow_enabled=excluded.follow_enabled,purchase_enabled=excluded.purchase_enabled,updated_at=now();
 if not p_purchase then
  update public.shop_purchase_tokens set cancelled=true where store_id=p_store and used_at is null;
 end if;
 return public.get_shop_cards(p_store);
end; $$;
revoke all on function public.get_shop_cards(uuid),public.save_shop_purchase_cards(uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.get_shop_cards(uuid) to anon,authenticated;
grant execute on function public.save_shop_purchase_cards(uuid,boolean,boolean) to authenticated;
-- Disable legacy app/follower-only discount programs without changing their terms to public.
-- Standard, public shop price offers remain available and moderated.
create or replace function public.reject_exclusive_shop_offer() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare m jsonb;
begin
 begin m:=new.details::jsonb; exception when invalid_text_representation then m:='{}'::jsonb; end;
 if m->>'type'='daraya-shop-offer-v1' and m->>'exclusive'='true' then
  raise exception 'FOLLOWER_INCENTIVES_DISABLED';
 end if;
 return new;
end; $$;
-- Existing private/follower offers are withdrawn, not silently made public.
update public.daily_offers set status='rejected'
where details ~ '"exclusive"[[:space:]]*:[[:space:]]*true'
 and status in ('approved','pending');
drop trigger if exists reject_exclusive_shop_offer on public.daily_offers;
create trigger reject_exclusive_shop_offer before insert or update of details,status
on public.daily_offers for each row execute function public.reject_exclusive_shop_offer();
revoke all on function public.reject_exclusive_shop_offer() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
