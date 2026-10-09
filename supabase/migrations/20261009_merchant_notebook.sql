begin;
create table if not exists public.merchant_notes(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 note_day date not null default (now() at time zone 'Asia/Damascus')::date,
 title text not null check(length(title) between 1 and 100),
 body text not null default '' check(length(body)<=2000),
 archived boolean not null default false,
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.merchant_notes enable row level security;
revoke all on public.merchant_notes from public,anon,authenticated;
create index if not exists merchant_notes_store_date on public.merchant_notes(store_id,note_day desc,created_at desc);
create or replace function public.list_merchant_notes(p_store uuid,p_archived boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.manages_store(p_store) then raise exception 'Provider access required';end if;
 return coalesce((select jsonb_agg(to_jsonb(t)) from (select id,note_day,title,body,revision,created_at,updated_at from merchant_notes where store_id=p_store and archived=p_archived order by note_day desc,created_at desc limit 200)t),'[]'::jsonb);
end;$$;
create or replace function public.save_merchant_note(p_store uuid,p_id uuid,p_day date,p_title text,p_body text,p_revision integer default 0)
returns jsonb language plpgsql security definer set search_path=public as $$
declare n public.merchant_notes;
begin
 if auth.uid() is null or not public.manages_store(p_store) then raise exception 'Provider access required';end if;
 if p_day is null or p_day>(now() at time zone 'Asia/Damascus')::date or p_day<(now() at time zone 'Asia/Damascus')::date-3650 or p_title is null or length(trim(p_title)) not between 1 and 100 or p_body is null or length(p_body)>2000 then raise exception 'Invalid note';end if;
 if p_id is null then
  perform pg_advisory_xact_lock(hashtextextended(p_store::text,0));
  if (select count(*) from merchant_notes where store_id=p_store and not archived)>=500 then raise exception 'Note limit reached';end if;
  insert into merchant_notes(store_id,note_day,title,body) values(p_store,p_day,trim(p_title),trim(p_body)) returning * into n;
 else
  update merchant_notes set note_day=p_day,title=trim(p_title),body=trim(p_body),revision=revision+1,updated_at=now() where id=p_id and store_id=p_store and revision=p_revision and not archived returning * into n;
  if n.id is null then raise exception 'Note changed or unavailable';end if;
 end if;
 return jsonb_build_object('id',n.id,'revision',n.revision);
end;$$;
create or replace function public.archive_merchant_note(p_store uuid,p_id uuid,p_revision integer,p_archived boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.manages_store(p_store) then raise exception 'Provider access required';end if;
 if p_archived is null then raise exception 'Invalid archive state';end if;
 if not p_archived then
  perform pg_advisory_xact_lock(hashtextextended(p_store::text,0));
  if (select count(*) from merchant_notes where store_id=p_store and not archived)>=500 then raise exception 'Note limit reached';end if;
 end if;
 update merchant_notes set archived=p_archived,revision=revision+1,updated_at=now() where id=p_id and store_id=p_store and revision=p_revision;
 if not found then raise exception 'Note changed or unavailable';end if;
end;$$;
create or replace function public.merchant_note_comparison(p_store uuid,p_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare day date;anchor timestamptz;after_end timestamptz;before_stats jsonb;after_stats jsonb;
begin
 if auth.uid() is null or not public.manages_store(p_store) then raise exception 'Provider access required';end if;
 select note_day into day from merchant_notes where id=p_id and store_id=p_store and not archived;
 if day is null then raise exception 'Note unavailable';end if;
 anchor=day::timestamp at time zone 'Asia/Damascus';after_end=least(now(),anchor+interval '7 days');
 select jsonb_build_object('view',count(*) filter(where kind='view'),'call',count(*) filter(where kind='call'),'whatsapp',count(*) filter(where kind='whatsapp'),'orders',(select count(*) from orders where store_id=p_store and created_at>=anchor-interval '7 days' and created_at<anchor)) into before_stats from place_events where store_id=p_store and created_at>=anchor-interval '7 days' and created_at<anchor;
 select jsonb_build_object('view',count(*) filter(where kind='view'),'call',count(*) filter(where kind='call'),'whatsapp',count(*) filter(where kind='whatsapp'),'orders',(select count(*) from orders where store_id=p_store and created_at>=anchor and created_at<after_end)) into after_stats from place_events where store_id=p_store and created_at>=anchor and created_at<after_end;
 return jsonb_build_object('day',day,'before_start',day-7,'before_end',day-1,'after_start',day,'after_end',((after_end-interval '1 microsecond') at time zone 'Asia/Damascus')::date,'after_complete',now()>=anchor+interval '7 days','before',before_stats,'after',after_stats);
end;$$;
revoke all on function public.list_merchant_notes(uuid,boolean),public.save_merchant_note(uuid,uuid,date,text,text,integer),public.archive_merchant_note(uuid,uuid,integer,boolean),public.merchant_note_comparison(uuid,uuid) from public,anon;
grant execute on function public.list_merchant_notes(uuid,boolean),public.save_merchant_note(uuid,uuid,date,text,text,integer),public.archive_merchant_note(uuid,uuid,integer,boolean),public.merchant_note_comparison(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
