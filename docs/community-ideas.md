# أفكاركم تطوّر سوق داريا — حالة التجهيز

**Feature branch only; do not deploy before end-to-end browser and Android WebView tests.**

## Design
- Public visitors can read published ideas only.
- Signed-in users can submit ideas, which always start as `pending`.
- Signed-in users can vote once per published idea.
- Administrators can review, publish, reject, and update statuses.
- No Cloudflare Turnstile or anonymous submission is required.

## Implemented and verified in production Supabase (2026-10-16)
- RLS enabled; no direct client table privileges.
- `community_idea_submit` RPC: `anon` EXECUTE=false; `authenticated` EXECUTE=true; function explicitly rejects missing `auth.uid()`.
- Ten-minute per-account cooldown and global twelve-per-minute throttle.
- SQL transaction privacy test: pending idea hidden; published idea visible; transaction rolled back.
- Database contains zero ideas after rollback.
- Frontend now uses authenticated Supabase RPC directly, not the old Turnstile gateway.

## Before merging
1. Test a real signed-in session submitting an idea and confirm `author_id` and pending status.
2. Test a visitor cannot submit or vote and cannot see pending ideas.
3. Test admin moderation with an actual admin session.
4. Test duplicate voting and the ten-minute cooldown.
5. Verify login persistence in Android WebView; inspect whether the main site's auth storage key matches `beep-beep-daraya-auth`.
6. Evaluate fake-account abuse and rate limiting if abuse occurs.
7. Remove the unused `supabase/functions/community-idea-submit/index.ts` gateway from the branch before merging (it is not deployed).
8. Review and merge PR #25, then deploy using the normal site release process.

No website release has been performed.
