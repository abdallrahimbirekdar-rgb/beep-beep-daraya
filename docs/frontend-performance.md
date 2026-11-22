# Frontend loading

## Current behavior after the reported slowdown

The October 26 experiment that deferred management tools and translation data and
split eager scripts at 256 KiB was rolled back after the user reported slower loading.
The original synchronous translation behavior, eager tool registration order and
contiguous script grouping are restored. There is no extra language or dashboard
loading gate. CSS and image quality, the dashboard layout and loading spinner remain.

Build-only minification remains enabled with pinned Terser and top-level mangling
turned off. Content-addressed asset URLs are retained. The initial HTML now preloads
the same Supabase ES module used by app.js and preconnects to the existing database
origin, allowing that network setup to start before JavaScript reaches init(). This
does not change authentication, API data, or user-facing settings.

The earlier 27.9% initial-byte reduction measured a smaller payload, not a faster
load. It is superseded by this correction. Actual loading time depends on request
latency, cache state, the device and backend response time; no percentage improvement
in real user load time is claimed.

## Validation and maintenance

Run `npm ci --ignore-scripts --no-audit --no-fund`, then
`python scripts/build_seo.py`. The Pages workflow installs the optimizer automatically.
`python tests/frontend_assets_test.py` checks execution order, global bindings, CSS
cascade, minification and avoiding artificial fragmentation of contiguous scripts.
Existing DOM tests cover shop navigation, forms, account permissions and management.

The update detector compares parser-deferred assets (and descriptors from older cached
pages), ignoring dynamically inserted runtime scripts so they cannot cause reload loops.
It continues protecting unsent form data from automatic reloads. No service worker or
new cache of private data was added.


## Slow connections (2026-11-22)

The current demand-loading and feature-loading modules supersede earlier rollback notes above. `network-mode.js` offers automatic, save-data and normal modes in the main menu. Automatic mode uses available connection hints (saveData, 2G/3G or reported downlink below 1.5 Mbps). Only the selected mode is persisted; catalog data remains in memory and the existing store cache remains scoped to the user.

Save-data mode defers images until the viewport, suppresses automatic original-image fallback, pauses catalog slides, limits home product previews to one, debounces product search to 700 ms and reuses store navigation reads for up to three minutes. Normal mode retains existing behavior. Read-only catalog fetches get a deadline (45 seconds in save-data, 25 normally), cancellation where supported and at most one retry for a timeout, thrown network failure or transient server response. Writes are never retried by this helper. Startup reports continued waiting rather than replacing a still-loading home with an error after 25 seconds. Online/offline status is informational, not an offline checkout promise.

Leaflet waits for both its stylesheet and script; failed or expired loads remove assets and permit retry, including when the script loaded but the stylesheet failed. Manual address entry remains available. No field speed percentage is claimed.


## Checkout resilience (2026-11-22)

Checkout now captures values before locking controls, blocks a known-offline submission, restores controls and entered data after failure, and ignores completion after an account change. It only clears the submitted cart snapshot. `marketSubmitOrder` sends exactly one `place_order_v4` call with the existing idempotency key, uses a 60-second write deadline and checks `market_attempt` for up to 12 seconds on an uncertain failure. A failed receipt read preserves the key. Only explicit SQL validation/access/integrity failures release it; gateway and uncertain transaction errors keep it. No production orders are created by the DOM tests.

The delivery picker ignores outdated GPS callbacks after a new location request, clearing, manual selection or dialog closure. Delayed map loading cannot create a map after the dialog closes. Structured profile address fields are cleared when restoring an uncertain order so they cannot silently overwrite its address.


## Checkout clarity and language stability (2026-11-22)

Confirmation separates product subtotal, delivery fee and expected total and shows a saved pickup address. A live status distinguishes sending, continued waiting after 20 seconds and receipt lookup. Errors focus the retained form's alert; progress timers clear after completion. Full recovery/map phrases are translated in the central AR/EN/DE dictionary, keeping submitted values unchanged. The network language observer now ignores repeated writes of the same `lang` attribute to prevent a redraw cycle with the translation observer. Integration tests run both modules together and assert that updates settle and form values are preserved.


## Catalog and search response ordering (2026-11-22)

Catalog reloads stage store/admin/order data before committing and ignore results or failures from superseded requests or a changed account. Product fetches and store-cache fills also reject stale responses. Search refreshes only the still-active home/browse route, same account and same term; hash navigation invalidates pending UI updates. Repeated renders share the scheduled/in-flight term rather than cancelling its debounce. Search cache is account-scoped and expires after two minutes, including an unchanged query. Pending and failed product search show an inline status/retry and suppress premature empty-store messaging, while available store cards remain usable. Tests cover reversed response ordering, logout during management loading, and late search responses on account/history/privacy pages.
