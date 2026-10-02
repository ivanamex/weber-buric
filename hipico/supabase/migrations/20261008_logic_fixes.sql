-- Logic fixes: horses by level and real overlaps, one class at a time per rider, plans assigned without
-- moving other plans or marking a pending charge paid, closed weekdays and deleted families free their places,
-- "Todos vinieron" keeps a "No vino", a downgrade waits for an unpaid upgrade, and a new class time is shown to the family.

alter table bookings add column if not exists moved_from text;

-- ───────── Horses and riders: busy at an overlapping time (classes by their length, rides by their hours) ─────────
create or replace function horse_busy(p_horse uuid, p_date date, p_time text, p_minutes int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from bookings b join slots s on s.id = b.slot_id
                 where b.horse_id = p_horse and b.date = p_date and b.status <> 'cancelled'
                   and class_start(p_date, s.time) < class_start(p_date, p_time) + make_interval(mins => p_minutes)
                   and class_start(p_date, p_time) < class_start(p_date, s.time) + make_interval(mins => coalesce(s.duration, 60)))
      or exists (select 1 from rentals r where r.horse_id = p_horse and r.date = p_date and r.status <> 'cancelled'
                   and class_start(p_date, r.time) < class_start(p_date, p_time) + make_interval(mins => p_minutes)
                   and class_start(p_date, p_time) < class_start(p_date, r.time) + make_interval(hours => r.hours))
$$;

create or replace function rider_busy(p_rider uuid, p_date date, p_time text, p_minutes int, p_except uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from bookings b join slots s on s.id = b.slot_id
                 where b.rider_id = p_rider and b.date = p_date and b.status <> 'cancelled' and b.slot_id is distinct from p_except
                   and class_start(p_date, s.time) < class_start(p_date, p_time) + make_interval(mins => p_minutes)
                   and class_start(p_date, p_time) < class_start(p_date, s.time) + make_interval(mins => coalesce(s.duration, 60)))
$$;

create or replace function level_rank(p_level text) returns int
language sql immutable as $$
  select case p_level when 'beginner' then 0 when 'intermediate' then 1 when 'advanced' then 2 when 'competition' then 3 else 99 end
$$;

-- The rider's own horse if free; else a free school horse at the rider's level, then the nearest level
-- (the gentler one on a tie), then by name. Never a horse for sale or retired. Same order as the app.
drop function if exists pick_horse(uuid, date, text);
create or replace function pick_horse(p_rider uuid, p_date date, p_time text, p_minutes int default 60) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_horse uuid; v_own uuid; v_want int;
begin
  select horse_id, level_rank(level) into v_own, v_want from riders where id = p_rider;
  if v_want is null or v_want = 99 then v_want := 0; end if;
  perform pg_advisory_xact_lock(hashtext('horses' || p_date::text));
  select h.id into v_horse from horses h
  where h.id = v_own and h.active and coalesce(h.status, 'school') not in ('for_sale', 'retired', 'sold')
    and not horse_busy(h.id, p_date, p_time, p_minutes);
  if v_horse is null then
    select h.id into v_horse from horses h
    where h.status = 'school' and h.active and not horse_busy(h.id, p_date, p_time, p_minutes)
    order by abs(level_rank(h.level) - v_want), level_rank(h.level), h.name collate "C"
    limit 1;
  end if;
  return v_horse;
end $$;

