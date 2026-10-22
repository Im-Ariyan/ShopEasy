# ShopEasy

An e-commerce shopping website built with React, Vite, and Supabase.

ShopEasy is a React + Vite storefront using Supabase Auth and PostgreSQL. The
application includes the shop, size-aware product variants, a persistent user
bag, COD checkout, customer order tracking/cancellation, and an administrator
workspace. The SQL files must be applied to the Supabase project before the
commerce features can access data.

## Technology

- React + Vite (JavaScript) and React Router
- Supabase Auth and PostgreSQL
- RLS on every application table
- Public/publishable Supabase browser key only

## Deploy to Netlify

1. Push the project to GitHub, then in Netlify choose **Add new site → Import
   an existing project** and connect the `Im-Ariyan/ShopEasy` repository.
2. Configure the site build:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Base directory: leave blank
3. In **Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase publishable/anon key

   Use the public publishable/anon key only. Never add a database password or
   service-role key. These `VITE_` values are included in the browser build.
4. In Supabase **Authentication → URL Configuration**, set **Site URL** to your
   deployed Netlify URL (for example, `https://your-site.netlify.app`). Add that
   URL and `https://your-site.netlify.app/**` to **Redirect URLs**. Keep
   `http://127.0.0.1:5173` and `http://127.0.0.1:5173/**` too for local
   development. If you add a custom domain, add it there as well.
5. Trigger a Netlify deploy. The `public/_redirects` file lets React Router
   routes such as `/admin`, `/orders`, and `/products` work when opened or
   refreshed directly.

The live site uses the same Supabase database configured by these environment
variables. Apply the SQL migrations and seed in the section below before
testing the live shopping flow. Netlify hosts the frontend; it does not host or
replace the Supabase database.

## Configure and apply SQL

1. Copy `.env.example` to `.env`, then add the Supabase project URL and public
   publishable (or anon) key. Never put the database password or service-role
   key in a frontend variable.
2. In the Supabase SQL Editor, run these files in order:

   1. `supabase/migrations/202610180001_is_shop_admin.sql`
   2. `supabase/migrations/20261018000200_shopping_schema.sql`
   3. `supabase/migrations/202610180003_wishlist.sql`
   4. `supabase/migrations/202610220001_auto_order_progression.sql`
   5. `supabase/seed.sql`

   The migration adds tables with `IF NOT EXISTS` and the seed uses unique slugs
   and `ON CONFLICT DO NOTHING`. Apply it first in a project with no ShopEasy
   commerce tables; it does not drop or recreate data. To add or refresh the
   sample catalogue later, run `supabase/seed.sql` again.
3. In **Authentication → URL Configuration**, set the local URL as described
   under Supabase Auth settings below.
4. Run `npm install`, `npm run lint`, `npm run build`, then
   `npm run dev -- --host 127.0.0.1`.

### Administrator authorization

`public.is_shop_admin()` checks the signed-in Auth user's exact email
(`aryanmajumder8565@gmail.com`) and requires a confirmed email. The function
does not read browser storage or editable profile data. Product writes,
administrator order reads, administrator status updates, and dashboard summary
are protected by RLS and/or database functions that call the same function.
Registration never accepts a role.

Product activation and deactivation update the product row directly and request
the changed row as confirmation. PostgreSQL RLS permits the operation only for
the designated verified administrator; ordinary customers cannot activate or
deactivate products.

Customer order queries are scoped to `auth.uid()`. Order creation, cancellation,
cart mutation, and admin status progression run through `SECURITY DEFINER`
PostgreSQL functions with fixed search paths. Cancellation locks the owned
order row, checks that its status is `placed` or `confirmed`, restores every
variant quantity, and changes the status in one transaction. A repeat request
fails after the first state change, so inventory is not restored twice.
Checkout prices are read from current product rows and copied to immutable
order-item snapshots. A per-user checkout key prevents duplicate order
creation after a retry.

The admin sales statistic is the sum of order totals whose current status is
not `cancelled`; because the shop is COD, it is labelled **Non-cancelled order
value**, not settled payment revenue.

### Customer settings

