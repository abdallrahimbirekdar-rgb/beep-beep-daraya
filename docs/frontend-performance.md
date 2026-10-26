# Frontend loading (October 26, 2026)

The interface and image files are unchanged. Initial Arabic browsing no longer downloads
management-only modules or the 1,500-row English/German translation table.

- `lazy-management.js` loads the notebook, registered-account controls, offer-display
  administration, account deletion administration and Facebook studio in their original
  order on dashboard/studio/deletion routes. Concurrent requests share one load; network
  failure offers retry, and late results cannot navigate back to a route the user left.
  Existing authentication and database permission checks remain in the feature modules.
- The translation runtime remains eager. The catalog is fetched on a non-Arabic language
  choice, when restoring that choice, or before management tools need translated editor
  defaults. Changes preserve unsent field values and ignore superseded language choices.
- The build uses pinned Terser with top-level mangling disabled, retaining classic-script
  global names and registration order. Contiguous eager groups split at source-file
  boundaries around 256 KiB. Each emitted file has a content hash so unchanged chunks
  retain their URL across releases. No service worker or private-data cache was added.
- Images, prices, order data, public-page structure and dashboard layout are unchanged.

## Reproducible checks

Run `npm ci --ignore-scripts --no-audit --no-fund` before `python scripts/build_seo.py`.
The Pages workflow installs the optimizer before each static build. Source files remain
readable; minification affects generated deployment files only.

`python tests/frontend_assets_test.py` verifies classic global bindings, script ordering,
CSS cascade, chunk boundaries and inert lazy descriptors. Node DOM tests in
`tests/i18n-demand.dom.test.cjs` and `tests/lazy-management.dom.test.cjs` cover lazy loading,
retry, route changes, saved language, and form-value preservation.

## Size comparison

Compared with commit `931db053da01f81026124b5995d4aaff895abe00`, summing only actual eager
`script[src]` resources in the built homepage (excluding inert `data-src` descriptors):

| JavaScript | Before | After |
| --- | ---: | ---: |
| Uncompressed bytes | 1,552,989 | 1,119,889 |
| Local gzip estimate, bytes | 468,820 | 349,004 |
| Eager script requests | 9 | 12 |

This is 27.9% fewer uncompressed JavaScript bytes at Arabic startup, or 25.6% using a
local gzip estimate. Additional smaller requests trade some cold-request overhead for
less invalidation on repeat visits. These figures exclude CSS, images, third-party SDKs,
and API responses; they are not measured download times or a claim of 28% faster loading.
English/German users fetch their catalog, and dashboard users fetch their tool bundle.

Browser QA: built homepage and German language switching worked, with lazy descriptors
unloaded for Arabic browsing and loaded on demand. Management signed-out access retained
its sign-in screen. Local HTTP preview requires a QA-only randomUUID polyfill for the
existing table-service module; production uses HTTPS. No QA fixture is tracked or published.
