-- Read-only paginated account directory; emails never become public table data.
create or replace function public.admin_registered_accounts(p_search text default '', p_page integer default 0)
returns jsonb language plpgsql security definer set search_path = pg_catalog
as $$
declare
 term text := left(trim(coalesce(p_search,'')),254);
 page_number integer := greatest(0,least(coalesce(p_page,0),1000000));
 total_count bigint;
 matched_count bigint;
 account_rows jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select count(*) into total_count from auth.users;
 select count(*) into matched_count from auth.users u where term='' or strpos(lower(coalesce(u.email,'')),lower(term))>0;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id),'[]'::jsonb) into account_rows
 from (select u.id,u.email,u.created_at,(u.email_confirmed_at is not null) as email_confirmed
 from auth.users u where term='' or strpos(lower(coalesce(u.email,'')),lower(term))>0
 order by u.created_at desc,u.id limit 50 offset (page_number::bigint*50)) r;
 return jsonb_build_object('total',total_count,'matched',matched_count,'page',page_number,'page_size',50,'accounts',account_rows);
end;
$$;
revoke all on function public.admin_registered_accounts(text,integer) from public,anon;
grant execute on function public.admin_registered_accounts(text,integer) to authenticated;