create or replace function book_class(p_rider uuid, p_slot uuid, p_date date) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rider riders; v_slot slots; v_plan plans; v_taken int; v_horse uuid; v_id uuid;
begin
  if not (is_admin() or owns_rider(p_rider)) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_rider from riders where id = p_rider and active;
  select * into v_slot from slots where id = p_slot and active;
  if v_rider.id is null or v_slot.id is null or not slot_runs(v_slot, p_date) then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  if class_start(p_date, v_slot.time) <= now() then return json_build_object('ok', false, 'code', 'past'); end if;
  if club_closed(p_date) then return json_build_object('ok', false, 'code', 'closed'); end if;
  if exists (select 1 from slot_cancellations where slot_id = p_slot and date = p_date) then
    return json_build_object('ok', false, 'code', 'classCancelled');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_slot::text || p_date::text));
  if exists (select 1 from bookings where slot_id = p_slot and date = p_date and rider_id = p_rider and status <> 'cancelled') then
    return json_build_object('ok', false, 'code', 'already');
  end if;
  if rider_busy(p_rider, p_date, v_slot.time, coalesce(v_slot.duration, 60), p_slot) then
    return json_build_object('ok', false, 'code', 'overlap');
  end if;
  select count(*) into v_taken from bookings where slot_id = p_slot and date = p_date and status <> 'cancelled';
  if v_taken >= v_slot.capacity then return json_build_object('ok', false, 'code', 'full'); end if;
  if v_rider.level <> v_slot.level then return json_build_object('ok', false, 'code', 'level'); end if;

  perform pg_advisory_xact_lock(hashtext(p_rider::text));
  v_plan := plan_at(p_rider, p_date);
  -- A standing plan renews on its own date: the new period is created (unpaid) on the first booking in it.
  if v_plan.id is null and v_rider.plan_classes is not null
     and (v_rider.plan_start is null or v_rider.plan_start <= p_date)
     and price_of('plan_' || v_rider.plan_classes) is not null then
    v_plan := open_period(v_rider, p_date);
  end if;
  if v_plan.id is null then return json_build_object('ok', false, 'code', 'noPlan'); end if;
  if v_plan.used >= v_plan.total then return json_build_object('ok', false, 'code', 'planEmpty'); end if;

  v_horse := pick_horse(p_rider, p_date, v_slot.time, coalesce(v_slot.duration, 60));
  if v_horse is null then return json_build_object('ok', false, 'code', 'noHorse'); end if;

  update plans set used = used + 1 where id = v_plan.id;
  insert into bookings (slot_id, date, rider_id, horse_id) values (p_slot, p_date, p_rider, v_horse) returning id into v_id;
  return json_build_object('ok', true, 'booking_id', v_id, 'remaining', v_plan.total - v_plan.used - 1);
end $$;

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
  if v_rider.id is null or v_slot.id is null or not slot_runs(v_slot, p_date) then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  v_price := price_of('class_' || p_kind);
  if v_price is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if class_start(p_date, v_slot.time) <= now() then return json_build_object('ok', false, 'code', 'past'); end if;
  if club_closed(p_date) then return json_build_object('ok', false, 'code', 'closed'); end if;
  if exists (select 1 from slot_cancellations where slot_id = p_slot and date = p_date) then
    return json_build_object('ok', false, 'code', 'classCancelled');
  end if;
  v_has_plan := (plan_at(p_rider, p_date)).id is not null;
  if p_kind = 'extra' and not v_has_plan then return json_build_object('ok', false, 'code', 'noPlan'); end if;
  if p_kind in ('trial', 'single') and v_has_plan then return json_build_object('ok', false, 'code', 'hasPlan'); end if;
  if p_kind = 'trial' and exists (select 1 from bookings where rider_id = p_rider and kind = 'trial' and status <> 'cancelled') then
    return json_build_object('ok', false, 'code', 'trialUsed');
  end if;
  perform pg_advisory_xact_lock(hashtext(p_slot::text || p_date::text));
  if exists (select 1 from bookings where slot_id = p_slot and date = p_date and rider_id = p_rider and status <> 'cancelled') then
    return json_build_object('ok', false, 'code', 'already');
  end if;
  if rider_busy(p_rider, p_date, v_slot.time, coalesce(v_slot.duration, 60), p_slot) then
    return json_build_object('ok', false, 'code', 'overlap');
  end if;
  select count(*) into v_taken from bookings where slot_id = p_slot and date = p_date and status <> 'cancelled';
  if v_taken >= v_slot.capacity then return json_build_object('ok', false, 'code', 'full'); end if;
  if v_rider.level <> v_slot.level then return json_build_object('ok', false, 'code', 'level'); end if;
  v_horse := pick_horse(p_rider, p_date, v_slot.time, coalesce(v_slot.duration, 60));
  if v_horse is null then return json_build_object('ok', false, 'code', 'noHorse'); end if;
  insert into bookings (slot_id, date, rider_id, horse_id, kind) values (p_slot, p_date, p_rider, v_horse, p_kind) returning id into v_id;
  insert into payments (family_id, service, amount, meta)
  values (v_rider.family_id, 'class', v_price,
          json_build_object('riderId', p_rider, 'kind', p_kind, 'date', p_date, 'slotId', p_slot, 'bookingId', v_id)::jsonb)
  returning id into v_pay;
  update bookings set payment_id = v_pay where id = v_id;
  return json_build_object('ok', true, 'booking_id', v_id, 'payment_id', v_pay, 'amount', v_price);
