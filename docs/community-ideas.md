# أفكاركم تطوّر سوق داريا

Implementation staged in a feature branch. Do not deploy the public UI until the database migration is applied and anti-abuse protection is reviewed.

1. Apply `supabase/migrations/20261016_community_ideas.sql` to the correct Supabase project, after checking that `public.is_admin()` is the existing administrator predicate.
2. Confirm anonymous submissions are allowed intentionally. Add CAPTCHA / edge rate limiting before exposing the form widely. The SQL contains only a basic global throttle, not robust bot protection.
3. Open `ideas.html` and test anonymous submit -> pending, anonymous public listing -> only approved, administrator moderation -> published, authenticated voting -> unique votes.
4. Test merchant access cannot read pending ideas or moderate, and anonymous access cannot vote.
5. Test from Android WebView and check Google Play disclosures if site behavior materially changes.
6. After verification, add a navigation link from the homepage and merge the PR. No production database changes are performed by the branch itself.

Note: This is a standalone page; login sessions depend on the existing Supabase client session storage. If the main app uses a custom auth storage key, adapt the client before enabling voting.
