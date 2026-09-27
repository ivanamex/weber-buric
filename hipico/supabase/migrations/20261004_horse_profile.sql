-- Horse profile: basics on the horse; food and health in their own tables, so a family can read
-- only its own boarded horse's care (the horse list itself stays readable by everyone signed in).

alter table horses add column if not exists birth_year integer check (birth_year is null or birth_year between 1980 and 2100);
alter table horses add column if not exists sex text;
alter table horses drop constraint if exists horses_sex_check;
alter table horses add constraint horses_sex_check check (sex is null or sex in ('mare', 'gelding', 'stallion'));
alter table horses add column if not exists coat text;
alter table horses add column if not exists height_cm integer check (height_cm is null or height_cm between 60 and 220);

-- Food: feed lines ({ "type": "Alfalfa", "kg": 3 }), rations per day, supplements, notes for the groom.
create table if not exists horse_care (
  horse_id        uuid primary key references horses (id) on delete cascade,
  feed            jsonb not null default '[]'::jsonb,
  rations_per_day integer check (rations_per_day is null or rations_per_day between 1 and 8),
  supplements     text,
  notes           text,
  updated_at      timestamptz not null default now()
);

-- Health: vet visits, vaccines, deworming and farrier, each with an optional next due date.
create table if not exists horse_health (
  id         uuid primary key default gen_random_uuid(),
  horse_id   uuid not null references horses (id) on delete cascade,
  kind       text not null check (kind in ('vet', 'vaccine', 'deworming', 'farrier')),
  done_on    date not null default (club_now()::date),
  note       text,
  next_due   date,
  created_at timestamptz not null default now()
);
create index if not exists horse_health_by_horse on horse_health (horse_id, kind, done_on desc);

-- Management: everything. A family: read-only, its own boarded horses.
create or replace function owns_horse(p_horse uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from horses where id = p_horse and owner_family_id = my_family_id())
$$;

alter table horse_care enable row level security;
alter table horse_health enable row level security;
drop policy if exists admin_all on horse_care;
create policy admin_all on horse_care for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists owner_read on horse_care;
create policy owner_read on horse_care for select to authenticated using (owns_horse(horse_id));
drop policy if exists admin_all on horse_health;
create policy admin_all on horse_health for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists owner_read on horse_health;
create policy owner_read on horse_health for select to authenticated using (owns_horse(horse_id));
grant select, insert, update, delete on horse_care, horse_health to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
revoke execute on function apply_plan_payment(payments) from authenticated;
revoke execute on function release_booking(bookings) from authenticated;
revoke execute on function pick_horse(uuid, date, text) from authenticated;
revoke execute on function open_period(riders, date) from authenticated;
revoke execute on function plan_at(uuid, date) from authenticated;
revoke execute on function plans_fill_period() from authenticated;
