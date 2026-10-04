begin;
-- The existing server-only driver-code function must read the driver roster before checking ownership.
-- Browser roles retain their current grants and RLS policies.
grant select on public.store_drivers to service_role;
commit;
