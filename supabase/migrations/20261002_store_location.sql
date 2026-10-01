begin;
alter table public.stores add column if not exists latitude double precision, add column if not exists longitude double precision;
alter table public.stores add constraint store_location_pair check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180));
grant select(latitude,longitude) on public.stores to anon,authenticated;
grant update(latitude,longitude) on public.stores to authenticated;
commit;