end $$;

create or replace function book_rental(p_date date, p_time text, p_hours int, p_horse uuid) returns json
language plpgsql security definer set search_path = public as $$
declare v_family uuid; v_start timestamptz; v_end timestamptz; v_id uuid;
begin
  v_family := my_family_id();
  if v_family is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_date is null or p_time is null or p_horse is null or p_hours not between 1 and 4 then
    return json_build_object('ok', false, 'code', 'missing');
  end if;
  if not exists (select 1 from horses where id = p_horse and status = 'school' and active) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  v_start := class_start(p_date, p_time);
  v_end := v_start + make_interval(hours => p_hours);
  if v_start <= now() then return json_build_object('ok', false, 'code', 'past'); end if;
  perform pg_advisory_xact_lock(hashtext(p_horse::text || p_date::text));
  if exists (select 1 from rentals r where r.horse_id = p_horse and r.status <> 'cancelled'
             and class_start(r.date, r.time) < v_end and v_start < class_start(r.date, r.time) + make_interval(hours => r.hours))
     or exists (select 1 from bookings b join slots s on s.id = b.slot_id
                where b.horse_id = p_horse and b.date = p_date and b.status <> 'cancelled'
                  and class_start(b.date, s.time) < v_end and v_start < class_start(b.date, s.time) + make_interval(mins => s.duration)) then
    return json_build_object('ok', false, 'code', 'horseBusy');
  end if;
  insert into rentals (family_id, date, time, hours, horse_id) values (v_family, p_date, p_time, p_hours, p_horse) returning id into v_id;
  insert into payments (family_id, service, amount, meta)
  values (v_family, 'rental', price_of('rental_per_hour') * p_hours, json_build_object('rentalId', v_id)::jsonb);
  return json_build_object('ok', true, 'rental_id', v_id);
end $$;

-- ───────── Plans ─────────
create or replace function change_plan(p_rider uuid, p_classes int) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rider riders; v_plan plans; v_next plans; v_pay payments; v_pay_id uuid;
  v_new int; v_old int; v_today date := club_now()::date; v_eff date;
