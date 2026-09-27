-- Change plan: an upgrade applies now (the family pays only the difference for this month, and the extra
-- classes are added once that payment is approved); a downgrade starts at the next renewal.
-- Choosing a plan now keeps it as the rider's standing plan, so it renews every month.

create table if not exists plan_changes (
  id              uuid primary key default gen_random_uuid(),
  rider_id        uuid not null references riders (id) on delete cascade,
  family_id       uuid not null references families (id) on delete cascade,
  from_classes    integer,
  to_classes      integer not null,
  kind            text not null check (kind in ('new', 'upgrade', 'downgrade')),
  effective_month text not null check (effective_month ~ '^[0-9]{4}-[0-9]{2}$'),
  payment_id      uuid references payments (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists plan_changes_by_family on plan_changes (family_id, created_at desc);

-- Families read their own history; management reads everything. Rows are written only by the functions below.
alter table plan_changes enable row level security;
drop policy if exists family_read on plan_changes;
create policy family_read on plan_changes for select to authenticated using (family_id = my_family_id() or is_admin());
grant select on plan_changes to authenticated;

-- A plan chosen by the family becomes the standing plan (renews monthly).
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
  update riders set plan_classes = p_classes, plan_start = coalesce(plan_start, to_date(p_month || '-01', 'YYYY-MM-DD')) where id = p_rider;
  insert into plan_changes (rider_id, family_id, from_classes, to_classes, kind, effective_month, payment_id)
  values (p_rider, v_rider.family_id, v_plan.total, p_classes, 'new', p_month, v_pay);
  return json_build_object('ok', true, 'payment_id', v_pay);
end $$;

-- Change the plan of a rider who already has one this month.
create or replace function change_plan(p_rider uuid, p_classes int) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rider riders; v_plan plans; v_next_plan plans; v_pay payments; v_pay_id uuid;
  v_new int; v_old int; v_this text; v_next text;
begin
  if not (is_admin() or owns_rider(p_rider)) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_rider from riders where id = p_rider and active;
  v_new := price_of('plan_' || p_classes);
  if v_rider.id is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if v_new is null then return json_build_object('ok', false, 'code', 'badPlan'); end if;
  v_this := to_char(club_now(), 'YYYY-MM');
  v_next := to_char(club_now() + interval '1 month', 'YYYY-MM');
  select * into v_plan from plans where rider_id = p_rider and month = v_this for update;
  if v_plan.id is null then return json_build_object('ok', false, 'code', 'noPlan'); end if;
  if p_classes = v_plan.total and coalesce(v_rider.plan_classes, v_plan.total) = p_classes then
    return json_build_object('ok', false, 'code', 'samePlan');
  end if;

  if p_classes > v_plan.total then
    -- Upgrade, effective now.
    if exists (select 1 from payments where service = 'plan' and status = 'pending' and meta ->> 'kind' = 'upgrade'
               and meta ->> 'riderId' = p_rider::text and meta ->> 'month' = v_this) then
      return json_build_object('ok', false, 'code', 'pendingExists');
    end if;
    if not v_plan.paid then
      -- Nothing paid yet this month: the pending charge simply becomes the new plan.
      select * into v_pay from payments where service = 'plan' and status = 'pending'
        and meta ->> 'riderId' = p_rider::text and meta ->> 'month' = v_this for update;
      if v_pay.receipt_status = 'review' then return json_build_object('ok', false, 'code', 'pendingExists'); end if;
      update plans set total = p_classes where id = v_plan.id;
      if v_pay.id is not null then
        update payments set amount = v_new, meta = meta || jsonb_build_object('classes', p_classes) where id = v_pay.id;
        v_pay_id := v_pay.id;
      else
        insert into payments (family_id, service, amount, meta)
        values (v_rider.family_id, 'plan', v_new, json_build_object('riderId', p_rider, 'month', v_this, 'classes', p_classes)::jsonb)
        returning id into v_pay_id;
      end if;
    else
      v_old := coalesce(price_of('plan_' || v_plan.total), 0);
      insert into payments (family_id, service, amount, meta)
      values (v_rider.family_id, 'plan', greatest(v_new - v_old, 0),
              json_build_object('riderId', p_rider, 'month', v_this, 'classes', p_classes, 'fromClasses', v_plan.total, 'kind', 'upgrade')::jsonb)
      returning id into v_pay_id;
    end if;
    update riders set plan_classes = p_classes, plan_start = coalesce(plan_start, to_date(v_this || '-01', 'YYYY-MM-DD')) where id = p_rider;
    insert into plan_changes (rider_id, family_id, from_classes, to_classes, kind, effective_month, payment_id)
    values (p_rider, v_rider.family_id, v_plan.total, p_classes, 'upgrade', v_this, v_pay_id);
    return json_build_object('ok', true, 'kind', 'upgrade', 'payment_id', v_pay_id, 'effective', v_this);
  end if;

  -- Downgrade (or going back to the current size): from the next renewal.
  update riders set plan_classes = p_classes, plan_start = coalesce(plan_start, to_date(v_this || '-01', 'YYYY-MM-DD')) where id = p_rider;
  select * into v_next_plan from plans where rider_id = p_rider and month = v_next for update;
  if v_next_plan.id is not null and not v_next_plan.paid and v_next_plan.used <= p_classes then
    update plans set total = p_classes where id = v_next_plan.id;
    update payments set amount = v_new, meta = meta || jsonb_build_object('classes', p_classes)
    where service = 'plan' and status = 'pending' and coalesce(receipt_status, '') <> 'review'
      and meta ->> 'riderId' = p_rider::text and meta ->> 'month' = v_next;
  end if;
  insert into plan_changes (rider_id, family_id, from_classes, to_classes, kind, effective_month)
  values (p_rider, v_rider.family_id, v_plan.total, p_classes, 'downgrade', v_next);
  return json_build_object('ok', true, 'kind', 'downgrade', 'effective', v_next);
end $$;

-- When a plan payment is approved: a regular one marks the month paid; an upgrade difference adds the classes.
create or replace function apply_plan_payment(v_p payments) returns void
language plpgsql security definer set search_path = public as $$
begin
  if v_p.service <> 'plan' then return; end if;
  if v_p.meta ->> 'kind' = 'upgrade' then
    update plans set total = greatest(total, (v_p.meta ->> 'classes')::int)
    where rider_id = (v_p.meta ->> 'riderId')::uuid and month = v_p.meta ->> 'month';
  else
    update plans set paid = true where rider_id = (v_p.meta ->> 'riderId')::uuid and month = v_p.meta ->> 'month';
  end if;
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
    update payments set status = 'paid', method = 'transfer', paid_at = now(),
      receipt_status = 'approved', receipt_note = null, reviewed_at = now()
    where id = p_payment;
    perform apply_plan_payment(v_p);
  else
    if coalesce(trim(p_note), '') = '' then return json_build_object('ok', false, 'code', 'noteRequired'); end if;
    update payments set receipt_status = 'rejected', receipt_note = left(trim(p_note), 280), reviewed_at = now()
    where id = p_payment;
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
  update payments set status = 'paid', method = p_method, paid_at = now(),
    receipt_status = case when receipt_status is null then null else 'approved' end, reviewed_at = now()
  where id = p_payment;
  perform apply_plan_payment(v_p);
  return json_build_object('ok', true);
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
revoke execute on function apply_plan_payment(payments) from authenticated;
