# Supabase migrations

Apply these files in order to a ShopEasy project in the Supabase SQL Editor:

1. `202610180001_is_shop_admin.sql`
2. `20261018000200_shopping_schema.sql`
3. `202610180003_wishlist.sql`
4. `202610220001_auto_order_progression.sql`

Run `../seed.sql` after the schema migrations to add repeatable sample
collections and products.

The schema migration defines categories/products/size variants, private cart
and order tables, RLS policies, transactional COD checkout and cancellation,
and sequential administrator order advancement. It does not drop existing
tables. Review the migration before applying it to any project that already
has commerce tables or policies.

The auto-progression migration schedules a database job that checks every
minute: it confirms placed orders after 5 minutes, packs confirmed orders after
30 minutes, and ships packed orders after 4 hours. The administrator can still
advance an order manually at any time. The job records every transition in
`order_status_history`.

The wishlist migration adds a per-customer saved-products table protected by
row-level security.

Never add a service-role key to a migration, browser environment file, or
frontend source. Database authorization must be enforced by PostgreSQL RLS.
