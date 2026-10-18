create or replace function public.admin_set_product_active(p_product_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  updated_active boolean;
begin
  if not (select public.is_shop_admin()) then
    raise exception 'Administrator access required.';
  end if;

  update public.products
    set active = p_active,
        updated_at = now()
    where id = p_product_id
    returning active into updated_active;

  if not found then
    raise exception 'Product not found.';
  end if;

  return updated_active;
end;
$function$;

revoke all on function public.admin_set_product_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_product_active(uuid, boolean) to authenticated;
