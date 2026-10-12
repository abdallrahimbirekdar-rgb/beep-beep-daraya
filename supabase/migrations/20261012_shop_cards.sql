begin;
set local lock_timeout='5s';
alter table public.customer_favorites add column if not exists followed_at timestamptz;
-- Existing follows have unknown dates; only future inserts get a server timestamp.
alter table public.customer_favorites alter column followed_at set default now();
create or replace function public.stamp_shop_follow_date() returns trigger language plpgsql set search_path=pg_catalog,public as $$begin new.followed_at:=clock_timestamp();return new;end;$$;
drop trigger if exists stamp_shop_follow_date on public.customer_favorites;
create trigger stamp_shop_follow_date before insert on public.customer_favorites for each row execute function public.stamp_shop_follow_date();
create table if not exists public.shop_card_settings(
 store_id uuid primary key references public.stores(id) on delete cascade,
 follow_enabled boolean not null default false, purchase_enabled boolean not null default false,
 purchase_target integer not null default 5 check(purchase_target between 1 and 1000),
 total_target numeric not null default 0 check(total_target between 0 and 1000000000000),
 reward text not null default '' check(length(reward)<=500),
 program_version integer not null default 1, updated_at timestamptz not null default now());
create table if not exists public.shop_purchase_tokens(
 id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id) on delete cascade,
 issuer_id uuid references auth.users(id) on delete set null,amount numeric not null check(amount>0 and amount<=1000000000000),
 program_version integer not null,created_at timestamptz not null default now(),expires_at timestamptz not null default(now()+interval '10 minutes'),
 used_at timestamptz,used_by uuid references auth.users(id) on delete set null,cancelled boolean not null default false);
