-- Admin deletion API. No existing account is deleted by this setup script.
create schema if not exists daraya_private;
revoke all on schema daraya_private from public, anon;
grant usage on schema daraya_private to authenticated;

create table public.account_deletion_audit (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null,
 deleted_user_id uuid not null,
 source text not null check(source in ('email','in_app')),
 request_id uuid,
 orders_anonymized integer not null,
 created_at timestamptz not null default now()
);
alter table public.account_deletion_audit enable row level security;
revoke all on public.account_deletion_audit from public, anon, authenticated;
grant select on public.account_deletion_audit to authenticated;
create policy deletion_audit_admin_read on public.account_deletion_audit
 for select to authenticated using ((select public.is_admin()));

create function daraya_private.admin_deletion_state(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u record; reasons text[]:='{}'; shops jsonb; open_orders integer; open_bookings integer;
 files integer; media integer; identity text;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 select id,email,created_at into u from auth.users where id=p_user;
 if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 identity:=case when u.email ~ '^[0-9]+@phone[.]damascus-shop[.]invalid$' then '+'||split_part(u.email,'@',1) else u.email end;
 if auth.uid()=p_user then reasons:=array_append(reasons,'SELF_ACCOUNT'); end if;
 if exists(select 1 from public.platform_admins where user_id=p_user)
 or exists(select 1 from public.daraya_account_bans where banned_by=p_user)
 then reasons:=array_append(reasons,'ADMIN_ACCOUNT'); end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name)),'[]') into shops
 from public.stores where lower(owner_email)=lower(u.email);
 if jsonb_array_length(shops)>0
 or exists(select 1 from public.store_drivers where user_id=p_user or lower(email)=lower(u.email))
 or exists(select 1 from public.business_applications where owner_id=p_user and store_id is not null)
 then reasons:=array_append(reasons,'BUSINESS_ACCOUNT'); end if;
 select count(*) into open_orders from public.orders where customer_id=p_user and status not in ('تم التسليم','ملغي');
 select count(*) into open_bookings from public.service_bookings where user_id=p_user and status in ('new','accepted');
 if open_orders+open_bookings>0 then reasons:=array_append(reasons,'ACTIVE_TRANSACTIONS'); end if;
 select count(*) into files from storage.objects where owner_id=p_user::text or owner=p_user;
 -- External media needs provider-side cleanup, not SQL deletion of metadata alone.
 select count(*) into media from public.daraya_posts where user_id=p_user and nullif(image,'') is not null and image not like 'data:%';
 if files+media>0 then reasons:=array_append(reasons,'STORED_FILES'); end if;
 return jsonb_build_object('user_id',u.id,'identity',identity,'created_at',u.created_at,
 'display_name',(select display_name from public.customer_profiles where user_id=p_user),
 'eligible',cardinality(reasons)=0,'blockers',to_jsonb(reasons),'shops',shops,
 'open_orders',open_orders,'open_bookings',open_bookings,'stored_files',files,'external_media',media,
 'orders',(select count(*) from public.orders where customer_id=p_user),
 'favorites',(select count(*) from public.customer_favorites where user_id=p_user),
 'posts',(select count(*) from public.daraya_posts where user_id=p_user),
 'drafts',(select count(*) from public.business_applications where owner_id=p_user),
 'purchases',(select count(*) from public.shop_purchase_stamps where user_id=p_user));
end; $$;

