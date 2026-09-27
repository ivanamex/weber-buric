-- The owner's panel: plans billed date to date, payroll, expenses, horse status and sales, modules on/off.

-- ───────── 1. Plans run date to date (15 Sep → 14 Oct), counted from the rider's start date ─────────
alter table plans add column if not exists starts_on date;
alter table plans add column if not exists ends_on date;

-- Period k of an anchor: anchor + k months (end-of-month days clamp, always counted from the anchor).
create or replace function period_start(p_anchor date, p_k int) returns date
language sql immutable as $$ select (p_anchor + make_interval(months => p_k))::date $$;

-- The period that contains p_date (or the first one, when p_date is before the anchor).
create or replace function period_of(p_anchor date, p_date date, out starts_on date, out ends_on date)
language plpgsql immutable as $$
declare k int;
begin
  k := (extract(year from p_date)::int - extract(year from p_anchor)::int) * 12
       + extract(month from p_date)::int - extract(month from p_anchor)::int;
  if period_start(p_anchor, k) > p_date then k := k - 1; end if;
  if k < 0 then k := 0; end if;
  starts_on := period_start(p_anchor, k);
  ends_on := period_start(p_anchor, k + 1) - 1;
end $$;

-- Existing monthly plans become the rider's period that starts in that month.
update plans p set starts_on = (s.per).starts_on, ends_on = (s.per).ends_on
from (
  select p2.id, period_of(
    case when r.plan_start is not null and r.plan_start <= (to_date(p2.month || '-01', 'YYYY-MM-DD') + interval '1 month')::date - 1
         then r.plan_start else to_date(p2.month || '-01', 'YYYY-MM-DD') end,
    (to_date(p2.month || '-01', 'YYYY-MM-DD') + interval '1 month')::date - 1
  ) as per
  from plans p2 join riders r on r.id = p2.rider_id
  where p2.starts_on is null
) s
where s.id = p.id;
update plans set starts_on = to_date(month || '-01', 'YYYY-MM-DD') where starts_on is null;
update plans set ends_on = (starts_on + interval '1 month')::date - 1 where ends_on is null;
-- Any insert that only gives the month (older functions) gets the rider's period that starts in that month.
create or replace function plans_fill_period() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_anchor date; v_month_start date; v_per record;
begin
  if new.starts_on is null then
    v_month_start := to_date(new.month || '-01', 'YYYY-MM-DD');
    select plan_start into v_anchor from riders where id = new.rider_id;
    if v_anchor is null or v_anchor > (v_month_start + interval '1 month')::date - 1 then v_anchor := v_month_start; end if;
    select * into v_per from period_of(v_anchor, (v_month_start + interval '1 month')::date - 1);
    new.starts_on := v_per.starts_on;
    new.ends_on := coalesce(new.ends_on, v_per.ends_on);
  end if;
  if new.ends_on is null then new.ends_on := (new.starts_on + interval '1 month')::date - 1; end if;
  return new;
end $$;
drop trigger if exists plans_fill_period on plans;
create trigger plans_fill_period before insert on plans for each row execute function plans_fill_period();
alter table plans alter column starts_on set not null;
alter table plans alter column ends_on set not null;
create index if not exists plans_by_period on plans (rider_id, starts_on, ends_on);

-- The rider's plan that covers a date.
create or replace function plan_at(p_rider uuid, p_date date) returns plans
language sql stable security definer set search_path = public as $$
  select * from plans where rider_id = p_rider and p_date between starts_on and ends_on order by starts_on desc limit 1
$$;

