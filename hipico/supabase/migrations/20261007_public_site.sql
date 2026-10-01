-- The club website reads a few public facts without signing in: plan prices,
-- upcoming events and (when the module is on) the horses for sale.
-- Nothing personal: no families, riders, owners, payments or sale prices.

create or replace function public_site() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'prices', coalesce((
      select jsonb_object_agg(key, amount) from prices
      where key like 'plan\_%' or key in ('class_trial', 'class_single', 'boarding_monthly')
    ), '{}'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'type', type, 'startDate', start_date, 'endDate', end_date, 'ages', ages, 'price', price
      ) order by start_date)
      from events where active and end_date >= club_now()::date
    ), '[]'::jsonb),
    'sales', case when coalesce((select module_sales from club_settings where id = 1), false) then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'level', level, 'breed', breed, 'sex', sex,
        'age', coalesce(age, extract(year from club_now())::int - birth_year),
        'photo', photos[1]
      ) order by name)
      from horses where status = 'for_sale'
    ), '[]'::jsonb) end
  )
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public_site() to anon;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
revoke execute on function apply_plan_payment(payments) from authenticated;
revoke execute on function release_booking(bookings) from authenticated;
revoke execute on function pick_horse(uuid, date, text) from authenticated;
revoke execute on function open_period(riders, date) from authenticated;
revoke execute on function plan_at(uuid, date) from authenticated;
revoke execute on function plans_fill_period() from authenticated;
revoke execute on function slot_with(slots, jsonb) from authenticated;
revoke execute on function payment_due(payments) from authenticated;
revoke execute on function payments_fill_due() from authenticated;
revoke execute on function materialize_due_charges(date) from authenticated;
revoke execute on function reminders_due(date) from authenticated;
revoke execute on function reminder_mark(uuid, text) from authenticated;
revoke execute on function reminders_finish(boolean) from authenticated;
