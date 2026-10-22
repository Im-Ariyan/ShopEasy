# ER diagram assets

- [`ER-diagram-draft.png`](./ER-diagram-draft.png) is the user-supplied draft
  image. It is retained for reference, but it does **not** match the checked-in
  Supabase schema: it depicts a `USERS` table instead of Supabase Auth, and
  omits `product_variants`, `wishlist_items`, and `order_status_history`. Some
  shown columns and relationships also differ from the migrations.
- [`../ER-diagram.mmd`](../ER-diagram.mmd) is the schema-aligned Mermaid
  diagram. Use it with [`../../supabase/schema.sql`](../../supabase/schema.sql)
  as the repository's submission reference.

The live Supabase schema has not been queried or verified.
