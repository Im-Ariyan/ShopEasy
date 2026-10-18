create table if not exists public.wishlist_items (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.wishlist_items enable row level security;

revoke all on table public.wishlist_items from public, anon;
grant select, insert, delete on table public.wishlist_items to authenticated;

drop policy if exists "Customers read their own wishlist" on public.wishlist_items;
create policy "Customers read their own wishlist"
  on public.wishlist_items for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Customers add to their own wishlist" on public.wishlist_items;
create policy "Customers add to their own wishlist"
  on public.wishlist_items for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.products as product
      where product.id = product_id and product.active
    )
  );

drop policy if exists "Customers remove from their own wishlist" on public.wishlist_items;
create policy "Customers remove from their own wishlist"
  on public.wishlist_items for delete to authenticated
  using (user_id = (select auth.uid()));

notify pgrst, 'reload schema';
