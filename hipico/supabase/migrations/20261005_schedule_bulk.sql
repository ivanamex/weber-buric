-- Horario in bulk: classes valid for a date range, edits to one date / the following / the whole series,
-- cancelling a range of dates, copying a week, and club-wide closed days (weekdays + specific dates).

alter table slots add column if not exists starts_on date;
alter table slots add column if not exists ends_on date;
alter table slots add column if not exists series_id uuid;
-- A date that was edited on its own ("Solo esta clase") points to the one-off class that replaces it.
alter table slot_cancellations add column if not exists replaced_by uuid references slots (id) on delete cascade;
alter table club_settings add column if not exists closed_weekdays integer[] not null default '{1}';

create table if not exists closed_dates (
  id         uuid primary key default gen_random_uuid(),
  starts_on  date not null,
  ends_on    date not null,
  note       text,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
alter table closed_dates enable row level security;
drop policy if exists read_all on closed_dates;
create policy read_all on closed_dates for select to authenticated using (true);
drop policy if exists admin_all on closed_dates;
create policy admin_all on closed_dates for all to authenticated using (is_admin()) with check (is_admin());
grant select, insert, update, delete on closed_dates to authenticated;

-- Is the club closed that day (a closed weekday or inside a closed date range)?
create or replace function club_closed(p_date date) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select extract(dow from p_date)::int = any (closed_weekdays) from club_settings where id = 1), false)
      or exists (select 1 from closed_dates where p_date between starts_on and ends_on)
$$;

-- Does this weekly class happen on that date (right weekday, inside its validity)?
create or replace function slot_runs(v slots, p_date date) returns boolean
language sql stable as $$
  select v.weekday = extract(dow from p_date)::int
     and (v.starts_on is null or v.starts_on <= p_date)
     and (v.ends_on is null or p_date <= v.ends_on)
$$;

-- A class with the edited fields applied (the day of the week never changes here).
create or replace function slot_with(v slots, f jsonb) returns slots
language plpgsql stable as $$
begin
  v.time          := coalesce(f->>'time', v.time);
  v.duration      := coalesce((f->>'duration')::int, v.duration);
  v.discipline    := coalesce(f->>'discipline', v.discipline);
  v.level         := coalesce(f->>'level', v.level);
  v.instructor_id := coalesce((f->>'instructorId')::uuid, v.instructor_id);
  v.arena         := coalesce(f->>'arena', v.arena);
  v.capacity      := coalesce((f->>'capacity')::int, v.capacity);
  v.active        := coalesce((f->>'active')::boolean, v.active);
  return v;
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

  v_horse := pick_horse(p_rider, p_date, v_slot.time);
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

