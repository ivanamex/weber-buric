-- Classes outside the packages: Clase muestra (trial, one per rider, ever), Clase suelta (no plan) and
-- Clase adicional (plan used up). Each has its own price and its own payment; the plan's count is not touched.

insert into prices (key, amount, label) values
  ('class_trial', 400, 'Clase muestra'),
  ('class_single', 650, 'Clase suelta'),
  ('class_extra', 600, 'Clase adicional')
on conflict (key) do nothing;

alter table bookings add column if not exists kind text not null default 'plan';
alter table bookings drop constraint if exists bookings_kind_check;
alter table bookings add constraint bookings_kind_check check (kind in ('plan', 'trial', 'single', 'extra'));
alter table bookings add column if not exists payment_id uuid references payments (id) on delete set null;

alter table payments drop constraint if exists payments_service_check;
alter table payments add constraint payments_service_check
  check (service in ('plan', 'boarding', 'camp', 'rental', 'events', 'class'));

-- A free horse for this rider at that date and time: their own boarded horse first, then a school horse.
create or replace function pick_horse(p_rider uuid, p_date date, p_time text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_horse uuid; v_own uuid;
begin
  select horse_id into v_own from riders where id = p_rider;
  perform pg_advisory_xact_lock(hashtext(p_date::text || p_time));
  select h.id into v_horse from horses h
  where h.id = v_own and h.active
    and not exists (select 1 from bookings b join slots s on s.id = b.slot_id
                    where b.horse_id = h.id and b.date = p_date and s.time = p_time and b.status <> 'cancelled');
  if v_horse is null then
    select h.id into v_horse from horses h
    where h.type = 'school' and h.active
      and not exists (select 1 from bookings b join slots s on s.id = b.slot_id
                      where b.horse_id = h.id and b.date = p_date and s.time = p_time and b.status <> 'cancelled')
    order by h.name limit 1;
  end if;
  return v_horse;
end $$;

-- Book one class outside the plan and create its payment (pending until paid, like everything else).
create or replace function book_single_class(p_rider uuid, p_slot uuid, p_date date, p_kind text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rider riders; v_slot slots; v_taken int; v_horse uuid; v_id uuid; v_pay uuid; v_price int; v_has_plan boolean;
begin
  if not (is_admin() or owns_rider(p_rider)) or p_kind not in ('trial', 'single', 'extra') then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  select * into v_rider from riders where id = p_rider and active;
  select * into v_slot from slots where id = p_slot and active;
  if v_rider.id is null or v_slot.id is null or v_slot.weekday <> extract(dow from p_date)::int then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  v_price := price_of('class_' || p_kind);
  if v_price is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if class_start(p_date, v_slot.time) <= now() then return json_build_object('ok', false, 'code', 'past'); end if;
  if exists (select 1 from slot_cancellations where slot_id = p_slot and date = p_date) then
    return json_build_object('ok', false, 'code', 'classCancelled');
  end if;

  v_has_plan := exists (select 1 from plans where rider_id = p_rider and month = to_char(p_date, 'YYYY-MM'));
  if p_kind = 'extra' and not v_has_plan then return json_build_object('ok', false, 'code', 'noPlan'); end if;
  if p_kind in ('trial', 'single') and v_has_plan then return json_build_object('ok', false, 'code', 'hasPlan'); end if;
  if p_kind = 'trial' and exists (select 1 from bookings where rider_id = p_rider and kind = 'trial' and status <> 'cancelled') then
    return json_build_object('ok', false, 'code', 'trialUsed');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_slot::text || p_date::text));
  if exists (select 1 from bookings where slot_id = p_slot and date = p_date and rider_id = p_rider and status <> 'cancelled') then
    return json_build_object('ok', false, 'code', 'already');
  end if;
  select count(*) into v_taken from bookings where slot_id = p_slot and date = p_date and status <> 'cancelled';
  if v_taken >= v_slot.capacity then return json_build_object('ok', false, 'code', 'full'); end if;
  if v_rider.level <> v_slot.level then return json_build_object('ok', false, 'code', 'level'); end if;

  v_horse := pick_horse(p_rider, p_date, v_slot.time);
  if v_horse is null then return json_build_object('ok', false, 'code', 'noHorse'); end if;

  insert into bookings (slot_id, date, rider_id, horse_id, kind) values (p_slot, p_date, p_rider, v_horse, p_kind) returning id into v_id;
  insert into payments (family_id, service, amount, meta)
  values (v_rider.family_id, 'class', v_price,
          json_build_object('riderId', p_rider, 'kind', p_kind, 'date', p_date, 'slotId', p_slot, 'bookingId', v_id)::jsonb)
  returning id into v_pay;
  update bookings set payment_id = v_pay where id = v_id;
  return json_build_object('ok', true, 'booking_id', v_id, 'payment_id', v_pay, 'amount', v_price);
end $$;

-- What a cancelled booking gives back: a plan class returns to the plan; a class paid on its own drops its unpaid charge.
create or replace function release_booking(v_b bookings) returns void
language plpgsql security definer set search_path = public as $$
begin
  if v_b.kind = 'plan' then
    update plans set used = greatest(used - 1, 0) where rider_id = v_b.rider_id and month = to_char(v_b.date, 'YYYY-MM');
  elsif v_b.payment_id is not null then
    delete from payments where id = v_b.payment_id and status = 'pending' and coalesce(receipt_status, '') <> 'review';
  end if;
end $$;

create or replace function cancel_booking(p_booking uuid) returns json
language plpgsql security definer set search_path = public as $$
declare v_b bookings; v_time text;
begin
  select * into v_b from bookings where id = p_booking for update;
  if v_b.id is null or not (is_admin() or owns_rider(v_b.rider_id)) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select time into v_time from slots where id = v_b.slot_id;
  if v_b.status <> 'booked' or class_start(v_b.date, v_time) - now() < interval '12 hours' then
    return json_build_object('ok', false, 'code', 'tooLate');
  end if;
  update bookings set status = 'cancelled', cancelled_at = now() where id = p_booking;
  perform release_booking(v_b);
  return json_build_object('ok', true);
end $$;

create or replace function cancel_class_date(p_slot uuid, p_date date, p_reason text default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_slot slots; b bookings; v_count int := 0;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_slot from slots where id = p_slot;
  if v_slot.id is null or v_slot.weekday <> extract(dow from p_date)::int then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_date < club_now()::date then return json_build_object('ok', false, 'code', 'past'); end if;
  perform pg_advisory_xact_lock(hashtext(p_slot::text || p_date::text));
  insert into slot_cancellations (slot_id, date, reason) values (p_slot, p_date, nullif(trim(coalesce(p_reason, '')), ''))
  on conflict (slot_id, date) do update set reason = excluded.reason;
  for b in select * from bookings where slot_id = p_slot and date = p_date and status = 'booked' for update loop
    update bookings set status = 'cancelled', cancelled_by_club = true, cancelled_at = now() where id = b.id;
    perform release_booking(b);
    v_count := v_count + 1;
  end loop;
  return json_build_object('ok', true, 'cancelled', v_count);
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
revoke execute on function apply_plan_payment(payments) from authenticated;
revoke execute on function release_booking(bookings) from authenticated;
revoke execute on function pick_horse(uuid, date, text) from authenticated;
