# ShopEasy API Documentation

## API architecture

ShopEasy has no custom Express.js server or custom application HTTP routes.
The React client uses `@supabase/supabase-js` to call the configured Supabase
project:

- Supabase Auth for registration, sign-in, password recovery, and account
  metadata/password updates.
- Supabase PostgREST for table reads and administrator catalogue writes.
- Supabase PostgREST RPC for database functions that enforce cart, checkout,
  cancellation, admin status, and dashboard rules.

The endpoints below are Supabase endpoints used by the checked-in application,
not routes implemented by ShopEasy. The configured project API URL is
`{{projectUrl}}`; do not include a trailing slash in the Postman environment.

## Authentication and headers

Set these values in a private Postman environment:

| Variable | Value |
| --- | --- |
| `projectUrl` | Supabase project URL, for example `https://your-project-ref.supabase.co` |
| `anonKey` | Public Supabase publishable key or legacy anon key only |
| `accessToken` | Access token returned after signing in as a test user |
| `email`, `password` | Test account credentials entered locally; never commit them |
| `redirectUrl` | Local or deployed app `/reset-password` URL allowlisted in Supabase Auth |
| `signupRedirectUrl` | Local or deployed app `/login` URL allowlisted in Supabase Auth |

Every Supabase API request uses `apikey: {{anonKey}}`. Authenticated REST/RPC
requests use `Authorization: Bearer {{accessToken}}`. For unauthenticated
requests, use the public/anon credential as the bearer token when required by
the project's API-key type. Never use a service-role/secret key or database
password in Postman or the browser.

An `accessToken` identifies the signed-in Supabase Auth user. PostgreSQL RLS
then scopes customer data to that user. Admin operations additionally require
the exact email-confirmed account checked by `public.is_shop_admin()`.

## Verified operations

### Supabase Auth

| SDK operation in source | HTTP operation | Access and behavior |
| --- | --- | --- |
| `auth.signUp()` in `src/pages/AuthPage.jsx` | `POST /auth/v1/signup?redirect_to=...` | Public API key; JSON includes `email`, `password`, and optional `data.username`. The redirect is the current site's `/login` page. Email confirmation may mean no session is returned until the user confirms. |
| `auth.signInWithPassword()` in `src/pages/AuthPage.jsx` | `POST /auth/v1/token?grant_type=password` | Public API key; JSON includes `email` and `password`. Returns a session/access token on success. |
| `auth.resetPasswordForEmail()` in `src/pages/ForgotPasswordPage.jsx` | `POST /auth/v1/recover` | Public API key; JSON includes `email`; the client requests a redirect to `/reset-password`. Email delivery and redirect allowlists are Supabase project configuration. |
| `auth.updateUser({ password })` in `src/pages/ResetPasswordPage.jsx` | `PUT /auth/v1/user` | Signed-in recovery session required; JSON includes the new `password`. |
| `auth.updateUser({ data })` in `src/pages/SettingsPage.jsx` | `PUT /auth/v1/user` | Signed-in session required; JSON updates that user's Auth metadata. |
| `auth.signOut()` in `src/App.jsx` | `POST /auth/v1/logout` | Signed-in session; the SDK manages the request and local session cleanup. |

Auth error bodies and status codes are returned by Supabase. Typical cases
include invalid credentials, unconfirmed email, expired recovery links, and
project URL/key or redirect-URL configuration errors. Do not expose passwords
or access tokens in shared collections, screenshots, or committed environment
files.

### PostgREST table operations

The SDK's `.from(table)` calls use Supabase PostgREST at
`/rest/v1/{table}`. Select filters, sort order, embedded relations, and returned
columns are the ones in the application source.

| Table | Verified operation | Access control |
| --- | --- | --- |
| `categories` | Read active shop categories; admin dashboard reads all and admin creates/updates/deletes categories. | Public read policies return active rows; writes require the verified admin RLS policy. |
| `products` | Read active catalogue/detail/wishlist products; admin reads, inserts, updates, and toggles `active`. | Public read policies return active rows; admin reads/writes are policy-protected. |
| `product_variants` | Read variant size/stock with catalogue products; admin upserts variants and adjusts stock. | Active-product read policy; writes require admin. |
| `cart_items` | Read the signed-in user's cart and quantities. | Authenticated; RLS restricts rows to `auth.uid()`. Cart mutations use RPCs below. |
| `orders` | Read the signed-in user's order list or an order by ID; admin dashboard reads orders. | Authenticated; RLS restricts customer rows to their owner and grants the designated admin access. |
| `order_items` | Read order item snapshots for orders visible to the signed-in user/admin. | Authenticated; RLS checks access through the parent order. |
| `order_status_history` | Read status events for visible orders. | Authenticated; RLS checks access through the parent order. |
| `wishlist_items` | Read, insert, or delete the signed-in user's saved product IDs. | Authenticated; RLS restricts rows to `auth.uid()` and insert policy requires an active product. |

