# Supabase migrations

Apply `202610180001_is_shop_admin.sql` followed by
`20261018000200_shopping_schema.sql` to a new ShopEasy project in the Supabase
SQL Editor. Run `../seed.sql` after the schema migration to add repeatable
sample collections and products.

The schema migration defines categories/products/size variants, private cart
and order tables, RLS policies, transactional COD checkout and cancellation,
and sequential administrator order advancement. It does not drop existing
tables. Review the migration before applying it to any project that already
has commerce tables or policies.

Never add a service-role key to a migration, browser environment file, or
frontend source. Database authorization must be enforced by PostgreSQL RLS.
