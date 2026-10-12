-- Run AFTER 20261012_shop_cards.sql in an isolated test project. No fixture survives rollback.
begin;
set local statement_timeout='30s';
insert into auth.users(id,email) values
('abababab-1000-4000-8000-000000000001','owner-cards-qa@example.invalid'),
('abababab-1000-4000-8000-000000000002','buyer-cards-qa@example.invalid'),
('abababab-1000-4000-8000-000000000003','other-cards-qa@example.invalid');
insert into public.stores(id,name,category,owner_email,active) values('abababab-2000-4000-8000-000000000001','Cards QA','shop','owner-cards-qa@example.invalid',true);
select set_config('request.jwt.claims','{"sub":"abababab-1000-4000-8000-000000000001","email":"owner-cards-qa@example.invalid","role":"authenticated"}',true);
set local role authenticated;
do $$begin if (public.get_shop_cards('abababab-2000-4000-8000-000000000001')->>'purchase_enabled')::boolean then raise exception 'Cards default on';end if;end;$$;
select public.save_shop_cards('abababab-2000-4000-8000-000000000001',true,true,2,200,'QA gift');
select set_config('qa.card.token1',(public.issue_shop_purchase('abababab-2000-4000-8000-000000000001',100)->>'token'),true);
do $$begin
 begin perform public.claim_shop_purchase(current_setting('qa.card.token1')::uuid);raise exception 'Owner claimed own purchase';exception when others then if sqlerrm<>'OWNER_CANNOT_CLAIM' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claims','{"sub":"abababab-1000-4000-8000-000000000002","email":"buyer-cards-qa@example.invalid","role":"authenticated"}',true);
set local role authenticated;
insert into public.customer_favorites(user_id,store_id,followed_at) values('abababab-1000-4000-8000-000000000002','abababab-2000-4000-8000-000000000001','2000-01-01');
do $$declare r jsonb;begin
 r:=public.get_shop_cards('abababab-2000-4000-8000-000000000001');if not(r->>'following')::boolean or (r->>'followed_at')::timestamptz<now() then raise exception 'Follow date forged or following missing';end if;
 r:=public.claim_shop_purchase(current_setting('qa.card.token1')::uuid);if (r->>'count')::integer<>1 or (r->>'total')::numeric<>100 then raise exception 'First stamp not recorded';end if;
 r:=public.claim_shop_purchase(current_setting('qa.card.token1')::uuid);if (r->>'count')::integer<>1 or not(r->>'already_claimed')::boolean then raise exception 'QR replay added a stamp';end if;
end;$$;
reset role;
select set_config('request.jwt.claims','{"sub":"abababab-1000-4000-8000-000000000003","email":"other-cards-qa@example.invalid","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 begin perform public.claim_shop_purchase(current_setting('qa.card.token1')::uuid);raise exception 'Foreign QR reuse accepted';exception when others then if sqlerrm<>'TOKEN_USED' then raise;end if;end;
 begin perform public.save_shop_cards('abababab-2000-4000-8000-000000000001',true,true,1,0,'Bad');raise exception 'Foreign configuration accepted';exception when others then if sqlerrm<>'OWNER_REQUIRED' then raise;end if;end;
 if (public.get_shop_cards('abababab-2000-4000-8000-000000000001')->>'lifetime_count')::integer<>0 then raise exception 'Foreign card history leaked';end if;
 begin perform public.request_shop_reward('abababab-2000-4000-8000-000000000001');raise exception 'Reward granted without purchases';exception when others then if sqlerrm<>'REWARD_NOT_READY' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claims','{"sub":"abababab-1000-4000-8000-000000000001","email":"owner-cards-qa@example.invalid","role":"authenticated"}',true);
set local role authenticated;
select set_config('qa.card.token2',(public.issue_shop_purchase('abababab-2000-4000-8000-000000000001',150)->>'token'),true);
reset role;
select set_config('request.jwt.claims','{"sub":"abababab-1000-4000-8000-000000000002","email":"buyer-cards-qa@example.invalid","role":"authenticated"}',true);
set local role authenticated;
do $$declare r jsonb;begin r:=public.claim_shop_purchase(current_setting('qa.card.token2')::uuid);if (r->>'count')::integer<>2 or (r->>'total')::numeric<>250 or not(r->>'eligible')::boolean then raise exception 'Both reward targets not respected';end if;end;$$;
select set_config('qa.card.reward',(public.request_shop_reward('abababab-2000-4000-8000-000000000001')->>'token'),true);
reset role;
select set_config('request.jwt.claims','{"sub":"abababab-1000-4000-8000-000000000001","email":"owner-cards-qa@example.invalid","role":"authenticated"}',true);
set local role authenticated;
select public.shop_reward_owner(current_setting('qa.card.reward')::uuid,true);
do $$begin if not(public.shop_reward_owner(current_setting('qa.card.reward')::uuid,true)->>'already_redeemed')::boolean then raise exception 'Reward redeemed twice';end if;end;$$;
select set_config('qa.card.oldtoken',(public.issue_shop_purchase('abababab-2000-4000-8000-000000000001',90)->>'token'),true);
select public.save_shop_cards('abababab-2000-4000-8000-000000000001',true,true,3,300,'Changed gift');
reset role;
select set_config('request.jwt.claims','{"sub":"abababab-1000-4000-8000-000000000002","email":"buyer-cards-qa@example.invalid","role":"authenticated"}',true);
set local role authenticated;
do $$declare r jsonb;begin
 r:=public.get_shop_cards('abababab-2000-4000-8000-000000000001');if (r->>'count')::integer<>0 or (r->>'lifetime_count')::integer<>2 then raise exception 'Cycle/history reset incorrect';end if;
 begin perform public.claim_shop_purchase(current_setting('qa.card.oldtoken')::uuid);raise exception 'Old program token accepted';exception when others then if sqlerrm not in ('CARDS_DISABLED','TOKEN_UNAVAILABLE') then raise;end if;end;
end;$$;
reset role;
delete from auth.users where id='abababab-1000-4000-8000-000000000002';
do $$begin
 if exists(select 1 from public.shop_purchase_stamps where user_id='abababab-1000-4000-8000-000000000002') or exists(select 1 from public.shop_card_rewards where user_id='abababab-1000-4000-8000-000000000002') or exists(select 1 from public.customer_favorites where user_id='abababab-1000-4000-8000-000000000002') then raise exception 'Account deletion left card data';end if;
 if exists(select 1 from public.shop_purchase_tokens where used_by='abababab-1000-4000-8000-000000000002') then raise exception 'Deleted identity still on used tokens';end if;
end;$$;
rollback;