begin
  if not (is_admin() or owns_rider(p_rider)) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_rider from riders where id = p_rider and active;
  v_new := price_of('plan_' || p_classes);
  if v_rider.id is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if v_new is null then return json_build_object('ok', false, 'code', 'badPlan'); end if;
  v_plan := plan_at(p_rider, v_today);
  if v_plan.id is null then return json_build_object('ok', false, 'code', 'noPlan'); end if;
  perform 1 from plans where id = v_plan.id for update;
  if p_classes = v_plan.total and coalesce(v_rider.plan_classes, v_plan.total) = p_classes then
    return json_build_object('ok', false, 'code', 'samePlan');
  end if;

  if p_classes > v_plan.total then
    if exists (select 1 from payments where service = 'plan' and status = 'pending' and meta ->> 'kind' = 'upgrade'
               and meta ->> 'riderId' = p_rider::text and meta ->> 'month' = v_plan.month) then
      return json_build_object('ok', false, 'code', 'pendingExists');
    end if;
    if not v_plan.paid then
      select * into v_pay from payments where service = 'plan' and status = 'pending'
        and meta ->> 'riderId' = p_rider::text and meta ->> 'month' = v_plan.month for update;
      if v_pay.receipt_status = 'review' then return json_build_object('ok', false, 'code', 'pendingExists'); end if;
      update plans set total = p_classes where id = v_plan.id;
      if v_pay.id is not null then
        update payments set amount = v_new, meta = meta || jsonb_build_object('classes', p_classes) where id = v_pay.id;
        v_pay_id := v_pay.id;
      else
        insert into payments (family_id, service, amount, meta)
        values (v_rider.family_id, 'plan', v_new, json_build_object('riderId', p_rider, 'month', v_plan.month, 'start', v_plan.starts_on, 'classes', p_classes)::jsonb)
        returning id into v_pay_id;
      end if;
    else
      v_old := coalesce(price_of('plan_' || v_plan.total), 0);
      insert into payments (family_id, service, amount, meta)
      values (v_rider.family_id, 'plan', greatest(v_new - v_old, 0),
              json_build_object('riderId', p_rider, 'month', v_plan.month, 'start', v_plan.starts_on, 'classes', p_classes,
                                'fromClasses', v_plan.total, 'kind', 'upgrade')::jsonb)
      returning id into v_pay_id;
    end if;
    update riders set plan_classes = p_classes, plan_start = coalesce(plan_start, v_plan.starts_on) where id = p_rider;
    insert into plan_changes (rider_id, family_id, from_classes, to_classes, kind, effective_month, effective_on, payment_id)
    values (p_rider, v_rider.family_id, v_plan.total, p_classes, 'upgrade', v_plan.month, v_today, v_pay_id);
    return json_build_object('ok', true, 'kind', 'upgrade', 'payment_id', v_pay_id, 'effective', v_today);
  end if;

  -- Downgrade: from the next renewal date, never while an upgrade is still unpaid.
  if exists (select 1 from payments where service = 'plan' and status = 'pending' and meta ->> 'kind' = 'upgrade'
             and meta ->> 'riderId' = p_rider::text and meta ->> 'month' = v_plan.month) then
    return json_build_object('ok', false, 'code', 'pendingExists');
  end if;
  v_eff := v_plan.ends_on + 1;
  update riders set plan_classes = p_classes, plan_start = coalesce(plan_start, v_plan.starts_on) where id = p_rider;
  v_next := plan_at(p_rider, v_eff);
  if v_next.id is not null and not v_next.paid and v_next.used <= p_classes then
    update plans set total = p_classes where id = v_next.id;
    update payments set amount = v_new, meta = meta || jsonb_build_object('classes', p_classes)
    where service = 'plan' and status = 'pending' and coalesce(receipt_status, '') <> 'review'
      and meta ->> 'riderId' = p_rider::text and meta ->> 'month' = v_next.month;
  end if;
  insert into plan_changes (rider_id, family_id, from_classes, to_classes, kind, effective_month, effective_on)
  values (p_rider, v_rider.family_id, v_plan.total, p_classes, 'downgrade', to_char(v_eff, 'YYYY-MM'), v_eff);
  return json_build_object('ok', true, 'kind', 'downgrade', 'effective', v_eff);
end $$;

