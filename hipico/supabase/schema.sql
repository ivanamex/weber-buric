-- Hípico Riviera Maya — Supabase schema (Phase 2).
-- Run once on a new Supabase project: SQL Editor → paste this whole file → Run.
-- Running it a second time stops at "already exists" and changes nothing.
--
-- Access model
--   • Management: any email listed in public.admins.
--   • Families: the email saved on public.families (the club adds families; parents log in with that email).
--   • Everyone else can sign in but sees nothing.
-- Booking/plan/payment rules live in the SECURITY DEFINER functions at the bottom, so they hold
-- no matter what the browser sends.

set check_function_bodies = off;

-- ───────────────────────── Tables ─────────────────────────

create table admins (
  email text primary key check (email = lower(email)),
  name  text
);

create table prices (
  key    text primary key,
  amount integer not null check (amount >= 0),
  label  text
);

create table instructors (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  specialty text
);

create table families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text not null,
  email      text not null unique check (email = lower(email)),
  phone      text,
  created_at timestamptz not null default now()
);

create table horses (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  type            text not null check (type in ('school', 'boarded')),
  owner_family_id uuid references families (id) on delete set null
);

create table riders (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  name       text not null,
  age        integer check (age between 2 and 99),
  level      text not null check (level in ('beginner', 'intermediate', 'advanced')),
  horse_id   uuid references horses (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Weekly template. weekday: 1 = Monday … 6 = Saturday (0 = Sunday).
create table slots (
  id            uuid primary key default gen_random_uuid(),
  weekday       integer not null check (weekday between 0 and 6),
  time          text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  duration      integer not null default 60,
  discipline    text not null check (discipline in ('basics', 'dressage', 'jumping', 'ponies')),
  level         text not null check (level in ('beginner', 'intermediate', 'advanced')),
  instructor_id uuid not null references instructors (id),
  arena         text not null check (arena in ('main', 'covered', 'jumping')),
  capacity      integer not null check (capacity > 0),
  active        boolean not null default true
);

create table plans (
  id       uuid primary key default gen_random_uuid(),
  rider_id uuid not null references riders (id) on delete cascade,
  month    text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  total    integer not null check (total > 0),
  used     integer not null default 0 check (used >= 0),
  paid     boolean not null default false,
  unique (rider_id, month)
);

create table bookings (
  id           uuid primary key default gen_random_uuid(),
  slot_id      uuid not null references slots (id),
  date         date not null,
  rider_id     uuid not null references riders (id) on delete cascade,
  horse_id     uuid references horses (id) on delete set null,
  status       text not null default 'booked' check (status in ('booked', 'cancelled', 'attended', 'noshow')),
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index bookings_one_per_rider on bookings (slot_id, date, rider_id) where status <> 'cancelled';
create index bookings_by_date on bookings (date);

create table payments (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  service    text not null check (service in ('plan', 'boarding', 'camp', 'rental', 'events')),
  amount     integer not null check (amount >= 0),
  status     text not null default 'pending' check (status in ('pending', 'paid')),
  method     text check (method in ('cash', 'transfer', 'card')),
  created_at timestamptz not null default now(),
  paid_at    timestamptz,
  meta       jsonb not null default '{}'::jsonb
);
create index payments_by_status on payments (status);

create table events (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'camp',
  start_date date not null,
  end_date   date not null,
  ages       text,
  capacity   integer not null default 20,
  price      integer not null,
  deposit    integer not null,
  active     boolean not null default true
);

create table camp_registrations (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events (id) on delete cascade,
  rider_id   uuid not null references riders (id) on delete cascade,
  payment_id uuid references payments (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, rider_id)
);

create table rentals (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  date       date not null,
  time       text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  hours      integer not null check (hours between 1 and 4),
  horse_id   uuid not null references horses (id),
  status     text not null default 'booked' check (status in ('booked', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── Identity helpers ─────────────────────────

create or replace function jwt_email() returns text
language sql stable set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = jwt_email() and jwt_email() <> '')
$$;

create or replace function my_family_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from families where email = jwt_email() and jwt_email() <> '' limit 1
$$;

create or replace function owns_rider(p_rider uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from riders where id = p_rider and family_id = my_family_id())
$$;

-- Club-local "now" (America/Cancun, UTC-5 all year).
create or replace function club_now() returns timestamp
language sql stable as $$ select (now() at time zone 'America/Cancun') $$;

create or replace function class_start(p_date date, p_time text) returns timestamptz
language sql immutable as $$ select ((p_date + p_time::time) at time zone 'America/Cancun') $$;

create or replace function price_of(p_key text) returns integer
language sql stable security definer set search_path = public as $$
  select amount from prices where key = p_key
$$;

-- ───────────────────────── Row Level Security ─────────────────────────

alter table admins             enable row level security;
alter table prices             enable row level security;
alter table instructors        enable row level security;
alter table families           enable row level security;
alter table horses             enable row level security;
alter table riders             enable row level security;
alter table slots              enable row level security;
alter table plans              enable row level security;
alter table bookings           enable row level security;
alter table payments           enable row level security;
alter table events             enable row level security;
alter table camp_registrations enable row level security;
alter table rentals            enable row level security;

-- Club catalogue: readable by any signed-in user, editable by management.
create policy read_all on prices      for select to authenticated using (true);
create policy read_all on instructors for select to authenticated using (true);
create policy read_all on horses      for select to authenticated using (true);
create policy read_all on slots       for select to authenticated using (true);
create policy read_all on events      for select to authenticated using (true);

create policy admin_all on admins             for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on prices             for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on instructors        for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on families           for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on horses             for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on riders             for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on slots              for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on plans              for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on bookings           for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on payments           for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on events             for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on camp_registrations for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on rentals            for all to authenticated using (is_admin()) with check (is_admin());

-- Families read only their own rows. They never write directly: all changes go through the functions below.
create policy own_family on families           for select to authenticated using (id = my_family_id());
create policy own_family on riders             for select to authenticated using (family_id = my_family_id());
create policy own_family on plans              for select to authenticated using (owns_rider(rider_id));
create policy own_family on bookings           for select to authenticated using (owns_rider(rider_id));
create policy own_family on payments           for select to authenticated using (family_id = my_family_id());
create policy own_family on camp_registrations for select to authenticated using (owns_rider(rider_id));
create policy own_family on rentals            for select to authenticated using (family_id = my_family_id());

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- ───────────────────────── App functions (RPC) ─────────────────────────
-- Every function returns json {ok: bool, code?: text, …}; codes match the app's error messages.

create or replace function whoami() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('email', jwt_email(), 'is_admin', is_admin(), 'family_id', my_family_id())
$$;

-- Taken seats per class for a date range (families can't see other families' bookings).
create or replace function slot_counts(p_from date, p_to date)
returns table (slot_id uuid, date date, taken integer)
language sql stable security definer set search_path = public as $$
  select b.slot_id, b.date, count(*)::int
  from bookings b
  where b.date between p_from and p_to and b.status <> 'cancelled'
    and (is_admin() or my_family_id() is not null)
  group by b.slot_id, b.date
$$;

create or replace function camp_counts()
returns table (event_id uuid, taken integer)
language sql stable security definer set search_path = public as $$
  select r.event_id, count(*)::int from camp_registrations r
  where is_admin() or my_family_id() is not null
  group by r.event_id
$$;

create or replace function book_class(p_rider uuid, p_slot uuid, p_date date) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rider riders; v_slot slots; v_plan plans; v_taken int; v_horse uuid; v_id uuid;
begin
  if not (is_admin() or owns_rider(p_rider)) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_rider from riders where id = p_rider;
  select * into v_slot from slots where id = p_slot and active;
  if v_rider.id is null or v_slot.id is null or v_slot.weekday <> extract(dow from p_date)::int then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  if class_start(p_date, v_slot.time) <= now() then return json_build_object('ok', false, 'code', 'past'); end if;

  -- Serialize bookings for this class so two families can't take the last seat at once.
  perform pg_advisory_xact_lock(hashtext(p_slot::text || p_date::text));

  if exists (select 1 from bookings where slot_id = p_slot and date = p_date and rider_id = p_rider and status <> 'cancelled') then
    return json_build_object('ok', false, 'code', 'already');
  end if;
  select count(*) into v_taken from bookings where slot_id = p_slot and date = p_date and status <> 'cancelled';
  if v_taken >= v_slot.capacity then return json_build_object('ok', false, 'code', 'full'); end if;
  if v_rider.level <> v_slot.level then return json_build_object('ok', false, 'code', 'level'); end if;

  select * into v_plan from plans where rider_id = p_rider and month = to_char(p_date, 'YYYY-MM') for update;
  if v_plan.id is null then return json_build_object('ok', false, 'code', 'noPlan'); end if;
  if v_plan.used >= v_plan.total then return json_build_object('ok', false, 'code', 'planEmpty'); end if;

  -- Horse: rider's own if free at that time, else first free school horse.
  perform pg_advisory_xact_lock(hashtext(p_date::text || v_slot.time));
  select h.id into v_horse from horses h
  where h.id = v_rider.horse_id
    and not exists (select 1 from bookings b join slots s on s.id = b.slot_id
                    where b.horse_id = h.id and b.date = p_date and s.time = v_slot.time and b.status <> 'cancelled');
  if v_horse is null then
    select h.id into v_horse from horses h
    where h.type = 'school'
      and not exists (select 1 from bookings b join slots s on s.id = b.slot_id
                      where b.horse_id = h.id and b.date = p_date and s.time = v_slot.time and b.status <> 'cancelled')
    order by h.name limit 1;
  end if;
  if v_horse is null then return json_build_object('ok', false, 'code', 'noHorse'); end if;

  update plans set used = used + 1 where id = v_plan.id;
  insert into bookings (slot_id, date, rider_id, horse_id) values (p_slot, p_date, p_rider, v_horse) returning id into v_id;
  return json_build_object('ok', true, 'booking_id', v_id, 'remaining', v_plan.total - v_plan.used - 1);
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
  update plans set used = greatest(used - 1, 0) where rider_id = v_b.rider_id and month = to_char(v_b.date, 'YYYY-MM');
  return json_build_object('ok', true);
end $$;

-- Management: "Vino" / "No vino". Both keep the class counted as used; tapping again clears it.
create or replace function mark_attendance(p_booking uuid, p_status text) returns json
language plpgsql security definer set search_path = public as $$
declare v_b bookings; v_new text;
begin
  if not is_admin() or p_status not in ('attended', 'noshow') then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_b from bookings where id = p_booking for update;
  if v_b.id is null or v_b.status = 'cancelled' then return json_build_object('ok', false, 'code', 'notFound'); end if;
  v_new := case when v_b.status = p_status then 'booked' else p_status end;
  update bookings set status = v_new where id = p_booking;
  return json_build_object('ok', true, 'status', v_new);
end $$;

create or replace function choose_plan(p_rider uuid, p_classes int, p_month text) returns json
language plpgsql security definer set search_path = public as $$
declare v_rider riders; v_plan plans; v_price int; v_this text; v_next text; v_pay uuid;
begin
  if not (is_admin() or owns_rider(p_rider)) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_rider from riders where id = p_rider;
  v_price := price_of('plan_' || p_classes);
  v_this := to_char(club_now(), 'YYYY-MM');
  v_next := to_char(club_now() + interval '1 month', 'YYYY-MM');
  if v_rider.id is null or v_price is null or p_month not in (v_this, v_next) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if exists (select 1 from payments where service = 'plan' and status = 'pending'
             and meta ->> 'riderId' = p_rider::text and meta ->> 'month' = p_month) then
    return json_build_object('ok', false, 'code', 'pendingExists');
  end if;
  select * into v_plan from plans where rider_id = p_rider and month = p_month for update;
  if v_plan.id is not null then
    if v_plan.total = p_classes then return json_build_object('ok', false, 'code', 'samePlan'); end if;
    if p_classes < v_plan.used then return json_build_object('ok', false, 'code', 'belowUsed'); end if;
    update plans set total = p_classes, paid = false where id = v_plan.id;
  else
    insert into plans (rider_id, month, total) values (p_rider, p_month, p_classes);
  end if;
  insert into payments (family_id, service, amount, meta)
  values (v_rider.family_id, 'plan', v_price, json_build_object('riderId', p_rider, 'month', p_month, 'classes', p_classes)::jsonb)
  returning id into v_pay;
  return json_build_object('ok', true, 'payment_id', v_pay);
end $$;

create or replace function request_boarding_payment(p_family uuid default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_family uuid; v_month text; v_created int := 0; v_all_paid boolean; h record;
begin
  v_family := case when is_admin() and p_family is not null then p_family else my_family_id() end;
  if v_family is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if not exists (select 1 from horses where type = 'boarded' and owner_family_id = v_family) then
    return json_build_object('ok', false, 'code', 'noHorse');
  end if;
  v_month := to_char(club_now(), 'YYYY-MM');
  for h in select id from horses where type = 'boarded' and owner_family_id = v_family loop
    if not exists (select 1 from payments where service = 'boarding' and meta ->> 'horseId' = h.id::text and meta ->> 'month' = v_month) then
      insert into payments (family_id, service, amount, meta)
      values (v_family, 'boarding', price_of('boarding_monthly'), json_build_object('horseId', h.id, 'month', v_month)::jsonb);
      v_created := v_created + 1;
    end if;
  end loop;
  if v_created = 0 then
    select bool_and(p.status = 'paid') into v_all_paid from payments p
    join horses h2 on p.meta ->> 'horseId' = h2.id::text
    where h2.owner_family_id = v_family and p.service = 'boarding' and p.meta ->> 'month' = v_month;
    return json_build_object('ok', false, 'code', case when v_all_paid then 'alreadyPaid' else 'pendingExists' end);
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function mark_paid(p_payment uuid, p_method text) returns json
language plpgsql security definer set search_path = public as $$
declare v_p payments;
begin
  if not is_admin() or p_method not in ('cash', 'transfer', 'card') then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_p from payments where id = p_payment for update;
  if v_p.id is null or v_p.status <> 'pending' then return json_build_object('ok', false, 'code', 'notFound'); end if;
  update payments set status = 'paid', method = p_method, paid_at = now() where id = p_payment;
  if v_p.service = 'plan' then
    update plans set paid = true where rider_id = (v_p.meta ->> 'riderId')::uuid and month = v_p.meta ->> 'month';
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function register_camp(p_event uuid, p_rider uuid) returns json
language plpgsql security definer set search_path = public as $$
declare v_ev events; v_rider riders; v_pay uuid;
begin
  if not (is_admin() or owns_rider(p_rider)) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_ev from events where id = p_event and active;
  select * into v_rider from riders where id = p_rider;
  if v_ev.id is null or v_rider.id is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  perform pg_advisory_xact_lock(hashtext(p_event::text));
  if exists (select 1 from camp_registrations where event_id = p_event and rider_id = p_rider) then
    return json_build_object('ok', false, 'code', 'already');
  end if;
  if (select count(*) from camp_registrations where event_id = p_event) >= v_ev.capacity then
    return json_build_object('ok', false, 'code', 'full');
  end if;
  insert into payments (family_id, service, amount, meta)
  values (v_rider.family_id, 'camp', v_ev.deposit, json_build_object('riderId', p_rider, 'eventId', p_event)::jsonb)
  returning id into v_pay;
  insert into camp_registrations (event_id, rider_id, payment_id) values (p_event, p_rider, v_pay);
  return json_build_object('ok', true, 'payment_id', v_pay);
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
  if not exists (select 1 from horses where id = p_horse and type = 'school') then return json_build_object('ok', false, 'code', 'notFound'); end if;
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

-- ───────────────────────── Club catalogue (edit freely in Table Editor) ─────────────────────────
-- *Precios de ejemplo — replace with the club's real prices.

insert into prices (key, amount, label) values
  ('plan_4', 2200, 'Plan 4 clases / mes'),
  ('plan_8', 3900, 'Plan 8 clases / mes'),
  ('plan_12', 5400, 'Plan 12 clases / mes'),
  ('boarding_monthly', 9500, 'Pensión completa / mes'),
  ('rental_per_hour', 850, 'Renta de caballo / hora'),
  ('from_birthday', 8500, 'Fiestas: desde'),
  ('from_coaching', 1200, 'Coaching: desde'),
  ('from_earlyStim', 450, 'Estimulación temprana: desde');

insert into instructors (name, specialty) values
  ('Mariana López', 'dressage'), ('Diego Ramírez', 'jumping'), ('Sofía Castillo', 'basics');

insert into horses (name, type) values
  ('Canela', 'school'), ('Lucero', 'school'), ('Tornado', 'school'), ('Brisa', 'school'), ('Cacao', 'school');

insert into slots (weekday, time, discipline, level, instructor_id, arena, capacity)
select v.weekday, v.time, v.discipline, v.level, i.id, v.arena, v.capacity
from (values
  (1, '16:00', 'basics',   'beginner',     'Sofía Castillo', 'covered', 3),
  (1, '17:00', 'dressage', 'intermediate', 'Mariana López',  'main',    4),
  (1, '18:00', 'jumping',  'advanced',     'Diego Ramírez',  'jumping', 3),
  (2, '16:00', 'basics',   'beginner',     'Sofía Castillo', 'covered', 3),
  (2, '17:00', 'jumping',  'intermediate', 'Diego Ramírez',  'jumping', 4),
  (2, '18:00', 'dressage', 'advanced',     'Mariana López',  'main',    3),
  (3, '16:00', 'basics',   'beginner',     'Sofía Castillo', 'covered', 3),
  (3, '17:00', 'dressage', 'intermediate', 'Mariana López',  'main',    4),
  (3, '18:00', 'jumping',  'advanced',     'Diego Ramírez',  'jumping', 3),
  (4, '16:00', 'basics',   'beginner',     'Sofía Castillo', 'covered', 3),
  (4, '17:00', 'jumping',  'intermediate', 'Diego Ramírez',  'jumping', 4),
  (4, '18:00', 'dressage', 'advanced',     'Mariana López',  'main',    3),
  (5, '16:00', 'basics',   'beginner',     'Sofía Castillo', 'covered', 3),
  (5, '17:00', 'dressage', 'intermediate', 'Mariana López',  'main',    4),
  (5, '18:00', 'jumping',  'advanced',     'Diego Ramírez',  'jumping', 3),
  (6, '09:00', 'ponies',   'beginner',     'Sofía Castillo', 'covered', 3),
  (6, '10:00', 'jumping',  'intermediate', 'Diego Ramírez',  'jumping', 4),
  (6, '10:00', 'basics',   'beginner',     'Sofía Castillo', 'main',    3),
  (6, '11:00', 'dressage', 'advanced',     'Mariana López',  'main',    3),
  (6, '12:00', 'jumping',  'advanced',     'Diego Ramírez',  'jumping', 3)
) as v (weekday, time, discipline, level, instructor, arena, capacity)
join instructors i on i.name = v.instructor;

insert into events (type, start_date, end_date, ages, capacity, price, deposit)
values ('camp', '2027-07-05', '2027-07-30', '6–15', 24, 12500, 3000);

-- ───────────────────────── First admin ─────────────────────────
-- Replace with the real management email(s) before running, or add rows later in Table Editor → admins.
insert into admins (email, name) values ('direccion@ejemplo.com', 'Dirección');
