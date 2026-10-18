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

revoke all on function public.is_shop_admin() from public;
revoke all on function public.is_shop_admin() from anon;
grant execute on function public.is_shop_admin() to authenticated;
