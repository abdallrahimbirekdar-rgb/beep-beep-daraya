-- Admin-only planning. This table never publishes to any external platform.
create table public.facebook_studio_drafts (
 id uuid primary key default gen_random_uuid(),
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 source_kind text not null check(source_kind in ('shop','offer')),
 store_id uuid references public.stores(id) on delete set null,
 offer_id uuid references public.daily_offers(id) on delete set null,
 title text not null check(char_length(title) between 1 and 120),
 subtitle text not null default '' check(char_length(subtitle)<=220),
 body text not null check(char_length(body) between 1 and 5000),
 planned_at timestamptz,
 status text not null default 'draft' check(status in ('draft','ready','archived')),
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((source_kind='shop' and offer_id is null) or source_kind='offer')
);
alter table public.facebook_studio_drafts enable row level security;
revoke all on public.facebook_studio_drafts from public,anon,authenticated;
grant select,insert,update on public.facebook_studio_drafts to authenticated;
create policy facebook_studio_admin_read on public.facebook_studio_drafts for select to authenticated using ((select public.is_admin()));
create policy facebook_studio_admin_add on public.facebook_studio_drafts for insert to authenticated with check ((select public.is_admin()) and created_by=(select auth.uid()));
create policy facebook_studio_admin_edit on public.facebook_studio_drafts for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create index facebook_studio_plan on public.facebook_studio_drafts(status,planned_at);
create function public.touch_facebook_studio_draft() returns trigger language plpgsql security invoker set search_path='' as $$begin new.revision:=old.revision+1;new.updated_at:=now();new.created_at:=old.created_at;return new;end;$$;
revoke all on function public.touch_facebook_studio_draft() from public,anon,authenticated;
create trigger facebook_studio_touch before update on public.facebook_studio_drafts for each row execute function public.touch_facebook_studio_draft();
