# Optional table ordering

Restaurant/café owners open **طلبات الطاولات وQR** in their merchant dashboard. The feature is off by default for every venue; existing delivery/pickup settings are independent. Enable it under **الطاولات ورموز QR**, create numbered tables, and save or print each QR. Disabling the feature blocks new orders while retaining existing tickets.

Guests scan `#table/<random-token>`, choose products/options, and submit without an account, name, or phone. Their private receipt shows preparation status. Payment remains at the venue. Owners keep the dedicated board open to receive updates every five seconds, optionally enable sound, and move tickets through new, preparing, ready, and served. Cancelled and served orders are paginated in history. Each ticket shows table number, Daraya time, quantities, options, notes, and total.

## Data and permissions

The migration creates three RLS-enabled tables in an unexposed private schema. Public SECURITY INVOKER RPC wrappers call tightly scoped private implementations. Owner RPC access requires authentication and `manages_store`; guest access requires random table/receipt capabilities. Table tokens can be paused or rotated. Guest APIs do not expose other orders or owner data.

Prices and option constraints are validated on the server, inventory is reserved atomically, cancellation restores inventory once, and retry IDs prevent duplicate submissions. Per-client/table limits and a bounded active queue limit abuse. Dine-in orders are separate from existing delivery orders and commissions. No venues are enabled by the migration.

## Validation

Run `tests/table-service.sql` inside a transaction followed by ROLLBACK against the existing schema. It checks default-off behavior, guest/owner permissions, required options, server pricing, inventory, retries, rate limits, status concurrency, cancellation, paused tables, and token rotation using isolated fixtures.

Run `NODE_PATH=<jsdom install>/node_modules node --test tests/table-service.dom.test.cjs` for guest checkout/retry, owner opt-in/status lanes, route cleanup, and dashboard integration. The web feature loads from `index.html` and works in the existing app WebView without an Android package change.

Live notifications require the owner board to be open with a network connection; this feature does not add background push notifications.