create table if not exists public.shop_purchase_stamps(
 id uuid primary key default gen_random_uuid(),token_id uuid not null unique references public.shop_purchase_tokens(id),
 store_id uuid not null references public.stores(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 amount numeric not null check(amount>0),program_version integer not null,created_at timestamptz not null default clock_timestamp());
create table if not exists public.shop_card_rewards(
 id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,program_version integer not null,
 cutoff_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null default(now()+interval '15 minutes'),redeemed_at timestamptz);
create index if not exists shop_stamps_member on public.shop_purchase_stamps(store_id,user_id,program_version,created_at);
create index if not exists shop_rewards_member on public.shop_card_rewards(store_id,user_id,program_version,redeemed_at);
create index if not exists shop_tokens_issuer on public.shop_purchase_tokens(store_id,issuer_id,created_at);
alter table public.shop_card_settings enable row level security;
alter table public.shop_purchase_tokens enable row level security;
alter table public.shop_purchase_stamps enable row level security;
alter table public.shop_card_rewards enable row level security;
revoke all on public.shop_card_settings,public.shop_purchase_tokens,public.shop_purchase_stamps,public.shop_card_rewards from public,anon,authenticated;
create or replace function public.shop_cards_allowed(sid uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.stores s where s.id=sid and s.active and s.deleted_at is null
 and coalesce(s.translations->'_directory'->>'kind',s.category,'') not in ('doctor','pharmacy','mosque')
 and coalesce(s.category,'') not in ('doctor','pharmacy','mosque')
 and (coalesce(s.name,'')||' '||coalesce(s.description,'')) !~ 'صيدل|طبيب|عيادة|دكتور|مسجد|جامع');$$;
create or replace function public.shop_card_progress(sid uuid,uid uuid,ver integer,cut timestamptz default clock_timestamp()) returns jsonb language sql volatile security definer set search_path=pg_catalog,public as $$
 select jsonb_build_object('count',count(*),'total',coalesce(sum(amount),0)) from public.shop_purchase_stamps
 where store_id=sid and user_id=uid and program_version=ver and created_at<=cut and created_at>coalesce((select max(cutoff_at) from public.shop_card_rewards where store_id=sid and user_id=uid and program_version=ver and redeemed_at is not null),'-infinity'::timestamptz);$$;
create or replace function public.get_shop_cards(p_store uuid) returns jsonb language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare c public.shop_card_settings%rowtype; f record; p jsonb;begin
 if not public.shop_cards_allowed(p_store) then raise exception 'CARDS_UNAVAILABLE';end if;
 select * into c from public.shop_card_settings where store_id=p_store;
 if c.store_id is null then return jsonb_build_object('follow_enabled',false,'purchase_enabled',false);end if;
 select followed_at into f from public.customer_favorites where user_id=auth.uid() and store_id=p_store;
 p:=public.shop_card_progress(p_store,auth.uid(),c.program_version);
 return jsonb_build_object('follow_enabled',c.follow_enabled,'purchase_enabled',c.purchase_enabled,'purchase_target',c.purchase_target,'total_target',c.total_target,'reward',c.reward,'program_version',c.program_version,'following',found,'followed_at',f.followed_at,'count',case when c.purchase_enabled then (p->>'count')::bigint else 0 end,'total',case when c.purchase_enabled then (p->>'total')::numeric else 0 end,
 'lifetime_count',case when c.purchase_enabled then (select count(*) from public.shop_purchase_stamps where store_id=p_store and user_id=auth.uid()) else 0 end,
 'eligible',c.purchase_enabled and (p->>'count')::bigint>=c.purchase_target and (p->>'total')::numeric>=c.total_target);
end;$$;
create or replace function public.save_shop_cards(p_store uuid,p_follow boolean,p_purchase boolean,p_count integer,p_total numeric,p_reward text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare old public.shop_card_settings%rowtype; changed boolean;begin
 if auth.uid() is null or not public.manages_store(p_store) or not public.shop_cards_allowed(p_store) then raise exception 'OWNER_REQUIRED';end if;
 if p_follow is null or p_purchase is null or p_count is null or p_count not between 1 and 1000 or p_total is null or p_total<0 or p_total>1000000000000 or p_reward is null or length(p_reward)>500 or (p_purchase and length(trim(p_reward))<3) then raise exception 'INVALID_SETTINGS';end if;
 perform pg_advisory_xact_lock(hashtext('shop-card:'||p_store::text));
 select * into old from public.shop_card_settings where store_id=p_store for update;
 changed:=old.store_id is not null and (old.purchase_target<>p_count or old.total_target<>p_total or old.reward<>trim(p_reward));
 insert into public.shop_card_settings(store_id,follow_enabled,purchase_enabled,purchase_target,total_target,reward) values(p_store,p_follow,p_purchase,p_count,p_total,trim(p_reward))
 on conflict(store_id) do update set follow_enabled=excluded.follow_enabled,purchase_enabled=excluded.purchase_enabled,purchase_target=excluded.purchase_target,total_target=excluded.total_target,reward=excluded.reward,program_version=shop_card_settings.program_version+case when changed then 1 else 0 end,updated_at=now();
 if changed or not p_purchase then update public.shop_purchase_tokens set cancelled=true where store_id=p_store and used_at is null;update public.shop_card_rewards set expires_at=now() where store_id=p_store and redeemed_at is null;end if;
 return public.get_shop_cards(p_store);
end;$$;
create or replace function public.issue_shop_purchase(p_store uuid,p_amount numeric) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.shop_card_settings%rowtype; x public.shop_purchase_tokens%rowtype;begin
 if auth.uid() is null or not public.manages_store(p_store) or not public.shop_cards_allowed(p_store) then raise exception 'OWNER_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtext('shop-card:'||p_store::text));
 select * into c from public.shop_card_settings where store_id=p_store for share;
 if c.store_id is null or not c.purchase_enabled then raise exception 'CARDS_DISABLED';end if;
 if p_amount is null or p_amount<=0 or p_amount>1000000000000 then raise exception 'INVALID_AMOUNT';end if;
 if (select count(*) from public.shop_purchase_tokens where store_id=p_store and issuer_id=auth.uid() and created_at>now()-interval '1 minute')>=20 then raise exception 'TRY_LATER';end if;
 update public.shop_purchase_tokens set cancelled=true where store_id=p_store and issuer_id=auth.uid() and used_at is null and not cancelled;
 insert into public.shop_purchase_tokens(store_id,issuer_id,amount,program_version) values(p_store,auth.uid(),p_amount,c.program_version) returning * into x;
 return jsonb_build_object('token',x.id,'amount',x.amount,'expires_at',x.expires_at,'store_id',p_store);
end;$$;
create or replace function public.preview_shop_purchase(p_token uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare x public.shop_purchase_tokens%rowtype;begin
 if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED';end if;
 select * into x from public.shop_purchase_tokens where id=p_token;
 if x.id is null or x.cancelled or x.expires_at<=now() or not public.shop_cards_allowed(x.store_id) or not exists(select 1 from public.shop_card_settings where store_id=x.store_id and purchase_enabled and program_version=x.program_version) then raise exception 'TOKEN_UNAVAILABLE';end if;
 if x.used_at is not null then if x.used_by=auth.uid() then return jsonb_build_object('already_claimed',true,'store_id',x.store_id);else raise exception 'TOKEN_USED';end if;end if;
 return jsonb_build_object('store_id',x.store_id,'store_name',(select name from public.stores where id=x.store_id),'amount',x.amount,'expires_at',x.expires_at);
end;$$;
create or replace function public.claim_shop_purchase(p_token uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare x public.shop_purchase_tokens%rowtype;c public.shop_card_settings%rowtype;begin
 if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED';end if;
 select * into x from public.shop_purchase_tokens where id=p_token;
 if x.id is null then raise exception 'TOKEN_UNAVAILABLE';end if;
 perform pg_advisory_xact_lock(hashtext('shop-card:'||x.store_id::text));
 select * into x from public.shop_purchase_tokens where id=p_token for update;
 select * into c from public.shop_card_settings where store_id=x.store_id for share;
 if not c.purchase_enabled or c.program_version<>x.program_version or not public.shop_cards_allowed(x.store_id) then raise exception 'CARDS_DISABLED';end if;
 if x.used_at is not null then if x.used_by=auth.uid() then return public.get_shop_cards(x.store_id)||jsonb_build_object('already_claimed',true,'store_id',x.store_id);else raise exception 'TOKEN_USED';end if;end if;
 if x.cancelled or x.expires_at<=now() then raise exception 'TOKEN_UNAVAILABLE';end if;
 if public.manages_store(x.store_id) then raise exception 'OWNER_CANNOT_CLAIM';end if;
 insert into public.shop_purchase_stamps(token_id,store_id,user_id,amount,program_version) values(x.id,x.store_id,auth.uid(),x.amount,x.program_version);
 update public.shop_purchase_tokens set used_at=now(),used_by=auth.uid() where id=x.id;
 return public.get_shop_cards(x.store_id)||jsonb_build_object('store_id',x.store_id);
end;$$;
create or replace function public.request_shop_reward(p_store uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.shop_card_settings%rowtype;p jsonb;x public.shop_card_rewards%rowtype;begin
 if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtext('shop-card:'||p_store::text));
 select * into c from public.shop_card_settings where store_id=p_store for share;
 if c.store_id is null or not c.purchase_enabled or not public.shop_cards_allowed(p_store) then raise exception 'CARDS_DISABLED';end if;
 p:=public.shop_card_progress(p_store,auth.uid(),c.program_version);
 if (p->>'count')::bigint<c.purchase_target or (p->>'total')::numeric<c.total_target then raise exception 'REWARD_NOT_READY';end if;
 select * into x from public.shop_card_rewards where store_id=p_store and user_id=auth.uid() and program_version=c.program_version and redeemed_at is null and expires_at>now() order by cutoff_at desc limit 1;
 if x.id is null then insert into public.shop_card_rewards(store_id,user_id,program_version) values(p_store,auth.uid(),c.program_version) returning * into x;end if;
 return jsonb_build_object('token',x.id,'expires_at',x.expires_at,'reward',c.reward);
end;$$;
create or replace function public.shop_reward_owner(p_token uuid,p_confirm boolean default false) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare x public.shop_card_rewards%rowtype;c public.shop_card_settings%rowtype;p jsonb;begin
 if auth.uid() is null then raise exception 'OWNER_REQUIRED';end if;
 select * into x from public.shop_card_rewards where id=p_token;
 if x.id is null or not public.manages_store(x.store_id) then raise exception 'OWNER_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtext('shop-card:'||x.store_id::text));
 select * into x from public.shop_card_rewards where id=p_token for update;
 select * into c from public.shop_card_settings where store_id=x.store_id for share;
 if c.store_id is null or not c.purchase_enabled or c.program_version<>x.program_version or not public.shop_cards_allowed(x.store_id) then raise exception 'CARDS_DISABLED';end if;
 if x.redeemed_at is not null then return jsonb_build_object('already_redeemed',true,'store_id',x.store_id);end if;
 if x.expires_at<=now() then raise exception 'TOKEN_UNAVAILABLE';end if;
 p:=public.shop_card_progress(x.store_id,x.user_id,x.program_version,x.cutoff_at);
 if (p->>'count')::bigint<c.purchase_target or (p->>'total')::numeric<c.total_target then raise exception 'REWARD_NOT_READY';end if;
 if p_confirm then update public.shop_card_rewards set redeemed_at=now() where id=x.id;end if;
 return jsonb_build_object('confirmed',p_confirm,'store_id',x.store_id,'store_name',(select name from public.stores where id=x.store_id),'reward',c.reward);
end;$$;
revoke all on function public.shop_cards_allowed(uuid),public.shop_card_progress(uuid,uuid,integer,timestamptz) from public,anon,authenticated;
revoke all on function public.get_shop_cards(uuid),public.save_shop_cards(uuid,boolean,boolean,integer,numeric,text),public.issue_shop_purchase(uuid,numeric),public.preview_shop_purchase(uuid),public.claim_shop_purchase(uuid),public.request_shop_reward(uuid),public.shop_reward_owner(uuid,boolean) from public,anon,authenticated;
grant execute on function public.get_shop_cards(uuid) to anon,authenticated;
grant execute on function public.save_shop_cards(uuid,boolean,boolean,integer,numeric,text),public.issue_shop_purchase(uuid,numeric),public.preview_shop_purchase(uuid),public.claim_shop_purchase(uuid),public.request_shop_reward(uuid),public.shop_reward_owner(uuid,boolean) to authenticated;
commit;
