# ShopEasy Internship Submission Audit

**Audit date:** 2026-10-22
**Source review revision:** `750cfac` (`Prepare internship submission documentation`)
**Final-preparation documentation changes:** Uncommitted in the worktree.
**Scope:** Repository inspection only. No live Supabase database was queried or
modified.

## Executive summary

ShopEasy is an existing React 19 + Vite storefront backed by Supabase Auth,
PostgreSQL, RLS, and SQL functions. The repository implements authentication,
catalogue browsing, a persistent cart and wishlist, COD checkout, order
history/cancellation, an admin dashboard, and database-scheduled order status
progression. The frontend calls Supabase through `@supabase/supabase-js`; there
is no custom Express server or other application API server in the repository.

The repository contains versioned SQL migrations, an ordered consolidated
`supabase/schema.sql` snapshot, a repeatable sample catalogue seed, API
documentation, a Postman collection, a Mermaid ER source, and ten supplied
application screenshots stored under `screenshots/captures/`. Personal profile
values and order details in the relevant images have been redacted. The live database, email configuration,
scheduled-job availability, and actual admin account cannot be verified from
the source tree.

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

## Submission deliverable status

`package.json` defines `dev`, `build`, `lint`, and `preview` scripts, but no test
or type-check script; no tracked test/spec files were found.

| Required deliverable | Status verified in repository | Actual file(s) to add or correct |
| --- | --- | --- |
| Audit of implementation, risks, requirements, and unknowns | Present; implementation findings are based on `750cfac`, with final-preparation deliverable status updated in this worktree. | `docs/SUBMISSION-AUDIT.md` |
| Submission schema based on migrations | Present as an ordered snapshot of checked-in migrations; not compared with or executed against a live database. | `supabase/schema.sql` only if migrations change; preserve `supabase/migrations/*.sql`. |
| Safe sample seed | Present: seven categories, 36 products, variants, and `ON CONFLICT DO NOTHING`; no customer records or credentials. | `supabase/seed.sql` only if a concrete issue is found. |
| Application screenshots | Ten supplied captures are stored locally and embedded in README: home, explore/collections, bag, wishlist, order history, settings, sign-in, and admin dashboard. Personal profile values/order details are redacted. Product details, checkout, confirmation, expanded tracking/cancellation, and admin order-management views remain to be captured. | `screenshots/captures/*.png`, `screenshots/README.md`, and `README.md`. |
| ER diagram | Schema-aligned Mermaid source is embedded in README. The user-supplied PNG is kept in `docs/diagrams/` but is marked as a draft because it conflicts with the checked-in schema. | `docs/diagrams/ER-diagram.mmd` (authoritative repository diagram), `docs/diagrams/ER-diagram-draft.png` (reference only), and `README.md`. |
| API documentation | Present; documents verified Supabase Auth, PostgREST, and RPC calls, and does not claim a custom Express API. | `docs/api/API-documentation.md` only if operations change. |
| Postman collection and environment template | Present; placeholders only, no service-role key or private credentials. | `docs/api/postman/ShopEasy.postman_collection.json` and `docs/api/postman/ShopEasy.postman_environment.json` only if operations change. |
| README submission guide | Present and updated with screenshot status/checklist and Mermaid diagram, alongside setup, API, database, admin, limitations, and deployment information. | `README.md` |
| Historical development commits | Existing history is preserved. Inspected history contains commits dated 2026-10-17, 2026-10-18, and 2026-10-22; it contains no commits dated 2026-10-19 through 2026-10-21. | No historical changes; review and commit current work honestly. |
| Tests/type-check | No test or type-check script and no tracked test files found. | No fabricated test files; add tests only in a separate implementation task if required. |

### Files added or updated for this final preparation

- `docs/SUBMISSION-AUDIT.md` — current deliverable status and repository
  verification boundaries.
- `screenshots/README.md` — checklist of the supplied captures and remaining
  screens; no placeholder images were created.
- `screenshots/captures/*.png` — ten supplied captures stored locally; profile
  and order details are redacted where visible.
- `README.md` — screenshot status/checklist, submission links, and inline
  Mermaid ER diagram; no nonexistent image files are referenced.
- `docs/diagrams/ER-diagram.mmd` — schema-aligned diagram source.
- `docs/diagrams/ER-diagram-draft.png`, `docs/diagrams/ER-diagram.mmd`, and
  `docs/diagrams/README.md` — supplied draft and schema-aligned source in a
  dedicated folder, with the draft's mismatches documented.
- `docs/api/README.md`, `docs/api/API-documentation.md`, and
  `docs/api/postman/` — verified API documentation, its index, and the
  Postman collection/environment template.
- `supabase/schema.sql`, `supabase/seed.sql`, and original migrations remain
  together under `supabase/`, the database setup folder; verified API
  documentation and Postman assets are organized under `docs/api/`.

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
- The ten supplied screenshots are stored locally and linked in README.
  Product details, checkout/confirmation, expanded tracking/cancellation, and
  fuller admin product/order-management views still need captures. Supplied
  order/test data and live project configuration were not independently
  verified.
- A Mermaid CLI renderer is not installed. The `.mmd` source can be viewed with
  a Mermaid-compatible renderer or shown in GitHub using a fenced Mermaid block.

## Phase 1 validation snapshot

- `git status` was clean before this final preparation task.
- `npm run lint` completed with warnings and no reported errors:
  `react(set-state-in-effect)` in Cart and Orders pages.
- `npm run build` succeeded. Vite reported that the minified JavaScript bundle
  is larger than 500 kB.
- The installed Vite version is 8.3.4 and declares Node.js `^20.19.0 ||
  >=22.12.0`; the inspected environment uses Node.js 24.21.0.
- The existing Git history was inspected and left unchanged. It contains
  commits on 2026-10-17, 2026-10-18, and 2026-10-22, and does not establish
  daily commits for the dates in between.
- These checks validate the current frontend source only; they do not execute
  SQL migrations or test Supabase policies, Auth configuration, cron, or live
  workflows.
