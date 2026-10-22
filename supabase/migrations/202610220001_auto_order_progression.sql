create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.auto_advance_shop_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  order_record record;
  status_since timestamptz;
  next_status text;
  advanced_count integer := 0;
begin
  for order_record in
    select order_row.id, order_row.status, order_row.created_at
    from public.orders as order_row
    where order_row.status in ('placed', 'confirmed', 'packed')
    order by order_row.created_at
    for update of order_row skip locked
  loop
    if order_record.status = 'placed' then
      status_since := order_record.created_at;
      next_status := 'confirmed';
      if pg_catalog.now() < status_since + interval '5 minutes' then
        continue;
      end if;
    else
      select history.created_at
        into status_since
        from public.order_status_history as history
        where history.order_id = order_record.id
          and history.status = order_record.status
        order by history.created_at desc
        limit 1;

      if status_since is null then
        raise exception 'Missing status history for order % at status %.',
          order_record.id, order_record.status;
      end if;

      if order_record.status = 'confirmed' then
        next_status := 'packed';
        if pg_catalog.now() < status_since + interval '30 minutes' then
          continue;
        end if;
      else
        next_status := 'shipped';
        if pg_catalog.now() < status_since + interval '4 hours' then
          continue;
        end if;
      end if;
    end if;

    update public.orders
      set status = next_status
      where id = order_record.id;
    insert into public.order_status_history(order_id, status)
      values (order_record.id, next_status);
    advanced_count := advanced_count + 1;
  end loop;

  return advanced_count;
end;
$function$;

revoke all on function public.auto_advance_shop_orders() from public, anon, authenticated;

do $block$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname = 'shop-easy-auto-advance-orders'
  loop
    perform cron.unschedule(existing_job);
  end loop;

  perform cron.schedule(
    'shop-easy-auto-advance-orders',
    '* * * * *',
    'select public.auto_advance_shop_orders();'
  );
end;
$block$;
