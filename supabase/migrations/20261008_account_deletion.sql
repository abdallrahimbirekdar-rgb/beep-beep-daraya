-- Self-service deletion of personal customer accounts. No caller-supplied user ID.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
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
 delete from auth.users where id=uid;
 return jsonb_build_object('deleted',true);
end; $$;
revoke all on function public.account_deletion_status(),public.delete_my_account(text) from public,anon;
grant execute on function public.account_deletion_status(),public.delete_my_account(text) to authenticated;
commit;
