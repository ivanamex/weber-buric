-- "En el club" on the website: the visitor who just enrolled says they will pay at the office. Like the website's
-- receipt, it only works on a pending charge the website created (meta.web), and it only marks it: the club still
-- records the payment as usual, Cobros shows "Paga en el club" and the reminders wait 3 days.

create or replace function web_pay_at_club(p_payment uuid) returns json
language plpgsql security definer set search_path = public as $$
begin
  update payments set meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object('payAtClub', club_now()::date::text)
    where id = p_payment and status = 'pending' and meta ->> 'web' = 'true';
  if not found then return json_build_object('ok', false, 'code', 'notFound'); end if;
  return json_build_object('ok', true);
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public_site() to anon;
grant execute on function send_contact_message(jsonb) to anon;
grant execute on function web_enroll(jsonb) to anon;
grant execute on function submit_web_receipt(uuid, text) to anon;
grant execute on function web_receipt_folder_ok(text) to anon;
grant execute on function web_pay_at_club(uuid) to anon;
revoke execute on function set_plan_for(uuid, int, date) from authenticated;
revoke execute on function card_payment_result(uuid, text, text) from authenticated;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
revoke execute on function apply_plan_payment(payments) from authenticated;
revoke execute on function release_booking(bookings) from authenticated;
revoke execute on function pick_horse(uuid, date, text, integer) from authenticated;
revoke execute on function horse_busy(uuid, date, text, integer) from authenticated;
revoke execute on function rider_busy(uuid, date, text, integer, uuid) from authenticated;
revoke execute on function mark_moved(uuid, text, text, date, date) from authenticated;
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
