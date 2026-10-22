# ShopEasy Internship Submission Audit

**Audit date:** 2026-10-22
**Repository revision:** `b495a0b` (`Add automatic order status progression`)
**Scope:** Repository inspection only. No live Supabase database was queried or
modified.

## Executive summary

ShopEasy is an existing React 19 + Vite storefront backed by Supabase Auth,
PostgreSQL, RLS, and SQL functions. The repository implements authentication,
catalogue browsing, a persistent cart and wishlist, COD checkout, order
history/cancellation, an admin dashboard, and database-scheduled order status
progression. The frontend calls Supabase through `@supabase/supabase-js`; there
is no custom Express server or other application API server in the repository.

The repository contains versioned SQL migrations and an idempotent sample
catalogue seed. It does not yet contain a consolidated `schema.sql`, API
documentation, a Postman collection, or an ER diagram. The live database,
email configuration, scheduled-job availability, and actual admin account
cannot be verified from the source tree.

## Existing deliverables and verified implementation

### Application and customer flows

- `src/App.jsx` defines React Router routes and requires a signed-in user for
  the home page, catalogue, product detail, cart, checkout, orders, wishlist,
  settings, and admin route. Unauthenticated users are sent to `/login`, with
  their original path and query string retained for return after sign-in.
- `src/pages/AuthPage.jsx`, `ForgotPasswordPage.jsx`, and
  `ResetPasswordPage.jsx` implement Supabase email/password registration and
  sign-in, password recovery, and password changes. Registration does not
  accept an admin role.
- `src/pages/ShopPage.jsx` loads active categories/products and provides
  search, sorting, and collection navigation. `ProductDetailsPage.jsx` and
  `ProductCard.jsx` support variant/stock selection, add-to-cart, buy-now, and
  wishlist actions.
- `src/pages/CartPage.jsx` reads the signed-in user's cart and calls database
  functions to change quantity or remove items.
- `src/pages/CheckoutPage.jsx` supports cart checkout and individual Buy Now
  checkout with COD. The checkout RPC computes prices and changes stock in the
  database rather than trusting browser-submitted prices. A per-checkout key
  supports retry idempotency.
- `src/pages/OrdersPage.jsx` shows persisted order details and status history.
  Customers can request cancellation while an order is `placed` or
  `confirmed`; the SQL function restores inventory within the same transaction.
  The page refreshes its data every minute.
- `src/context/WishlistContext.jsx` and `src/pages/WishlistPage.jsx` implement
  persisted customer wishlists.
- `src/pages/SettingsPage.jsx` saves profile, delivery-prefill, and notification
  preference values to Supabase Auth user metadata. The UI explicitly states
  that notification emails are not currently sent.

### Admin authorization and operations

- `public.is_shop_admin()` in the migrations checks `auth.uid()` against the
  exact configured email `aryanmajumder8565@gmail.com` and requires a confirmed
  Auth email. It does not trust browser storage or editable profile metadata.
- `src/pages/AdminAccessPage.jsx` checks that database function before showing
  admin operations. It supports product/variant and category maintenance,
  order viewing/status changes, and a summary RPC. Admin order data is also
  protected by PostgreSQL policies/functions.
- `admin_advance_order` verifies admin status and permits only one status step
  at a time. The admin can manually confirm an order.
- `202610220001_auto_order_progression.sql` schedules
  `auto_advance_shop_orders()` every minute through `pg_cron`: auto-confirm
  `placed` orders after 5 minutes, auto-pack `confirmed` orders after 30
  minutes, and auto-ship `packed` orders after 4 hours. The admin's manual
  progression remains available. Whether this migration has been applied and
  the job is running on the live project is not verifiable here.

### Database, seed, and deployment assets

- SQL setup is currently split across:
  - `supabase/migrations/202610180001_is_shop_admin.sql`
  - `supabase/migrations/20261018000200_shopping_schema.sql`
  - `supabase/migrations/202610180003_wishlist.sql`
  - `supabase/migrations/202610220001_auto_order_progression.sql`
- The repository schema defines eight application tables:
  `categories`, `products`, `product_variants`, `cart_items`, `orders`,
  `order_items`, `order_status_history`, and `wishlist_items`. Supabase's
  `auth.users` is an external Auth-managed table referenced by application
  foreign keys, not a ShopEasy-owned table.
- The schema migration defines primary/foreign keys, unique and check
  constraints, six explicit indexes, RLS, and database functions. No
  application triggers are defined in the inspected migrations.
- `supabase/seed.sql` contains seven sample categories and 36 sample products
  with size/stock variants. Its slug and variant conflict handling uses
  `ON CONFLICT DO NOTHING`; it does not update or delete existing catalogue
  rows. It contains no customer records, passwords, or API credentials.
- `supabase/migrations/README.md` documents migration order and database
  security. `public/_redirects` supplies the Netlify SPA route fallback.