-- Create the period of a standing plan that covers p_date (unpaid, with its pending payment).
create or replace function open_period(v_rider riders, p_date date) returns plans
language plpgsql security definer set search_path = public as $$
declare v_per record; v_plan plans;
begin
  select * into v_per from period_of(coalesce(v_rider.plan_start, date_trunc('month', p_date)::date), p_date);
  insert into plans (rider_id, month, total, paid, starts_on, ends_on)
  values (v_rider.id, to_char(v_per.starts_on, 'YYYY-MM'), v_rider.plan_classes, false, v_per.starts_on, v_per.ends_on)
  on conflict (rider_id, month) do nothing
  returning * into v_plan;
  if v_plan.id is not null then
    insert into payments (family_id, service, amount, meta)
    values (v_rider.family_id, 'plan', price_of('plan_' || v_rider.plan_classes),
            json_build_object('riderId', v_rider.id, 'month', v_plan.month, 'start', v_plan.starts_on, 'classes', v_rider.plan_classes)::jsonb);
  end if;
  return v_plan;
end $$;

create or replace function book_class(p_rider uuid, p_slot uuid, p_date date) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rider riders; v_slot slots; v_plan plans; v_taken int; v_horse uuid; v_id uuid;
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

create or replace function release_booking(v_b bookings) returns void
language plpgsql security definer set search_path = public as $$
begin
  if v_b.kind = 'plan' then
    update plans set used = greatest(used - 1, 0) where rider_id = v_b.rider_id and v_b.date between starts_on and ends_on;
  elsif v_b.payment_id is not null then
    delete from payments where id = v_b.payment_id and status = 'pending' and coalesce(receipt_status, '') <> 'review';
  end if;
end $$;