-- Management assigns a plan: the period runs from p_start (or keeps the rider's date). It updates the plan that period
-- overlaps (never a second, overlapping one) and is only marked paid when no charge for it is still pending.
create or replace function admin_set_plan(p_rider uuid, p_classes int, p_start date default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rider riders; v_plan plans; v_today date := club_now()::date; v_anchor date; v_per record; v_month text; v_old text; v_pending boolean;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_rider from riders where id = p_rider;
  if v_rider.id is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_classes is not null and price_of('plan_' || p_classes) is null then return json_build_object('ok', false, 'code', 'badPlan'); end if;
  if p_classes is null then
    update riders set plan_classes = null, plan_start = null where id = p_rider;
    return json_build_object('ok', true);
  end if;
  perform pg_advisory_xact_lock(hashtext(p_rider::text));
  v_anchor := coalesce(p_start, v_rider.plan_start, v_today);
  select * into v_per from period_of(v_anchor, greatest(v_anchor, v_today));
  v_month := to_char(v_per.starts_on, 'YYYY-MM');
  select * into v_plan from plans
  where rider_id = p_rider and starts_on <= v_per.ends_on and ends_on >= v_per.starts_on
  order by (v_today between starts_on and ends_on) desc, starts_on desc
  limit 1 for update;
  if v_plan.id is not null and p_classes < v_plan.used then return json_build_object('ok', false, 'code', 'belowUsed'); end if;
  v_old := coalesce(v_plan.month, v_month);
  v_pending := exists (select 1 from payments where service = 'plan' and status = 'pending' and coalesce(meta ->> 'kind', '') <> 'upgrade'
                       and meta ->> 'riderId' = p_rider::text and meta ->> 'month' in (v_month, v_old));
  update riders set plan_classes = p_classes, plan_start = v_anchor where id = p_rider;
  -- Other unused, unpaid periods inside the new one go away; an earlier one now ends the day before.
  delete from plans where rider_id = p_rider and id is distinct from v_plan.id and used = 0 and not paid
    and starts_on <= v_per.ends_on and ends_on >= v_per.starts_on;
  update plans set ends_on = v_per.starts_on - 1
  where rider_id = p_rider and id is distinct from v_plan.id and starts_on < v_per.starts_on and ends_on >= v_per.starts_on;
  if v_plan.id is not null then
    update plans set total = p_classes, paid = paid or not v_pending, starts_on = v_per.starts_on, ends_on = v_per.ends_on,
      month = case when exists (select 1 from plans x where x.rider_id = p_rider and x.month = v_month and x.id <> v_plan.id)
                   then month else v_month end
    where id = v_plan.id returning * into v_plan;
  else
    insert into plans (rider_id, month, total, paid, starts_on, ends_on)
    values (p_rider, v_month, p_classes, not v_pending, v_per.starts_on, v_per.ends_on)
    returning * into v_plan;
  end if;
  -- A pending charge follows the plan (not while its receipt is being reviewed).
  update payments set amount = price_of('plan_' || p_classes), due_on = v_plan.starts_on,
    meta = meta || jsonb_build_object('classes', p_classes, 'month', v_plan.month, 'start', v_plan.starts_on)
  where service = 'plan' and status = 'pending' and coalesce(receipt_status, '') <> 'review' and coalesce(meta ->> 'kind', '') <> 'upgrade'
    and meta ->> 'riderId' = p_rider::text and meta ->> 'month' in (v_month, v_old);
  return json_build_object('ok', true);
end $$;

-- ───────── Attendance: "Todos vinieron" only marks riders still booked (a "No vino" stays) ─────────
create or replace function mark_class_attended(p_slot uuid, p_date date) returns json
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  update bookings set status = 'attended' where slot_id = p_slot and date = p_date and status = 'booked';
  get diagnostics v_count = row_count;
  return json_build_object('ok', true, 'marked', v_count);
end $$;

-- ───────── Closed weekdays: classes already booked on them are cancelled and return to the plans ─────────
create or replace function set_closed_weekdays(p_days int[]) returns json
language plpgsql security definer set search_path = public as $$
declare v_days int[]; b bookings; v_classes int := 0; v_count int := 0;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select coalesce(array_agg(distinct d order by d), '{}') into v_days from unnest(coalesce(p_days, '{}'::int[])) d where d between 0 and 6;
  update club_settings set closed_weekdays = v_days where id = 1;
  select count(distinct (bk.slot_id, bk.date)) into v_classes from bookings bk join slots s on s.id = bk.slot_id
  where bk.status = 'booked' and extract(dow from bk.date)::int = any (v_days) and class_start(bk.date, s.time) > now();
  for b in select bk.* from bookings bk join slots s on s.id = bk.slot_id
           where bk.status = 'booked' and extract(dow from bk.date)::int = any (v_days) and class_start(bk.date, s.time) > now()
           for update of bk loop
    update bookings set status = 'cancelled', cancelled_by_club = true, cancelled_at = now() where id = b.id;
    perform release_booking(b);
    v_count := v_count + 1;
  end loop;
  return json_build_object('ok', true, 'classes', v_classes, 'bookings', v_count);
end $$;

-- ───────── Deleting a family frees its places: its classes from now on go back to the plans ─────────
create or replace function admin_delete_family(p_family uuid) returns json
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if not exists (select 1 from families where id = p_family) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  update families set deleted_at = coalesce(deleted_at, now()) where id = p_family;
  for b in select bk.* from bookings bk join slots s on s.id = bk.slot_id join riders r on r.id = bk.rider_id
           where r.family_id = p_family and bk.status = 'booked' and class_start(bk.date, s.time) > now()
           for update of bk loop
    update bookings set status = 'cancelled', cancelled_at = now() where id = b.id;
    perform release_booking(b);
  end loop;
  return json_build_object('ok', true);
end $$;

-- ───────── A new class time is shown to the families booked in it ("Cambio de horario") ─────────
create or replace function mark_moved(p_slot uuid, p_from text, p_to text, p_since date, p_until date) returns void
language sql security definer set search_path = public as $$
  update bookings set moved_from = coalesce(moved_from, p_from)
  where slot_id = p_slot and status = 'booked' and p_from is distinct from p_to
    and date >= greatest(p_since, club_now()::date) and (p_until is null or date <= p_until)
$$;

create or replace function edit_class(p_slot uuid, p_date date, p_scope text, p_fields jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare
  v slots; n slots; seg slots; b bookings; f jsonb := coalesce(p_fields, '{}'::jsonb); v_series uuid; v_one_off boolean; v_count int := 0;
  v_today date := club_now()::date;
begin
  if not is_admin() or p_scope not in ('one', 'following', 'all') then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v from slots where id = p_slot for update;
  if v.id is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  v_series := coalesce(v.series_id, v.id);
  v_one_off := v.starts_on is not null and v.starts_on = v.ends_on;
  if p_scope <> 'all' then
    if p_date is null or not slot_runs(v, p_date) then return json_build_object('ok', false, 'code', 'notFound'); end if;
    if p_date < club_now()::date then return json_build_object('ok', false, 'code', 'past'); end if;
  end if;
  if v_one_off and p_scope = 'one' then p_scope := 'all'; end if;

  if p_scope = 'all' then
    for seg in select * from slots where id = v.id or series_id = v_series or id = v_series for update loop
      n := slot_with(seg, f);
      update slots set time = n.time, duration = n.duration, discipline = n.discipline, level = n.level,
        instructor_id = n.instructor_id, arena = n.arena, capacity = n.capacity, active = n.active
      where id = seg.id;
      perform mark_moved(seg.id, seg.time, n.time, v_today, null);
    end loop;
    return json_build_object('ok', true, 'id', v.id);
  end if;

  if p_scope = 'one' then
    if exists (select 1 from slot_cancellations where slot_id = v.id and date = p_date) then
      return json_build_object('ok', false, 'code', 'classCancelled');
    end if;
    n := slot_with(v, f);
    n.id := gen_random_uuid(); n.starts_on := p_date; n.ends_on := p_date; n.series_id := null;
    insert into slots select n.*;
    insert into slot_cancellations (slot_id, date, replaced_by) values (v.id, p_date, n.id);
    update bookings set slot_id = n.id where slot_id = v.id and date = p_date;
    perform mark_moved(n.id, v.time, n.time, p_date, p_date);
    return json_build_object('ok', true, 'id', n.id);
  end if;

  -- 'following'
  if f ? 'end' then
    for seg in select * from slots where (id = v.id or series_id = v_series or id = v_series)
                                      and (ends_on is null or ends_on >= p_date) for update loop
      for b in select * from bookings where slot_id = seg.id and date >= p_date and status = 'booked' for update loop
        update bookings set status = 'cancelled', cancelled_by_club = true, cancelled_at = now() where id = b.id;
        perform release_booking(b);
        v_count := v_count + 1;
      end loop;
      update slots set ends_on = p_date - 1 where id = seg.id;
    end loop;
    return json_build_object('ok', true, 'cancelled', v_count);
  end if;
  for seg in select * from slots where (series_id = v_series or id = v_series) and id <> v.id and starts_on > p_date for update loop
    n := slot_with(seg, f);
    update slots set time = n.time, duration = n.duration, discipline = n.discipline, level = n.level,
      instructor_id = n.instructor_id, arena = n.arena, capacity = n.capacity, active = n.active
    where id = seg.id;
    perform mark_moved(seg.id, seg.time, n.time, v_today, null);
  end loop;
  if v.starts_on is not null and v.starts_on >= p_date then
    n := slot_with(v, f);
    update slots set time = n.time, duration = n.duration, discipline = n.discipline, level = n.level,
      instructor_id = n.instructor_id, arena = n.arena, capacity = n.capacity, active = n.active
    where id = v.id;
    perform mark_moved(v.id, v.time, n.time, v_today, null);
    return json_build_object('ok', true, 'id', v.id);
  end if;
  n := slot_with(v, f);
  n.id := gen_random_uuid(); n.starts_on := p_date; n.series_id := v_series;
  insert into slots select n.*;
  update slots set ends_on = p_date - 1, series_id = v_series where id = v.id;
  update bookings set slot_id = n.id where slot_id = v.id and date >= p_date;
  perform mark_moved(n.id, v.time, n.time, p_date, null);
  update slot_cancellations set slot_id = n.id where slot_id = v.id and date >= p_date;
  return json_build_object('ok', true, 'id', n.id);
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public_site() to anon;
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