- `.env.example` contains placeholders for `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. `.gitignore` excludes `.env` and other local env
  files. The private local `.env` was not opened or copied.

## Missing submission deliverables

No `docs/` directory or existing API specification, OpenAPI file, Postman
collection, or ER diagram was found in the tracked repository. There is also no
consolidated schema file. `package.json` defines `dev`, `build`, `lint`, and
`preview` scripts, but no test or type-check script; no tracked test/spec files
were found.

The following files should be created or updated in later phases:

| Path | Planned work |
| --- | --- |
| `docs/SUBMISSION-AUDIT.md` | Created in Phase 1; record findings and verification boundaries. |
| `supabase/schema.sql` | Create a consolidated, ordered submission schema based only on the checked-in migrations; keep migrations intact. Do not run it against the live project. |
| `docs/API-documentation.md` | Document verified Supabase Auth, PostgREST table operations, and RPC operations. Explicitly distinguish them from custom application routes. |
| `docs/postman/ShopEasy.postman_collection.json` | Create requests for genuine Supabase HTTP endpoints, parameterized with project URL, public key, and session-token variables. Include no service-role key or private secret. |
| `docs/ER-diagram.mmd` | Create a Mermaid ER diagram for the repository-defined application tables and relationships. |
| `README.md` | Update project overview, architecture, prerequisites, local setup, safe database/seed instructions, API and Postman links, admin behavior, test flows, limitations, and deployment. |

`supabase/seed.sql` does not appear to need a rewrite based on this repository
review: the sample data is realistic, repeatable, and non-destructive for
matching slugs. Preserve it unless later validation finds a concrete issue.

## Potential bugs, risks, and security considerations

These are source-review findings, not confirmed live incidents:

1. **Live SQL behavior remains unverified.** RLS and `SECURITY DEFINER`
   functions are defined in migrations, but no live schema/policy inspection or
   integration test was available. A successful frontend build does not
   validate SQL behavior.
2. **Order automation has an infrastructure prerequisite.** The latest
   migration creates/enables `pg_cron` and schedules a job. Extension
   availability, installation privileges, job ownership, and successful
   execution depend on the target Supabase project and must be checked there.
   The migration's presence in Git is not evidence that it ran.
3. **Admin access depends on an external Auth account.** The email is a
   deliberate authorization identifier in source-controlled SQL, not a
   password or bypass. The account must exist and have a confirmed email in
   the target Supabase project; its existence and access were not tested.
4. **Admin product edits are multiple API writes.** In
   `src/pages/AdminAccessPage.jsx`, a product row is written before variants
   are parsed/upserted and removed sizes are zeroed separately. If a later
   operation fails, earlier writes may remain, leaving a partial edit.
5. **Checkout success copy can be misleading.** `CheckoutPage.jsx` labels the
   success state “Order confirmed,” while the SQL creates the order with status
   `placed`; confirmation is a separate admin action or later scheduled
   transition. Consider changing the wording in the documentation/UI phase.
6. **The full store is sign-in gated.** `RequireAuth` wraps catalogue and
   product browsing as well as account operations. This is verified behavior;
   confirm whether an evaluator expects public/guest browsing.
7. **Notification settings are preferences only.** They are stored in Auth
   metadata, but there is no email sending integration.
8. **Payment and carrier integrations are not present.** Checkout is COD-only;
   there is no payment gateway, payment settlement workflow, or carrier-backed
   tracking. Order states are application-managed statuses, not courier
   events.
9. **Automated test coverage is absent.** The repository has no test/type-check
   scripts or tracked test files. Current lint warnings include
   `react(set-state-in-effect)` in `src/pages/CartPage.jsx` and
   `src/pages/OrdersPage.jsx`; the build also reports a minified JavaScript
   chunk above 500 kB.
10. **Wishlist state is loaded from the authenticated account.** The context
    does not explicitly clear prior IDs/errors before loading after a user
    change. Review account-switch behavior during later testing, especially if
    requests fail.
11. **`PlaceholderPage.jsx` contains older generic copy** saying shopping
    operations are not implemented. It is currently used for unmatched routes
    and the denied-admin screen, so that wording can be inaccurate for this
    implemented project.

No hardcoded admin password, service-role key, database password, or custom
Express endpoint was found in the inspected tracked source. The real local
`.env` was intentionally not inspected.

## Repository-only verification and unknowns

The following cannot be established from repository contents alone:

- Whether the target Supabase project has all four migrations applied, and
  whether its schema/policies/functions exactly match these files.
- Whether `pg_cron` is enabled and its scheduled job is succeeding.
- Whether Supabase Auth URL allowlists, email confirmation/recovery templates,
  and deployment environment variables are configured correctly.
- Whether the designated admin account exists, has a confirmed email, and can
  sign in. No admin password is expected in the repository.
- Whether seed data has been run in the target project or whether the live
  catalogue has additional records.
- Whether Netlify or other deployment settings match `README.md`.
- Whether the internship evaluator requires a custom Express/Node API rather
  than the existing Supabase Auth/PostgREST/RPC architecture. Clarify this
  rubric requirement before adding any server framework.
- Whether live database exports, screenshots, test evidence, or sample user
  accounts are required by the evaluator.

## Phase 1 validation snapshot

- `git status` was clean before this audit file was created.
- `npm run lint` completed with warnings and no reported errors:
  `react(set-state-in-effect)` in Cart and Orders pages.
- `npm run build` succeeded. Vite reported that the minified JavaScript bundle
  is larger than 500 kB.
- The installed Vite version is 8.3.4 and declares Node.js `^20.19.0 ||
  >=22.12.0`; the inspected environment uses Node.js 24.21.0.
- These checks validate the current frontend source only; they do not execute
  SQL migrations or test Supabase policies, Auth configuration, cron, or live
  workflows.