create function daraya_private.admin_deletion_preview(p_identity text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; value text:=lower(btrim(p_identity));
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if value is null or length(value)<3 or length(value)>254 then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 if value ~ '^\+[0-9]{8,15}$' then value:=substring(value from 2)||'@phone.damascus-shop.invalid'; end if;
 select id into target from auth.users where lower(email)=value;
 if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 return daraya_private.admin_deletion_state(target);
end; $$;

create function daraya_private.admin_deletion_requests()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 return coalesce((select jsonb_agg(row_to_json(r)) from
 (select d.id,d.user_id,d.note,d.created_at,u.email
 from public.customer_data_requests d join auth.users u on u.id=d.user_id
 where d.kind='deletion' and d.status='pending' order by d.created_at,d.id limit 100) r),'[]');
end; $$;

create function daraya_private.admin_delete_account(p_user uuid,p_confirmation text,p_verified boolean,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare state jsonb; changed integer; receipt uuid; actor uuid:=auth.uid();
begin
 if actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_verified is distinct from true then raise exception 'VERIFICATION_REQUIRED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user::text));
 perform 1 from auth.users where id=p_user for update;
 if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 -- Serialize status changes and recheck all blockers at execution time.
 perform 1 from public.orders where customer_id=p_user for update;
 perform 1 from public.service_bookings where user_id=p_user for update;
 state:=daraya_private.admin_deletion_state(p_user);
 if p_confirmation is distinct from ('DELETE '||(state->>'identity')) then raise exception 'CONFIRMATION_REQUIRED'; end if;
 if not (state->>'eligible')::boolean then raise exception 'ACCOUNT_NEEDS_HANDLING'; end if;
 if p_request is not null and not exists(select 1 from public.customer_data_requests where id=p_request and user_id=p_user and kind='deletion') then raise exception 'REQUEST_MISMATCH'; end if;
 delete from public.order_driver_locations where order_id in (select id from public.orders where customer_id=p_user);
 update public.orders set customer_id=null,customer_name='حساب محذوف',phone='',address='',area='',notes='',
 latitude=null,longitude=null,tracking_token=pg_catalog.gen_random_uuid() where customer_id=p_user;
 get diagnostics changed = row_count;
 delete from public.daraya_post_reports where reporter=p_user or post_id in (select id from public.daraya_posts where user_id=p_user);
 delete from public.business_applications where owner_id=p_user;
 delete from public.community_ideas where author_id=p_user;
 update public.shop_purchase_tokens set cancelled=true where issuer_id=p_user and used_at is null;
 -- FK cascades remove personal profile, favorites, requests, posts, purchases and sessions.
 delete from auth.users where id=p_user;
 insert into public.account_deletion_audit(actor_id,deleted_user_id,source,request_id,orders_anonymized)
 values(actor,p_user,case when p_request is null then 'email' else 'in_app' end,p_request,changed) returning id into receipt;
 return jsonb_build_object('deleted',true,'receipt',receipt,'orders_anonymized',changed);
end; $$;

revoke all on function daraya_private.admin_deletion_state(uuid),daraya_private.admin_deletion_preview(text),
 daraya_private.admin_deletion_requests(),daraya_private.admin_delete_account(uuid,text,boolean,uuid) from public,anon,authenticated;
grant execute on function daraya_private.admin_deletion_preview(text),daraya_private.admin_deletion_requests(),
 daraya_private.admin_delete_account(uuid,text,boolean,uuid) to authenticated;

create function public.admin_account_deletion_preview(p_identity text)
returns jsonb language sql security invoker set search_path='' as $$ select daraya_private.admin_deletion_preview(p_identity); $$;
create function public.admin_account_deletion_requests()
returns jsonb language sql security invoker set search_path='' as $$ select daraya_private.admin_deletion_requests(); $$;
create function public.admin_execute_account_deletion(p_user uuid,p_confirmation text,p_verified boolean,p_request uuid default null)
returns jsonb language sql security invoker set search_path='' as $$ select daraya_private.admin_delete_account(p_user,p_confirmation,p_verified,p_request); $$;
revoke all on function public.admin_account_deletion_preview(text),public.admin_account_deletion_requests(),public.admin_execute_account_deletion(uuid,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.admin_account_deletion_preview(text),public.admin_account_deletion_requests(),public.admin_execute_account_deletion(uuid,text,boolean,uuid) to authenticated;
