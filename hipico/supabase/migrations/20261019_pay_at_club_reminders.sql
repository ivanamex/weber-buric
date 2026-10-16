-- "En el club" no longer goes quiet: a charge the family will pay at the office gets the normal reminders (5 days
-- before, the day, 3 days after, then weekly) with its own text, until it's paid. "Ya pagué en el club" moves it to
-- Cobros → Por revisar (no receipt, tagged "Dice que pagó en el club") and the reminders stop; the club approves it
-- (paid in cash) or rejects it with a note, and the reminders start again.

create or replace function said_paid_at_club(p_payment uuid) returns json
language plpgsql security definer set search_path = public as $$
declare v_family uuid;
begin
  v_family := my_family_id();
  if v_family is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  update payments set receipt_status = 'review', receipt_path = null, receipt_note = null, receipt_uploaded_at = now(), reviewed_at = null,
    meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object('saidPaidAtClub', club_now()::date::text)
  where id = p_payment and family_id = v_family and status = 'pending' and coalesce(receipt_status, '') <> 'review';
  if not found then return json_build_object('ok', false, 'code', 'notFound'); end if;
  return json_build_object('ok', true);
end $$;

create or replace function review_receipt(p_payment uuid, p_approve boolean, p_note text default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_p payments;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_p from payments where id = p_payment for update;
  if v_p.id is null or v_p.status <> 'pending' or v_p.receipt_status is distinct from 'review' then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  if p_approve then
    -- "Dice que pagó en el club" approved = paid in cash at the office; a receipt approved = a transfer.
    update payments set status = 'paid', method = case when coalesce(meta, '{}'::jsonb) ? 'saidPaidAtClub' then 'cash' else 'transfer' end,
      paid_at = now(), receipt_status = 'approved', receipt_note = null, reviewed_at = now()
    where id = p_payment;
    perform apply_plan_payment(v_p);
  else
    if coalesce(trim(p_note), '') = '' then return json_build_object('ok', false, 'code', 'noteRequired'); end if;
    update payments set receipt_status = 'rejected', receipt_note = left(trim(p_note), 280), reviewed_at = now(),
      meta = coalesce(meta, '{}'::jsonb) - 'saidPaidAtClub'
    where id = p_payment;
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function reminders_due(p_today date default club_now()::date) returns setof json
language plpgsql security definer set search_path = public as $$
declare p record; v_kind text; v_id uuid; v_on boolean; v_note text;
begin
  perform materialize_due_charges(p_today);
  select reminders_on, reminder_note into v_on, v_note from club_settings where id = 1;
  if not coalesce(v_on, true) then return; end if;
  for p in select pm.id, pm.service, pm.amount, pm.due_on, pm.meta, f.name as fname, f.contact, f.email
           from payments pm join families f on f.id = pm.family_id
           where pm.status = 'pending' and pm.due_on is not null and pm.due_on <= p_today + 5
             and coalesce(pm.receipt_status, '') <> 'review'
             and ((pm.created_at at time zone 'America/Cancun')::date < p_today
                  or (pm.service in ('plan', 'boarding') and coalesce(pm.meta ->> 'kind', '') <> 'upgrade'))
             and f.active and f.deleted_at is null
           order by pm.due_on loop
    v_kind := null;
    if p.due_on > p_today then
      if not exists (select 1 from payment_reminders x where x.payment_id = p.id and x.kind = 'before') then v_kind := 'before'; end if;
    elsif p.due_on = p_today then
      if not exists (select 1 from payment_reminders x where x.payment_id = p.id and x.kind = 'due') then v_kind := 'due'; end if;
    elsif p.due_on <= p_today - 3 then
      if not exists (select 1 from payment_reminders x where x.payment_id = p.id and x.kind = 'after') then v_kind := 'after';
      elsif not exists (select 1 from payment_reminders x where x.payment_id = p.id and x.sent_on > p_today - 7) then v_kind := 'weekly';
      end if;
    end if;
    continue when v_kind is null;
    v_id := null;
    insert into payment_reminders (payment_id, kind, sent_on) values (p.id, v_kind, p_today)
    on conflict do nothing returning id into v_id;
    continue when v_id is null;
    return next json_build_object(
      'id', v_id, 'paymentId', p.id, 'kind', v_kind, 'family', p.fname, 'contact', p.contact, 'email', p.email,
      'service', p.service, 'amount', p.amount, 'dueOn', p.due_on, 'note', v_note,
      'detail', coalesce((select name from riders where id = (p.meta ->> 'riderId')::uuid),
                         (select name from horses where id = (p.meta ->> 'horseId')::uuid), ''),
      'month', p.meta ->> 'month', 'classKind', p.meta ->> 'kind', 'payAtClub', p.meta ? 'payAtClub');
  end loop;
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
