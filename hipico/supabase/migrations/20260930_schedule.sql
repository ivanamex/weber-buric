-- Class calendar: management edits the weekly schedule, cancels single dates (rain, events),
-- manages instructors and horses, and marks a whole class as present in one tap.

alter table instructors add column if not exists active boolean not null default true;
alter table horses add column if not exists active boolean not null default true;
alter table bookings add column if not exists cancelled_by_club boolean not null default false;

-- One row per cancelled class date.
create table if not exists slot_cancellations (
  id         uuid primary key default gen_random_uuid(),
  slot_id    uuid not null references slots (id) on delete cascade,
  date       date not null,
  reason     text,
  created_at timestamptz not null default now(),
  unique (slot_id, date)
);
alter table slot_cancellations enable row level security;
drop policy if exists read_all on slot_cancellations;
create policy read_all on slot_cancellations for select to authenticated using (true);
drop policy if exists admin_all on slot_cancellations;
create policy admin_all on slot_cancellations for all to authenticated using (is_admin()) with check (is_admin());
grant select, insert, update, delete on slot_cancellations to authenticated;

-- Cancel one date of a class: every booked rider gets the class back in their plan.
create or replace function cancel_class_date(p_slot uuid, p_date date, p_reason text default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_slot slots; b record; v_count int := 0;
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
    update plans set used = greatest(used - 1, 0) where rider_id = b.rider_id and month = to_char(p_date, 'YYYY-MM');
    v_count := v_count + 1;
  end loop;
  return json_build_object('ok', true, 'cancelled', v_count);
end $$;

-- Reopen a cancelled date (families can book it again).
create or replace function reopen_class_date(p_slot uuid, p_date date) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  delete from slot_cancellations where slot_id = p_slot and date = p_date;
  return json_build_object('ok', true);
end $$;

-- "Todos vinieron": everyone booked in that class is marked present (the class stays used).
create or replace function mark_class_attended(p_slot uuid, p_date date) returns json
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  update bookings set status = 'attended' where slot_id = p_slot and date = p_date and status in ('booked', 'noshow');
  get diagnostics v_count = row_count;
  return json_build_object('ok', true, 'marked', v_count);
end $$;

-- Booking: cancelled dates are closed, and only active horses are assigned.
create or replace function book_class(p_rider uuid, p_slot uuid, p_date date) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rider riders; v_slot slots; v_plan plans; v_taken int; v_horse uuid; v_id uuid; v_month text;
begin
  if not (is_admin() or owns_rider(p_rider)) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_rider from riders where id = p_rider and active;
  select * into v_slot from slots where id = p_slot and active;
  if v_rider.id is null or v_slot.id is null or v_slot.weekday <> extract(dow from p_date)::int then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  if class_start(p_date, v_slot.time) <= now() then return json_build_object('ok', false, 'code', 'past'); end if;
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

  v_month := to_char(p_date, 'YYYY-MM');
  select * into v_plan from plans where rider_id = p_rider and month = v_month for update;
  if v_plan.id is null and v_rider.plan_classes is not null
     and (v_rider.plan_start is null or to_char(v_rider.plan_start, 'YYYY-MM') <= v_month)
     and price_of('plan_' || v_rider.plan_classes) is not null then
    insert into plans (rider_id, month, total, paid) values (p_rider, v_month, v_rider.plan_classes, false) returning * into v_plan;
    insert into payments (family_id, service, amount, meta)
    values (v_rider.family_id, 'plan', price_of('plan_' || v_rider.plan_classes),
            json_build_object('riderId', p_rider, 'month', v_month, 'classes', v_rider.plan_classes)::jsonb);
  end if;
  if v_plan.id is null then return json_build_object('ok', false, 'code', 'noPlan'); end if;
  if v_plan.used >= v_plan.total then return json_build_object('ok', false, 'code', 'planEmpty'); end if;

  perform pg_advisory_xact_lock(hashtext(p_date::text || v_slot.time));
  select h.id into v_horse from horses h
  where h.id = v_rider.horse_id and h.active
    and not exists (select 1 from bookings b join slots s on s.id = b.slot_id
                    where b.horse_id = h.id and b.date = p_date and s.time = v_slot.time and b.status <> 'cancelled');
  if v_horse is null then
    select h.id into v_horse from horses h
    where h.type = 'school' and h.active
      and not exists (select 1 from bookings b join slots s on s.id = b.slot_id
                      where b.horse_id = h.id and b.date = p_date and s.time = v_slot.time and b.status <> 'cancelled')
    order by h.name limit 1;
  end if;
  if v_horse is null then return json_build_object('ok', false, 'code', 'noHorse'); end if;

  update plans set used = used + 1 where id = v_plan.id;
  insert into bookings (slot_id, date, rider_id, horse_id) values (p_slot, p_date, p_rider, v_horse) returning id into v_id;
  return json_build_object('ok', true, 'booking_id', v_id, 'remaining', v_plan.total - v_plan.used - 1);
end $$;

-- Rentals: only active school horses.
create or replace function book_rental(p_date date, p_time text, p_hours int, p_horse uuid) returns json
language plpgsql security definer set search_path = public as $$
declare v_family uuid; v_start timestamptz; v_end timestamptz; v_id uuid;
begin
  v_family := my_family_id();
  if v_family is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_date is null or p_time is null or p_horse is null or p_hours not between 1 and 4 then
    return json_build_object('ok', false, 'code', 'missing');
  end if;
  if not exists (select 1 from horses where id = p_horse and type = 'school' and active) then return json_build_object('ok', false, 'code', 'notFound'); end if;
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

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