create or replace function cancel_class_date(p_slot uuid, p_date date, p_reason text default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_slot slots; b bookings; v_count int := 0;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_slot from slots where id = p_slot;
  if v_slot.id is null or not slot_runs(v_slot, p_date) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_date < club_now()::date then return json_build_object('ok', false, 'code', 'past'); end if;
  perform pg_advisory_xact_lock(hashtext(p_slot::text || p_date::text));
  insert into slot_cancellations (slot_id, date, reason) values (p_slot, p_date, nullif(trim(coalesce(p_reason, '')), ''))
  on conflict (slot_id, date) do update set reason = excluded.reason where slot_cancellations.replaced_by is null;
  for b in select * from bookings where slot_id = p_slot and date = p_date and status = 'booked' for update loop
    update bookings set status = 'cancelled', cancelled_by_club = true, cancelled_at = now() where id = b.id;
    perform release_booking(b);
    v_count := v_count + 1;
  end loop;
  return json_build_object('ok', true, 'cancelled', v_count);
end $$;

-- Reopening never removes the mark of a date that was edited on its own.
create or replace function reopen_class_date(p_slot uuid, p_date date) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  delete from slot_cancellations where slot_id = p_slot and date = p_date and replaced_by is null;
  return json_build_object('ok', true);
end $$;

-- Edit a repeating class: 'one' (only that date), 'following' (that date on) or 'all' (the whole series).
-- With {"end": true} and 'following', the series stops before that date and its bookings from then on are cancelled.
create or replace function edit_class(p_slot uuid, p_date date, p_scope text, p_fields jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare
  v slots; n slots; seg slots; b bookings; f jsonb := coalesce(p_fields, '{}'::jsonb); v_series uuid; v_one_off boolean; v_count int := 0;
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
  end loop;
  if v.starts_on is not null and v.starts_on >= p_date then
    n := slot_with(v, f);
    update slots set time = n.time, duration = n.duration, discipline = n.discipline, level = n.level,
      instructor_id = n.instructor_id, arena = n.arena, capacity = n.capacity, active = n.active
    where id = v.id;
    return json_build_object('ok', true, 'id', v.id);
  end if;
  n := slot_with(v, f);
  n.id := gen_random_uuid(); n.starts_on := p_date; n.series_id := v_series;
  insert into slots select n.*;
  update slots set ends_on = p_date - 1, series_id = v_series where id = v.id;
  update bookings set slot_id = n.id where slot_id = v.id and date >= p_date;
  update slot_cancellations set slot_id = n.id where slot_id = v.id and date >= p_date;
  return json_build_object('ok', true, 'id', n.id);
end $$;

-- Cancel every class between two dates (vacations, events): booked families get the class back and see the notice.
create or replace function cancel_class_range(p_from date, p_to date, p_reason text default null) returns json
language plpgsql security definer set search_path = public as $$
declare d date; sl slots; r json; v_classes int := 0; v_bookings int := 0;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then return json_build_object('ok', false, 'code', 'missing'); end if;
  if p_from < club_now()::date then return json_build_object('ok', false, 'code', 'past'); end if;
  for d in select g::date from generate_series(p_from, p_to, interval '1 day') g loop
    for sl in select s.* from slots s where s.active and slot_runs(s, d)
                and not exists (select 1 from slot_cancellations c where c.slot_id = s.id and c.date = d) loop
      r := cancel_class_date(sl.id, d, p_reason);
      v_classes := v_classes + 1;
      v_bookings := v_bookings + coalesce((r->>'cancelled')::int, 0);
    end loop;
  end loop;
  return json_build_object('ok', true, 'classes', v_classes, 'bookings', v_bookings);
end $$;

-- Copy the classes of one week (Monday p_week) to a date range. Classes already there (same day, time and arena) are skipped.
create or replace function copy_week(p_week date, p_from date, p_to date) returns json
language plpgsql security definer set search_path = public as $$
declare d date; sl slots; n slots; v_created int := 0; v_skipped int := 0;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_week is null or p_from is null or p_to is null or p_to < p_from then return json_build_object('ok', false, 'code', 'missing'); end if;
  for d in select g::date from generate_series(p_week, p_week + 6, interval '1 day') g loop
    for sl in select s.* from slots s where s.active and slot_runs(s, d)
                and not exists (select 1 from slot_cancellations c where c.slot_id = s.id and c.date = d and c.replaced_by is not null)
              order by s.time loop
      if exists (select 1 from slots x where x.active and x.weekday = sl.weekday and x.time = sl.time and x.arena = sl.arena
                   and coalesce(x.starts_on, '-infinity'::date) <= p_to and coalesce(x.ends_on, 'infinity'::date) >= p_from) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      n := sl;
      n.id := gen_random_uuid(); n.starts_on := p_from; n.ends_on := p_to; n.series_id := null;
      insert into slots select n.*;
      v_created := v_created + 1;
    end loop;
  end loop;
  return json_build_object('ok', true, 'created', v_created, 'skipped', v_skipped);
end $$;

-- Close the club for some dates: classes already booked in them are cancelled first (families get the class back).
create or replace function add_closed_dates(p_from date, p_to date, p_note text default null) returns json
language plpgsql security definer set search_path = public as $$
declare r json := json_build_object('classes', 0, 'bookings', 0); v_id uuid;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then return json_build_object('ok', false, 'code', 'missing'); end if;
  if p_to >= club_now()::date then
    r := cancel_class_range(greatest(p_from, club_now()::date), p_to, nullif(trim(coalesce(p_note, '')), ''));
  end if;
  insert into closed_dates (starts_on, ends_on, note) values (p_from, p_to, nullif(trim(coalesce(p_note, '')), '')) returning id into v_id;
  return json_build_object('ok', true, 'id', v_id, 'classes', coalesce((r->>'classes')::int, 0), 'bookings', coalesce((r->>'bookings')::int, 0));
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
revoke execute on function apply_plan_payment(payments) from authenticated;
revoke execute on function release_booking(bookings) from authenticated;
revoke execute on function pick_horse(uuid, date, text) from authenticated;
revoke execute on function open_period(riders, date) from authenticated;
revoke execute on function plan_at(uuid, date) from authenticated;
revoke execute on function plans_fill_period() from authenticated;
revoke execute on function slot_with(slots, jsonb) from authenticated;
