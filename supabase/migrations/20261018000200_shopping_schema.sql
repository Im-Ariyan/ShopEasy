create or replace function public.is_shop_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from auth.users as account
    where account.id = (select auth.uid())
      and account.email = 'aryanmajumder8565@gmail.com'
      and account.email_confirmed_at is not null
  );
$function$;

revoke all on function public.is_shop_admin() from public, anon;
grant execute on function public.is_shop_admin() to authenticated;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  image_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  image_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_label text not null default 'One Size',
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, size_label)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, variant_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  pin_code text not null,
  total numeric(12, 2) not null check (total >= 0),
  checkout_key uuid not null,
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  status text not null default 'placed' check (status in (
    'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'
  )),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, checkout_key)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  image_url text not null,
  selected_size text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null check (status in (
    'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'
  )),
  created_at timestamptz not null default now()
);

create index if not exists products_category_active_idx on public.products(category_id, active);
create index if not exists variants_product_stock_idx on public.product_variants(product_id, stock);
create index if not exists cart_items_user_idx on public.cart_items(user_id);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_status_history_order_created_idx on public.order_status_history(order_id, created_at);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

drop policy if exists "Active categories are public" on public.categories;
create policy "Active categories are public"
  on public.categories for select to anon, authenticated
  using (active or (select public.is_shop_admin()));
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
  on public.categories for all to authenticated
  using ((select public.is_shop_admin()))
  with check ((select public.is_shop_admin()));

drop policy if exists "Active products are public" on public.products;
create policy "Active products are public"
  on public.products for select to anon, authenticated
  using (active or (select public.is_shop_admin()));
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
  on public.products for all to authenticated
  using ((select public.is_shop_admin()))
  with check ((select public.is_shop_admin()));

drop policy if exists "Available catalogue variants are public" on public.product_variants;
create policy "Available catalogue variants are public"
  on public.product_variants for select to anon, authenticated
  using (
    exists (
      select 1 from public.products as product
      where product.id = product_id and product.active
    )
    or (select public.is_shop_admin())
  );
drop policy if exists "Admins manage product variants" on public.product_variants;
create policy "Admins manage product variants"
  on public.product_variants for all to authenticated
  using ((select public.is_shop_admin()))
  with check ((select public.is_shop_admin()));

drop policy if exists "Customers read their own cart" on public.cart_items;
create policy "Customers read their own cart"
  on public.cart_items for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Customers read their own orders" on public.orders;
create policy "Customers read their own orders"
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_shop_admin()));

drop policy if exists "Customers and admins read order items" on public.order_items;
create policy "Customers and admins read order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders as order_record
      where order_record.id = order_id
        and (order_record.user_id = (select auth.uid()) or (select public.is_shop_admin()))
    )
  );

drop policy if exists "Customers and admins read order status history" on public.order_status_history;
create policy "Customers and admins read order status history"
  on public.order_status_history for select to authenticated
  using (
    exists (
      select 1 from public.orders as order_record
      where order_record.id = order_id
        and (order_record.user_id = (select auth.uid()) or (select public.is_shop_admin()))
    )
  );

revoke all on public.categories, public.products, public.product_variants,
  public.cart_items, public.orders, public.order_items, public.order_status_history from public, anon, authenticated;
grant select on public.categories, public.products, public.product_variants to anon, authenticated;
grant select on public.cart_items, public.orders, public.order_items, public.order_status_history to authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants to authenticated;

create or replace function public.add_to_cart(p_variant_id uuid, p_quantity integer default 1)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  available_stock integer;
  product_is_active boolean;
  existing_quantity integer;
begin
  if current_user_id is null then
    raise exception 'Sign in to add items to your bag.';
  end if;
  if p_quantity < 1 or p_quantity > 99 then
    raise exception 'Quantity must be between 1 and 99.';
  end if;

  select variant.stock, product.active
    into available_stock, product_is_active
    from public.product_variants as variant
    join public.products as product on product.id = variant.product_id
    where variant.id = p_variant_id
    for update of variant;

  if not found or not product_is_active then
    raise exception 'This product is not available.';
  end if;

  select cart.quantity into existing_quantity
    from public.cart_items as cart
    where cart.user_id = current_user_id and cart.variant_id = p_variant_id
    for update;
  if coalesce(existing_quantity, 0) + p_quantity > available_stock then
    raise exception 'There is not enough stock for that quantity.';
  end if;

  insert into public.cart_items(user_id, variant_id, quantity)
    values (current_user_id, p_variant_id, p_quantity)
    on conflict (user_id, variant_id) do update
      set quantity = public.cart_items.quantity + excluded.quantity,
          updated_at = now();
end;
$function$;

