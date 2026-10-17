-- Install only: no existing account or content is removed by this script.
set lock_timeout='5s';
alter table public.customer_data_requests add column if not exists admin_reply text not null default '' check(length(admin_reply)<=1000);
alter table public.customer_data_requests add column if not exists updated_at timestamptz not null default now();
-- Users may insert only their own request inputs, never an administration reply.
revoke insert on public.customer_data_requests from authenticated;
grant insert(user_id,kind,note) on public.customer_data_requests to authenticated;
create or replace function daraya_private.submit_deletion_request(p_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r public.customer_data_requests;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'SIGN_IN_REQUIRED';end if;
 if length(coalesce(p_note,''))>400 then raise exception 'INVALID_NOTE';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('deletion-request:'||uid::text));
 select * into r from public.customer_data_requests where user_id=uid and kind='deletion' and status='pending' order by created_at,id limit 1 for update;
 if not found then
  insert into public.customer_data_requests(user_id,kind,note) values(uid,'deletion',btrim(coalesce(p_note,''))) returning * into r;
 end if;
 return jsonb_build_object('id',r.id,'status',r.status,'created_at',r.created_at,'admin_reply',r.admin_reply,'updated_at',r.updated_at);
end;$$;
create or replace function public.submit_account_deletion_request(p_note text default '')
returns jsonb language sql security invoker set search_path='' as $$select daraya_private.submit_deletion_request(p_note);$$;
create or replace function daraya_private.reply_deletion_request(p_request uuid,p_reply text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED';end if;
 if length(btrim(coalesce(p_reply,''))) not between 1 and 1000 then raise exception 'INVALID_REPLY';end if;
 update public.customer_data_requests set admin_reply=btrim(p_reply),updated_at=now(),status='pending' where id=p_request and kind='deletion';
 if not found then raise exception 'REQUEST_NOT_FOUND';end if;
end;$$;
create or replace function public.admin_reply_account_deletion(p_request uuid,p_reply text)
returns void language sql security invoker set search_path='' as $$select daraya_private.reply_deletion_request(p_request,p_reply);$$;
create or replace function daraya_private.admin_deletion_requests()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED';end if;
 return coalesce((select jsonb_agg(row_to_json(r)) from
 (select d.id,d.user_id,d.note,d.created_at,d.status,d.admin_reply,d.updated_at,u.email
 from public.customer_data_requests d join auth.users u on u.id=d.user_id
 where d.kind='deletion' order by (d.status='pending') desc,d.created_at,d.id limit 100)r),'[]');
end;$$;
revoke all on function daraya_private.submit_deletion_request(text),daraya_private.reply_deletion_request(uuid,text),public.submit_account_deletion_request(text),public.admin_reply_account_deletion(uuid,text) from public,anon,authenticated;
grant execute on function daraya_private.submit_deletion_request(text),daraya_private.reply_deletion_request(uuid,text),public.submit_account_deletion_request(text),public.admin_reply_account_deletion(uuid,text) to authenticated;

create or replace function public.account_deletion_status()
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); account_email text;
begin
 if uid is null then raise exception 'SIGN_IN_REQUIRED'; end if;
 select email into account_email from auth.users where id=uid;
 if not found then return jsonb_build_object('eligible',true,'deleted',true); end if;
 if exists(select 1 from public.platform_admins where user_id=uid)
 or exists(select 1 from public.daraya_account_bans where banned_by=uid)
 or exists(select 1 from public.stores where lower(owner_email)=lower(account_email))
 or exists(select 1 from public.store_drivers where user_id=uid or lower(email)=lower(account_email))
 or exists(select 1 from public.business_applications where owner_id=uid and store_id is not null)
 then return jsonb_build_object('eligible',false,'reason','BUSINESS_ACCOUNT'); end if;
 if exists(select 1 from public.orders where customer_id=uid and status not in ('تم التسليم','ملغي'))
 or exists(select 1 from public.service_bookings where user_id=uid and status in ('new','accepted'))
 then return jsonb_build_object('eligible',false,'reason','ACTIVE_TRANSACTIONS'); end if;
 if exists(select 1 from storage.objects where owner_id=uid::text or owner=uid)
 or exists(select 1 from public.daraya_posts where user_id=uid and nullif(image,'') is not null and image not like 'data:%')
 or exists(select 1 from public.business_applications where owner_id=uid and nullif(facade_data,'') is not null and facade_data not like 'data:%')
 then return jsonb_build_object('eligible',false,'reason','STORED_FILES'); end if;
 return jsonb_build_object('eligible',true,'deleted',false);
end; $$;

create or replace function public.delete_my_account(p_confirmation text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); state jsonb;
begin
 if uid is null then raise exception 'SIGN_IN_REQUIRED'; end if;
 if p_confirmation is distinct from 'DELETE' then raise exception 'CONFIRMATION_REQUIRED'; end if;
 -- Serialize with order creation; the user lock also serializes FK-backed writes.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(uid::text));
 perform 1 from auth.users where id=uid for update;
 state:=public.account_deletion_status();
 if not (state->>'eligible')::boolean then raise exception '%',state->>'reason'; end if;
 if (state->>'deleted')::boolean then return jsonb_build_object('deleted',true); end if;
 -- Preserve receipt amounts for merchant accounting, remove customer identity and GPS.
 delete from public.order_driver_locations where order_id in (select id from public.orders where customer_id=uid);
 update public.orders set customer_id=null,customer_name='حساب محذوف',phone='',address='',area='',notes='',
 latitude=null,longitude=null,tracking_token=pg_catalog.gen_random_uuid() where customer_id=uid;
 delete from public.daraya_post_reports where reporter=uid
 or post_id in (select id from public.daraya_posts where user_id=uid);
 delete from public.business_applications where owner_id=uid;
 -- Auth deletion cascades to profile, favorites, requests, posts, bookings and sessions.
 -- A failure rolls back every change above; no partial deletion is reported.
 delete from public.community_ideas where author_id=uid;
 delete from public.facebook_studio_drafts where created_by=uid;
 delete from public.driver_code_secrets where user_id=uid;
 update public.shop_purchase_tokens set cancelled=true where issuer_id=uid and used_at is null;
 delete from auth.users where id=uid;
 return jsonb_build_object('deleted',true);
end; $$;
create or replace function daraya_private.admin_deletion_state(p_user uuid)
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
 select media+count(*) into media from public.business_applications where owner_id=p_user and nullif(facade_data,'') is not null and facade_data not like 'data:%';
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

create or replace function daraya_private.admin_delete_account(p_user uuid,p_confirmation text,p_verified boolean,p_request uuid)
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
 delete from public.facebook_studio_drafts where created_by=p_user;
 delete from public.driver_code_secrets where user_id=p_user;
 delete from auth.users where id=p_user;
 insert into public.account_deletion_audit(actor_id,deleted_user_id,source,request_id,orders_anonymized)
 values(actor,p_user,case when p_request is null then 'email' else 'in_app' end,p_request,changed) returning id into receipt;
 return jsonb_build_object('deleted',true,'receipt',receipt,'orders_anonymized',changed);
end; $$;


reset lock_timeout;