-- Choosing a plan with none running today starts it today; with a start date already set, it takes the current period.
create or replace function choose_plan(p_rider uuid, p_classes int, p_month text default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_rider riders; v_plan plans; v_price int; v_today date := club_now()::date; v_per record; v_pay uuid; v_from int;
begin
  if not (is_admin() or owns_rider(p_rider)) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_rider from riders where id = p_rider;
  v_price := price_of('plan_' || p_classes);
  if v_rider.id is null or v_price is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  v_plan := plan_at(p_rider, v_today);
  if v_plan.id is not null then
    if exists (select 1 from payments where service = 'plan' and status = 'pending'
               and meta ->> 'riderId' = p_rider::text and meta ->> 'month' = v_plan.month) then
      return json_build_object('ok', false, 'code', 'pendingExists');
    end if;
    if v_plan.total = p_classes then return json_build_object('ok', false, 'code', 'samePlan'); end if;
    if p_classes < v_plan.used then return json_build_object('ok', false, 'code', 'belowUsed'); end if;
    v_from := v_plan.total;
    update plans set total = p_classes, paid = false where id = v_plan.id returning * into v_plan;
  else
    -- Nothing running today: the plan starts today and renews on this day each month.
    update riders set plan_start = v_today where id = p_rider;
    select * into v_per from period_of(v_today, v_today);
    delete from plans where rider_id = p_rider and month = to_char(v_per.starts_on, 'YYYY-MM') and used = 0 and not paid;
    insert into plans (rider_id, month, total, starts_on, ends_on)
    values (p_rider, to_char(v_per.starts_on, 'YYYY-MM'), p_classes, v_per.starts_on, v_per.ends_on)
    returning * into v_plan;
  end if;
  insert into payments (family_id, service, amount, meta)
  values (v_rider.family_id, 'plan', v_price,
          json_build_object('riderId', p_rider, 'month', v_plan.month, 'start', v_plan.starts_on, 'classes', p_classes)::jsonb)
  returning id into v_pay;
  update riders set plan_classes = p_classes, plan_start = coalesce(plan_start, v_plan.starts_on) where id = p_rider;
  insert into plan_changes (rider_id, family_id, from_classes, to_classes, kind, effective_month, payment_id)
  values (p_rider, v_rider.family_id, v_from, p_classes, 'new', v_plan.month, v_pay);
  return json_build_object('ok', true, 'payment_id', v_pay);
end $$;

alter table plan_changes add column if not exists effective_on date;

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

  -- Downgrade: from the next renewal date.
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

-- Management assigns a plan the club already collected: the period starts on p_start (or keeps the rider's date).
create or replace function admin_set_plan(p_rider uuid, p_classes int, p_start date default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rider riders; v_plan plans; v_today date := club_now()::date; v_anchor date; v_per record;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_rider from riders where id = p_rider;
  if v_rider.id is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_classes is not null and price_of('plan_' || p_classes) is null then return json_build_object('ok', false, 'code', 'badPlan'); end if;
  if p_classes is null then
    update riders set plan_classes = null, plan_start = null where id = p_rider;
    return json_build_object('ok', true);
  end if;
  v_anchor := coalesce(p_start, v_rider.plan_start, v_today);
  select * into v_per from period_of(v_anchor, greatest(v_anchor, v_today));
  select * into v_plan from plans where rider_id = p_rider and month = to_char(v_per.starts_on, 'YYYY-MM') for update;
  if v_plan.id is not null and p_classes < v_plan.used then return json_build_object('ok', false, 'code', 'belowUsed'); end if;
  update riders set plan_classes = p_classes, plan_start = v_anchor where id = p_rider;
  if v_plan.id is not null then
    update plans set total = p_classes, paid = true, starts_on = v_per.starts_on, ends_on = v_per.ends_on where id = v_plan.id;
  else
    delete from plans where rider_id = p_rider and used = 0 and not paid and starts_on <= v_per.ends_on and ends_on >= v_per.starts_on;
    insert into plans (rider_id, month, total, paid, starts_on, ends_on)
    values (p_rider, to_char(v_per.starts_on, 'YYYY-MM'), p_classes, true, v_per.starts_on, v_per.ends_on);
  end if;
  return json_build_object('ok', true);
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
  if v_rider.id is null or v_slot.id is null or v_slot.weekday <> extract(dow from p_date)::int then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  v_price := price_of('class_' || p_kind);
  if v_price is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if class_start(p_date, v_slot.time) <= now() then return json_build_object('ok', false, 'code', 'past'); end if;
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

-- ───────── 2. Modules on/off (off in the live app until the owner decides) ─────────
alter table club_settings add column if not exists module_payroll boolean not null default false;
alter table club_settings add column if not exists module_profit boolean not null default false;
alter table club_settings add column if not exists module_sales boolean not null default false;

-- ───────── 3. Payroll (management only) ─────────
create table if not exists employees (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text not null default 'instructor',
  salary        integer not null check (salary >= 0),
  frequency     text not null default 'quincenal' check (frequency in ('quincenal', 'mensual')),
  next_pay_date date not null default (club_now()::date),
  working_days  text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create table if not exists salary_payments (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  paid_on     date not null,
  amount      integer not null check (amount >= 0),
  method      text not null check (method in ('cash', 'transfer', 'card')),
  period_date date,
  created_at  timestamptz not null default now()
);
alter table employees enable row level security;
alter table salary_payments enable row level security;
drop policy if exists admin_all on employees;
create policy admin_all on employees for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_all on salary_payments;
create policy admin_all on salary_payments for all to authenticated using (is_admin()) with check (is_admin());
grant select, insert, update, delete on employees, salary_payments to authenticated;

-- The next pay date after d: quincenal = the 15th and the last day of the month; mensual = same day next month.
create or replace function next_pay_after(p_date date, p_frequency text) returns date
language sql immutable as $$
  select case
    when p_frequency = 'mensual' then (p_date + interval '1 month')::date
    when extract(day from p_date) < 15 then date_trunc('month', p_date)::date + 14
    when p_date < (date_trunc('month', p_date) + interval '1 month')::date - 1 then (date_trunc('month', p_date) + interval '1 month')::date - 1
    else date_trunc('month', p_date + 1)::date + 14
  end
$$;

create or replace function pay_salary(p_employee uuid, p_amount int, p_method text, p_date date default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_e employees;
begin
  if not is_admin() or p_method not in ('cash', 'transfer', 'card') or p_amount is null or p_amount < 0 then
    return json_build_object('ok', false, 'code', 'missing');
  end if;
  select * into v_e from employees where id = p_employee for update;
  if v_e.id is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  insert into salary_payments (employee_id, paid_on, amount, method, period_date)
  values (p_employee, coalesce(p_date, club_now()::date), p_amount, p_method, v_e.next_pay_date);
  update employees set next_pay_date = next_pay_after(v_e.next_pay_date, v_e.frequency) where id = p_employee;
  return json_build_object('ok', true);
end $$;

-- ───────── 4. Expenses (management only), with editable categories ─────────
create table if not exists expense_categories (
  id     uuid primary key default gen_random_uuid(),
  name   text not null unique,
  active boolean not null default true
);
insert into expense_categories (name) values ('Alimento'), ('Veterinario'), ('Herrero'), ('Renta'), ('Servicios'), ('Otros')
on conflict (name) do nothing;
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  spent_on    date not null default (club_now()::date),
  category_id uuid references expense_categories (id) on delete set null,
  amount      integer not null check (amount >= 0),
  note        text,
  created_at  timestamptz not null default now()
);
alter table expense_categories enable row level security;
alter table expenses enable row level security;
drop policy if exists admin_all on expense_categories;
create policy admin_all on expense_categories for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_all on expenses;
create policy admin_all on expenses for all to authenticated using (is_admin()) with check (is_admin());
grant select, insert, update, delete on expense_categories, expenses to authenticated;

-- ───────── 5. Horses: status, sale details, photos, sales ─────────
alter table horses add column if not exists status text;
update horses set status = case when type = 'boarded' then 'boarded' when active then 'school' else 'retired' end where status is null;
alter table horses alter column status set default 'school';
alter table horses alter column status set not null;
alter table horses drop constraint if exists horses_status_check;
alter table horses add constraint horses_status_check check (status in ('school', 'boarded', 'for_sale', 'retired', 'sold'));
alter table horses add column if not exists sale_price integer check (sale_price is null or sale_price >= 0);
alter table horses add column if not exists age integer check (age is null or age between 0 and 45);
alter table horses add column if not exists breed text;
alter table horses add column if not exists level text;
alter table horses add column if not exists description text;
alter table horses add column if not exists photos text[] not null default '{}';

create table if not exists horse_sales (
  id       uuid primary key default gen_random_uuid(),
  horse_id uuid references horses (id) on delete set null,
  sold_on  date not null default (club_now()::date),
  price    integer not null check (price >= 0),
  buyer    text,
  created_at timestamptz not null default now()
);
alter table horse_sales enable row level security;
drop policy if exists admin_all on horse_sales;
create policy admin_all on horse_sales for all to authenticated using (is_admin()) with check (is_admin());
grant select, insert, update, delete on horse_sales to authenticated;

-- Record a sale: the horse leaves the club's lists and the income counts in Rentabilidad.
create or replace function sell_horse(p_horse uuid, p_price int, p_buyer text default null, p_date date default null) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() or p_price is null or p_price < 0 then return json_build_object('ok', false, 'code', 'missing'); end if;
  if not exists (select 1 from horses where id = p_horse) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  insert into horse_sales (horse_id, sold_on, price, buyer) values (p_horse, coalesce(p_date, club_now()::date), p_price, nullif(trim(coalesce(p_buyer, '')), ''));
  update horses set status = 'sold', active = false where id = p_horse;
  return json_build_object('ok', true);
end $$;

-- Photos of horses for sale: anyone can view them (the website will show them); only management uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('horse-photos', 'horse-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists horse_photos_read on storage.objects;
create policy horse_photos_read on storage.objects for select to anon, authenticated using (bucket_id = 'horse-photos');
drop policy if exists horse_photos_admin on storage.objects;
create policy horse_photos_admin on storage.objects for all to authenticated
using (bucket_id = 'horse-photos' and public.is_admin()) with check (bucket_id = 'horse-photos' and public.is_admin());

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
revoke execute on function apply_plan_payment(payments) from authenticated;
revoke execute on function release_booking(bookings) from authenticated;
revoke execute on function pick_horse(uuid, date, text) from authenticated;
revoke execute on function open_period(riders, date) from authenticated;
revoke execute on function plan_at(uuid, date) from authenticated;
revoke execute on function plans_fill_period() from authenticated;
