# أفكاركم تطوّر سوق داريا — خطوات التفعيل الآمن

**Status: staged only. Do not merge or deploy until the checklist passes.**

## Already completed (2026-10-16)
- Tables and five RPCs exist in Supabase project `beep-beep-daraya`.
- RLS enabled; direct table access denied to `anon` and `authenticated`.
- `community_idea_submit` execution revoked from `anon` and `authenticated`, granted only to `service_role` (migration applied and verified).
- SQL transaction test: a temporary pending idea was hidden and a temporary published idea was visible. Transaction rolled back, leaving no test rows.
- Frontend submits to `/functions/v1/community-idea-submit`, not the exposed SQL RPC.

## Required before enabling public submissions
1. Create a Cloudflare Turnstile widget for **damascus-shop.com** and **www.damascus-shop.com**. Use managed mode; obtain site key and secret.
2. Set the **public site key** in `config.js` as `turnstileSiteKey` (not the secret). Keep the secret out of GitHub and the browser.
3. Add the secret to the Supabase Edge Function environment as `TURNSTILE_SECRET_KEY`.
4. Deploy `supabase/functions/community-idea-submit/index.ts` as the `community-idea-submit` Edge Function with **verify_jwt=false**. The function validates Origin, verifies Turnstile server-side, and uses service role to call the protected SQL RPC. It fails closed if the secret is missing.
5. Test on the allowed domains: missing/invalid CAPTCHA rejected, valid CAPTCHA creates a pending idea, pending remains hidden, admin can publish/reject, published becomes visible, signed-in voting is unique, unauthenticated voting fails.
6. Test Android WebView session behavior and cross-origin browser errors; verify admin panel only displays for an administrator.
7. Review bot protection beyond CAPTCHA (IP-aware rate limiting and operational monitoring). The database currently uses a global 12/min throttle, which can block legitimate users under abuse.
8. After all tests pass, mark PR ready for review and merge; no production website deployment is done by this branch alone.

## Notes
- **Do not restore** `anon` or `authenticated` EXECUTE access to `community_idea_submit`; this bypasses Turnstile.
- `turnstileSiteKey` is deliberately absent from the current `config.js`, so the UI fails closed until configured.
- The Edge Function is committed to GitHub but not deployed as part of this change.
- SQL Editor uses elevated database privileges and is not a substitute for testing the actual anonymous and signed-in browser sessions.
