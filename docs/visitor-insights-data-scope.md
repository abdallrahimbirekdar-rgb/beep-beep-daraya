# Visitor insights: data scope and verification — 22 October 2026

The admin report summarizes data already held in `website_visit_sessions`, `place_events`, `merchant_interest_events` and `daily_offer_events`. It introduces no new visitor recording fields, browser/device signals, referrer capture, geolocation, search text, session-duration heartbeat, SDK, permission or third-party analytics service. Existing visitor/session identifiers remain in their existing tables. The visitor recording function in `website-visits.js` is unchanged.

The new read-only RPC returns aggregate counts, a calendar series, hourly counts and public shop/category rankings. It does not return visitor/session identifiers, names, emails, phone numbers or individual browsing trails. It does not join website visitor identities to shop interaction sessions. No retention setting or recording RPC was changed.

## Metric definitions

- A visitor is an existing random browser identifier, not a verified person. Clearing storage, changing browsers/devices or automated traffic may affect counts.
- New/returning is based on the first recorded day for that identifier. It cannot recover visits before tracking began.
- Multiple sessions counts identifiers with more than one session row in the selected period. It is not the same as returning from an earlier period.
- Sessions-per-visitor excludes legacy sessions without a visitor identifier.
- Daily distinct visitor counts must not be added together to obtain a period total.
- Hourly activity represents the first recorded time of sessions, not time spent on the site.
- Periods use Asia/Damascus calendar days and include the current incomplete day. Growth is not calculated if historical coverage of the preceding period is incomplete.
- Shop/category activity and rankings include active, non-deleted, non-example places. Category rankings count shop-page views, not category-button taps. Separate activity counters do not represent a visitor conversion funnel. Clicks do not prove completed calls, messages or purchases.

## Access and checks

`admin_visitor_insights(integer)` is granted to authenticated callers, checks `auth.uid()` against `platform_admins` inside the function, and denies signed-out and non-admin callers. It uses a fixed `pg_catalog,public` search path and qualified table names. Raw analytics tables remain inaccessible to normal authenticated/anonymous clients.

Live transaction tests passed for 7/30/90 days, bounded invalid periods, 24 hourly bins, complete calendar series, new+returning arithmetic, no visitor/session identifiers in output, denied anonymous/non-admin access and role grants. No visitor rows were inserted or changed by these tests.

Supabase's advisory about authenticated execution of SECURITY DEFINER functions is intentional here: the definer function is required to read private RLS-protected tables and performs its own database-backed admin authorization before reading. Anonymous EXECUTE is revoked. The non-admin rejection and raw-table restrictions were tested. Advisory reference: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable . Existing unrelated project advisories were not modified by this report change.

Frontend tests cover unchanged recording payload, admin-only UI, escaped shop names, stale responses after logout/navigation or period changes, unavailable backend fallback and incomplete-history comparison. Browser checks cover 320/390/430/1280px layouts and period selection.

## Google Play boundary

This is an admin reporting change over existing analytics, not an expansion of client data collection or sharing. No Play Console answers were edited. Exact existing Data safety selections were not available for verification. Existing declarations must already accurately cover the app's current visitor identifiers and interactions and their analytics purpose; an admin UI improvement does not establish that previous disclosures were correct.

Official guidance: https://support.google.com/googleplay/android-developer/answer/10787469 .