create or replace function public.set_cart_quantity(p_variant_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  available_stock integer;
  product_is_active boolean;
begin
  if current_user_id is null then
    raise exception 'Sign in to update your bag.';
  end if;
  if p_quantity < 1 or p_quantity > 99 then
    raise exception 'Quantity must be between 1 and 99.';
  end if;
  select variant.stock, product.active into available_stock, product_is_active
    from public.product_variants as variant
    join public.products as product on product.id = variant.product_id
    where variant.id = p_variant_id for update of variant;
  if not found or not product_is_active then
    raise exception 'This product is not available.';
  end if;
  if p_quantity > available_stock then
    raise exception 'There is not enough stock for that quantity.';
  end if;
  update public.cart_items
    set quantity = p_quantity, updated_at = now()
    where user_id = current_user_id and variant_id = p_variant_id;
  if not found then
    raise exception 'That item is no longer in your bag.';
  end if;
end;
$function$;

create or replace function public.remove_from_cart(p_variant_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Sign in to update your bag.';
  end if;
  delete from public.cart_items
    where user_id = (select auth.uid()) and variant_id = p_variant_id;
end;
$function$;

create or replace function public.create_cod_order(
  p_full_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_pin_code text,
  p_checkout_key uuid,
  p_variant_id uuid default null,
  p_quantity integer default 1
)
returns table(order_id uuid, order_total numeric)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  line record;
  item_count integer := 0;
  calculated_total numeric(12, 2) := 0;
  created_order_id uuid;
  existing_order public.orders%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in before placing an order.';
  end if;
  if length(trim(coalesce(p_full_name, ''))) not between 2 and 120
    or length(trim(coalesce(p_phone, ''))) not between 7 and 20
    or length(trim(coalesce(p_address, ''))) not between 5 and 500
    or length(trim(coalesce(p_city, ''))) not between 2 and 100
    or length(trim(coalesce(p_pin_code, ''))) not between 4 and 12 then
    raise exception 'Enter a valid name, phone, address, city, and PIN code.';
  end if;
  if p_checkout_key is null then
    raise exception 'Checkout could not be verified. Refresh and try again.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text || p_checkout_key::text, 0)
  );
  select * into existing_order from public.orders
    where user_id = current_user_id and checkout_key = p_checkout_key;
  if found then
    return query select existing_order.id, existing_order.total;
    return;
  end if;

  if p_variant_id is null then
    for line in
      select cart.variant_id, cart.quantity, variant.stock, variant.size_label,
             product.id as product_id, product.name, product.image_url, product.price, product.active
      from public.cart_items as cart
      join public.product_variants as variant on variant.id = cart.variant_id
      join public.products as product on product.id = variant.product_id
      where cart.user_id = current_user_id
      order by variant.id
      for update of cart, variant, product
    loop
      if not line.active then
        raise exception 'A product in your bag is no longer available.';
      end if;
      if line.quantity > line.stock then
        raise exception 'There is not enough stock for %.', line.name;
      end if;
      calculated_total := calculated_total + line.price * line.quantity;
      item_count := item_count + 1;
    end loop;
    if item_count = 0 then
      raise exception 'Your bag is empty.';
    end if;
  else
    if p_quantity < 1 or p_quantity > 99 then
      raise exception 'Quantity must be between 1 and 99.';
    end if;
    select variant.id as variant_id, variant.stock, variant.size_label,
           product.id as product_id, product.name, product.image_url, product.price, product.active
      into line
      from public.product_variants as variant
      join public.products as product on product.id = variant.product_id
      where variant.id = p_variant_id
      for update of variant, product;
    if not found or not line.active then
      raise exception 'This product is not available.';
    end if;
    if p_quantity > line.stock then
      raise exception 'There is not enough stock for %.', line.name;
    end if;
    calculated_total := line.price * p_quantity;
    item_count := 1;
  end if;

  insert into public.orders(user_id, full_name, phone, address, city, pin_code, total, checkout_key)
    values (
      current_user_id, trim(p_full_name), trim(p_phone), trim(p_address),
      trim(p_city), trim(p_pin_code), calculated_total, p_checkout_key
    )
    returning id into created_order_id;
  insert into public.order_status_history(order_id, status) values (created_order_id, 'placed');

  if p_variant_id is null then
    for line in
      select cart.variant_id, cart.quantity, variant.stock, variant.size_label,
             product.id as product_id, product.name, product.image_url, product.price
      from public.cart_items as cart
      join public.product_variants as variant on variant.id = cart.variant_id
      join public.products as product on product.id = variant.product_id
      where cart.user_id = current_user_id
      order by variant.id
    loop
      update public.product_variants
        set stock = stock - line.quantity
        where id = line.variant_id and stock >= line.quantity;
      if not found then
        raise exception 'Stock changed while placing the order. Please try again.';
      end if;
      insert into public.order_items(order_id, variant_id, product_id, product_name, image_url, selected_size, unit_price, quantity)
        values (created_order_id, line.variant_id, line.product_id, line.name, line.image_url, line.size_label, line.price, line.quantity);
    end loop;
    delete from public.cart_items where user_id = current_user_id;
  else
    update public.product_variants
      set stock = stock - p_quantity
      where id = p_variant_id and stock >= p_quantity;
    if not found then
      raise exception 'Stock changed while placing the order. Please try again.';
    end if;
    insert into public.order_items(order_id, variant_id, product_id, product_name, image_url, selected_size, unit_price, quantity)
      values (created_order_id, p_variant_id, line.product_id, line.name, line.image_url, line.size_label, line.price, p_quantity);
  end if;

  return query select created_order_id, calculated_total;
end;
$function$;

create or replace function public.cancel_customer_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_status text;
  line record;
begin
  if auth.uid() is null then
    raise exception 'Sign in to cancel an order.';
  end if;
  select order_record.status into current_status
    from public.orders as order_record
    where order_record.id = p_order_id and order_record.user_id = (select auth.uid())
    for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  if current_status not in ('placed', 'confirmed') then
    raise exception 'This order can no longer be cancelled.';
  end if;

  for line in
    select item.variant_id, item.quantity
    from public.order_items as item
    where item.order_id = p_order_id
    order by item.variant_id
    for update
  loop
    update public.product_variants
      set stock = stock + line.quantity
      where id = line.variant_id;
    if not found then
      raise exception 'Unable to restore inventory for this order.';
    end if;
  end loop;
  update public.orders
    set status = 'cancelled', cancelled_at = now()
    where id = p_order_id and user_id = (select auth.uid())
      and status in ('placed', 'confirmed');
  if not found then
    raise exception 'This order has already changed and can no longer be cancelled.';
  end if;
  insert into public.order_status_history(order_id, status) values (p_order_id, 'cancelled');
end;
$function$;

create or replace function public.admin_advance_order(p_order_id uuid, p_next_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_status text;
  expected_status text;
begin
  if not (select public.is_shop_admin()) then
    raise exception 'Administrator access required.';
  end if;
  select status into current_status from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  expected_status := case current_status
    when 'placed' then 'confirmed'
    when 'confirmed' then 'packed'
    when 'packed' then 'shipped'
    when 'shipped' then 'out_for_delivery'
    when 'out_for_delivery' then 'delivered'
    else null
  end;
  if expected_status is null or p_next_status <> expected_status then
    raise exception 'Order status can only advance to the next permitted step.';
  end if;
  update public.orders set status = p_next_status where id = p_order_id;
  insert into public.order_status_history(order_id, status) values (p_order_id, p_next_status);
end;
$function$;

create or replace function public.admin_store_summary()
returns table(
  total_products bigint,
  total_orders bigint,
  registered_customers bigint,
  total_stock_units bigint,
  low_stock_variants bigint,
  non_cancelled_order_value numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not (select public.is_shop_admin()) then
    raise exception 'Administrator access required.';
  end if;
  return query
    select
      (select count(*) from public.products),
      (select count(*) from public.orders),
      (select count(*) from auth.users where email <> 'aryanmajumder8565@gmail.com'),
      (select coalesce(sum(stock), 0) from public.product_variants),
      (select count(*) from public.product_variants where stock < 5),
      (select coalesce(sum(total), 0) from public.orders where status <> 'cancelled');
end;
$function$;

revoke all on function public.add_to_cart(uuid, integer) from public, anon;
revoke all on function public.set_cart_quantity(uuid, integer) from public, anon;
revoke all on function public.remove_from_cart(uuid) from public, anon;
revoke all on function public.create_cod_order(text, text, text, text, text, uuid, uuid, integer) from public, anon;
revoke all on function public.cancel_customer_order(uuid) from public, anon;
revoke all on function public.admin_advance_order(uuid, text) from public, anon;
revoke all on function public.admin_store_summary() from public, anon;
grant execute on function public.add_to_cart(uuid, integer) to authenticated;
grant execute on function public.set_cart_quantity(uuid, integer) to authenticated;
grant execute on function public.remove_from_cart(uuid) to authenticated;
grant execute on function public.create_cod_order(text, text, text, text, text, uuid, uuid, integer) to authenticated;
grant execute on function public.cancel_customer_order(uuid) to authenticated;
grant execute on function public.admin_advance_order(uuid, text) to authenticated;
grant execute on function public.admin_store_summary() to authenticated;
