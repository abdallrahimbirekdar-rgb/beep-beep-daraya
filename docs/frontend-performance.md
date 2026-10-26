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