Read calls use `GET /rest/v1/{table}?select=...`. Admin writes use the normal
PostgREST `POST`, `PATCH`, or `DELETE` methods for those tables. The client
requests inserted/updated rows with PostgREST's `select` representation where
needed. The Postman collection includes representative catalogue reads and
operations; the source code and SQL policies remain authoritative for the full
filter and permission behavior.

Example authenticated catalogue request:

```bash
curl --request GET \
  "$SUPABASE_URL/rest/v1/products?select=id,name,price&active=eq.true&order=name.asc" \
  --header "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  --header "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

### Database RPC operations

The SDK's `.rpc(name, args)` calls use `POST /rest/v1/rpc/{name}` with a JSON
object whose keys match the function's `p_` parameters. Successful `void`
functions return no application payload; SQL errors are returned as Supabase
API errors.

| Function | Request body / result | Access and verified behavior |
| --- | --- | --- |
| `is_shop_admin` | `{}`; returns a boolean. | Authenticated; checks the exact verified admin email. |
| `add_to_cart` | `{"p_variant_id":"<uuid>","p_quantity":1}`; `void`. | Authenticated; validates active product, quantity, and stock. |
| `set_cart_quantity` | `{"p_variant_id":"<uuid>","p_quantity":2}`; `void`. | Authenticated; updates only the caller's row and rejects invalid/out-of-stock quantity. |
| `remove_from_cart` | `{"p_variant_id":"<uuid>"}`; `void`. | Authenticated; removes only the caller's row. |
| `create_cod_order` | `p_full_name`, `p_phone`, `p_address`, `p_city`, `p_pin_code`, `p_checkout_key` (UUID), optional `p_variant_id` (UUID or `null`) and `p_quantity` (integer); returns `order_id` and `order_total`. | Authenticated; COD only. Prices and stock are checked in PostgreSQL; it writes order/item/history rows, decrements stock, and clears the cart only for cart-based checkout. The checkout key is idempotent per user. |
| `cancel_customer_order` | `{"p_order_id":"<uuid>"}`; `void`. | Authenticated owner only; only `placed`/`confirmed` orders can be cancelled; inventory is restored transactionally. |
| `admin_advance_order` | `{"p_order_id":"<uuid>","p_next_status":"confirmed"}`; `void`. | Authenticated, then admin-checked in the function; accepts only the next sequential status. |
| `admin_store_summary` | `{}`; returns the dashboard summary columns. | Authenticated, then admin-checked in the function. |

Example customer cart mutation:

```bash
curl --request POST \
  "$SUPABASE_URL/rest/v1/rpc/add_to_cart" \
  --header "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  --header "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"p_variant_id":"<in-stock-variant-uuid>","p_quantity":1}'
```

`auto_advance_shop_orders()` is called by the `pg_cron` job configured in
`202610220001_auto_order_progression.sql`. Execute privileges are revoked from
browser roles; it is not a customer/admin Postman endpoint.

### Errors and permissions

- Missing/invalid project key, access token, or Auth session prevents the
  requested operation.
- RLS hides unauthorized rows and rejects unauthorized writes. Do not treat a
  successful HTTP status from one operation as proof of access to other rows.
- Function validation errors include unauthenticated calls, unavailable
  products, insufficient stock, invalid delivery fields, duplicate/invalid
  transitions, and attempts to cancel an ineligible/non-owned order.
- Unique slug/email/checkout constraints and foreign keys can reject writes.
  PostgREST/Supabase return structured error responses; exact status and error
  codes depend on the failing endpoint and constraint.
- Network failures, Auth email settings, and missing database migrations are
  environment failures and cannot be diagnosed by this repository alone.

## Postman

Import [`postman/ShopEasy.postman_collection.json`](./postman/ShopEasy.postman_collection.json)
and [`postman/ShopEasy.postman_environment.json`](./postman/ShopEasy.postman_environment.json).
Fill in the project URL and public key, then sign in with a disposable
development customer to populate `accessToken`. Use a separate confirmed
administrator test account for admin requests. The collection includes
state-changing checkout, cancellation, and admin calls; use a development
project and sample data, not production customer orders.

## Verification boundary

This document describes only operations found in the current frontend and
checked-in SQL. The live Supabase schema, migration application state, email
configuration, API keys, RLS behavior, and scheduled jobs were not queried or
tested. This repository contains no custom Express.js backend or independent
ShopEasy HTTP route layer.
