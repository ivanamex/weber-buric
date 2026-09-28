-- Por cobrar: every charge has a due date; the next plan period and the month's pensión become charges
-- 5 days before they fall due (or right away if they're already due); a daily job reminds families 5 days before, on the day, 3 days after
-- and then weekly until it's paid.

alter table payments add column if not exists due_on date;
create index if not exists payments_by_due on payments (due_on) where status = 'pending';

alter table club_settings add column if not exists reminders_on boolean not null default true;
alter table club_settings add column if not exists boarding_due_day integer not null default 1;
alter table club_settings drop constraint if exists club_settings_boarding_due_day_check;
alter table club_settings add constraint club_settings_boarding_due_day_check check (boarding_due_day between 1 and 28);
alter table club_settings add column if not exists reminder_note text;
alter table club_settings add column if not exists reminders_last_run timestamptz;
alter table club_settings add column if not exists reminders_email boolean; -- did the last run have an email sender?

-- When a charge falls due: a plan on the day its period starts, pensión on the club's day of the month,
-- a class or a ride on its day, an event on its first day; anything else on the day it was created.
create or replace function payment_due(p payments) returns date
language sql stable security definer set search_path = public as $$
  select coalesce(
    case
      when p.service = 'plan' and coalesce(p.meta ->> 'kind', '') <> 'upgrade' then coalesce(
        (p.meta ->> 'start')::date,
        (select pl.starts_on from plans pl where pl.rider_id = (p.meta ->> 'riderId')::uuid and pl.month = p.meta ->> 'month' limit 1),
        case when p.meta ->> 'month' ~ '^[0-9]{4}-[0-9]{2}$' then ((p.meta ->> 'month') || '-01')::date end)
      when p.service = 'boarding' and p.meta ->> 'month' ~ '^[0-9]{4}-[0-9]{2}$' then
        make_date(split_part(p.meta ->> 'month', '-', 1)::int, split_part(p.meta ->> 'month', '-', 2)::int,
                  coalesce((select boarding_due_day from club_settings where id = 1), 1))
      when p.service = 'class' then (p.meta ->> 'date')::date
      when p.service = 'rental' then (select r.date from rentals r where r.id = (p.meta ->> 'rentalId')::uuid)
      when p.service in ('camp', 'events') then (select e.start_date from events e where e.id = (p.meta ->> 'eventId')::uuid)
    end,
    (coalesce(p.created_at, now()) at time zone 'America/Cancun')::date)
$$;

create or replace function payments_fill_due() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.due_on is null then new.due_on := payment_due(new); end if;
  return new;
end $$;
drop trigger if exists payments_fill_due on payments;
create trigger payments_fill_due before insert on payments for each row execute function payments_fill_due();
update payments p set due_on = payment_due(p) where p.due_on is null;

-- Reminders sent (one row per reminder; the email status is filled in by the daily job).
create table if not exists payment_reminders (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid not null references payments (id) on delete cascade,
  kind         text not null check (kind in ('before', 'due', 'after', 'weekly')),
  sent_on      date not null,
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed', 'no_email', 'no_address')),
  created_at   timestamptz not null default now(),
  unique (payment_id, kind, sent_on)
);
alter table payment_reminders enable row level security;
drop policy if exists admin_all on payment_reminders;
create policy admin_all on payment_reminders for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists family_read on payment_reminders;
create policy family_read on payment_reminders for select to authenticated
  using (exists (select 1 from payments p where p.id = payment_id and p.family_id = my_family_id()));
grant select on payment_reminders to authenticated;

-- Charges that should exist by now or within 5 days: the next period of a standing plan that continues
-- (the previous one ended just before), and each month's pensión from its day of the month.
create or replace function materialize_due_charges(p_today date default club_now()::date) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_until date := p_today + 5; v_n int := 0; r riders; v_plan plans; h record; v_month text; v_due date; v_day int; d date;
begin
  for r in select rd.* from riders rd join families f on f.id = rd.family_id
           where rd.active and rd.plan_classes is not null and f.active and f.deleted_at is null
             and price_of('plan_' || rd.plan_classes) is not null loop
    foreach d in array array[p_today, v_until] loop
      if (plan_at(r.id, d)).id is null
         and exists (select 1 from plans pl where pl.rider_id = r.id and pl.ends_on between d - 32 and d - 1) then
        v_plan := open_period(r, d);
        if v_plan.id is not null then v_n := v_n + 1; end if;
      end if;
    end loop;
  end loop;

  select coalesce(boarding_due_day, 1) into v_day from club_settings where id = 1;
  v_day := coalesce(v_day, 1);
  if price_of('boarding_monthly') is not null then
    for v_month in select distinct to_char(x, 'YYYY-MM') from unnest(array[p_today, v_until]) x loop
      v_due := make_date(split_part(v_month, '-', 1)::int, split_part(v_month, '-', 2)::int, v_day);
      continue when v_due > v_until;
      for h in select hs.id, hs.owner_family_id from horses hs join families f on f.id = hs.owner_family_id
               where hs.type = 'boarded' and coalesce(hs.status, 'boarded') = 'boarded' and f.active and f.deleted_at is null loop
        if not exists (select 1 from payments where service = 'boarding' and meta ->> 'horseId' = h.id::text and meta ->> 'month' = v_month) then
          insert into payments (family_id, service, amount, meta)
          values (h.owner_family_id, 'boarding', price_of('boarding_monthly'), json_build_object('horseId', h.id, 'month', v_month)::jsonb);
          v_n := v_n + 1;
        end if;
      end loop;
    end loop;
  end if;
  return v_n;
end $$;

-- The reminders to send today (logged as they're chosen, so each goes out once): 5 days before, on the day,
-- 3 days after, then weekly. Not while a transfer receipt waits for review, nor on the day a family books a class, a ride or an upgrade.
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
      'month', p.meta ->> 'month', 'classKind', p.meta ->> 'kind');
  end loop;
end $$;

create or replace function reminder_mark(p_id uuid, p_status text) returns void
language sql security definer set search_path = public as $$
  update payment_reminders set email_status = p_status where id = p_id
    and p_status in ('sent', 'failed', 'no_email', 'no_address')
$$;

create or replace function reminders_finish(p_email boolean) returns void
language sql security definer set search_path = public as $$
  update club_settings set reminders_last_run = now(), reminders_email = p_email where id = 1
$$;

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
revoke execute on function payment_due(payments) from authenticated;
revoke execute on function payments_fill_due() from authenticated;
revoke execute on function materialize_due_charges(date) from authenticated;
revoke execute on function reminders_due(date) from authenticated;
revoke execute on function reminder_mark(uuid, text) from authenticated;
revoke execute on function reminders_finish(boolean) from authenticated;