Customers can update their username, full name, phone number, delivery address,
city, PIN code, and notification preferences from **Settings**. These values
are saved to the signed-in user's Supabase Auth metadata; the email shown there
is read-only. Profile and saved delivery details prefill checkout and can be
edited before an order is placed. Notification choices are stored, but the app
does not currently send order-update or product-news emails. These editable
profile fields are never used to authorize admin access.

### Supabase Auth settings

Set Site URL to `http://127.0.0.1:5173` and add
`http://127.0.0.1:5173/**` to Redirect URLs when running Vite with
`--host 127.0.0.1`. For a hosted site, also add its deployed URL and
`https://your-site.example/**` to Redirect URLs. Registration confirmation
returns to the same site at `/login`; password recovery returns to
`/reset-password`. Both paths must be allowed for the site you use. Keep the
dev server running while opening local email links.

### Password recovery

On the sign-in page, choose **Forgot password?**, enter the account email, and
open the Supabase email link. Choose and confirm a new password on the reset
page, then sign in with it. Passwords are changed through Supabase Auth; the
application never stores passwords itself.

## Customer flow test

1. Register/sign in using Supabase Auth. Confirm the email if confirmation is
   enabled.
2. Open **Explore the shop**. The page reads active categories, products, and
   size-specific variant stock from Supabase. Use the heart on a product to add
   it to your saved wishlist, then open **Wishlist** from the account menu.
3. Select a collection, search/sort, choose an in-stock size and quantity, and
   click **Add to Bag**. Use the header bag icon to check the saved item and
   quantity. The count reloads on refresh and updates after cart mutations.
4. Change quantity/remove an item and check that line totals and subtotal
   update. Delivery is free; the only payment option is COD.
5. For an individual **Buy Now**, test with items already in the bag: checkout
   must show only the chosen item and leave the saved bag unchanged. If signed
   out, the checkout URL's variant and quantity are preserved across login.
6. Submit valid shipping details. Verify one `placed` COD order appears in
   **Your Orders**, item snapshots and price total are correct, variant stock
   is reduced, and cart-based checkout clears the bag.
7. Refresh and verify cart/order data remains. The order timeline reads saved
   status history, not frontend-only statuses.
8. Cancel a `placed` or `confirmed` order and verify status becomes `cancelled`
   and stock is restored once. Repeat the RPC call; it must fail without a
   second stock increase. Cancellation is unavailable after `packed`.

   Order statuses progress automatically: orders are confirmed 5 minutes after
   placement if the admin has not confirmed them, packed 30 minutes after
   confirmation, and shipped 4 hours after packing. The admin can still manually
   confirm or advance orders at any time. Customer and admin order pages refresh
   automatically every minute while open.

## Administrator flow test

1. Sign in using the verified designated administrator account.
2. Open `/admin`. If `is_shop_admin()` or the schema migration has not been
   applied, the dashboard must fail closed.
3. Add/update products and adjust stock. Active and deactivated products appear
   in separate lists; use **Reactivate** in the deactivated list to return a
   product to the shop. Add/edit/remove categories. Removing a category sets its
   product category to null; it does not delete those products.
4. Advance an order one step at a time through Confirmed, Packed, Shipped,
   Out for Delivery, and Delivered. The database function rejects skipped
   transitions and cancelled orders.
5. Sign in as an ordinary customer and verify `/admin` refuses access and RLS
   prevents querying another customer's orders.

## Project structure

```text
src/
  auth/                         Auth state and hook
  components/                   Product imagery and cards
  lib/                          Supabase client and shop formatting
  pages/                        Shop, detail, bag, checkout, orders, admin
  App.jsx                       Protected routes and shared header
supabase/
  migrations/                   Admin authorization and schema/RPC/RLS
  seed.sql                      Seven categories and thirty-six repeatable products
```

## Known verification boundary

The app build and linter can run locally. The SQL migration cannot be applied
or end-to-end database workflows verified from this workspace because no local
PostgreSQL/Supabase CLI is installed and the browser key cannot execute DDL.
Apply the SQL files in the Supabase SQL Editor, then run the customer/admin
flows above to verify the live project. No real order/payment or courier
tracking has been tested or integrated.
