-- Run only AFTER 20261015_shop_reels.sql and deploying cleanup-shop-reels.
-- Store a long random REELS_CLEANUP_SECRET in Edge Function Secrets, and the SAME
-- value in Supabase Vault with name daraya_reels_cleanup_secret. Never put it in
-- frontend config, source control or chat.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$begin
 if not exists(select 1 from vault.decrypted_secrets where name='daraya_reels_cleanup_secret') then
  raise exception 'Create daraya_reels_cleanup_secret in Vault first';
 end if;
 if exists(select 1 from cron.job where jobname='daraya-shop-reels-cleanup') then
  perform cron.unschedule(jobid) from cron.job where jobname='daraya-shop-reels-cleanup';
 end if;
end;$$;
select cron.schedule('daraya-shop-reels-cleanup','*/15 * * * *', $job$
 select net.http_post(
  url:='https://nxnqsudwccjlvyepuxfg.supabase.co/functions/v1/cleanup-shop-reels',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization',
   'Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='daraya_reels_cleanup_secret' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=60000);
$job$);
update public.shop_reels_config set enabled=true where id=true;
commit;
