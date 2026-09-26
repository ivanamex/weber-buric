-- Family accounts: management preloads families (with riders and a standing plan), edits and
-- deactivates them, imports a list in one go; new families can also sign themselves up.
-- Run once in the Hípico project (supabase-cerise-harbor) → SQL Editor. Safe to run again.

-- ───────── Columns ─────────
alter table families add column if not exists active boolean not null default true;
alter table families add column if not exists deactivated_at timestamptz;
alter table families add column if not exists self_signup boolean not null default false;

alter table riders add column if not exists active boolean not null default true;
-- Standing monthly package (4/8/12 classes) and the date it starts; renewed automatically each month.
alter table riders add column if not exists plan_classes integer check (plan_classes is null or plan_classes > 0);
alter table riders add column if not exists plan_start date;

-- ───────── Identity: only active families can use the app ─────────
create or replace function my_family_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from families where email = jwt_email() and jwt_email() <> '' and active limit 1
$$;

create or replace function whoami() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'email', jwt_email(),
    'is_admin', is_admin(),
    'family_id', my_family_id(),
    'family_inactive', exists (select 1 from families where email = jwt_email() and jwt_email() <> '' and not active)
  )
$$;

-- ───────── Create a family with riders and plan (internal) ─────────
-- p: {name, contact, email, phone, plan, start, riders: [{name, level, age, plan}]}
create or replace function create_family_record(p jsonb, p_preloaded boolean) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p ->> 'email', '')));
  v_contact text := trim(coalesce(p ->> 'contact', ''));
  v_name text := trim(coalesce(p ->> 'name', ''));
  v_start date;
  v_month text;
  v_family uuid; v_rider uuid; r jsonb; v_plan int; v_level text; v_count int := 0;
begin
  v_start := coalesce(nullif(p ->> 'start', '')::date, club_now()::date);
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_contact = '' then
    return json_build_object('ok', false, 'code', 'missing');
  end if;
  if exists (select 1 from families where email = v_email) then
    return json_build_object('ok', false, 'code', 'emailExists', 'family_id', (select id from families where email = v_email));
  end if;
  if jsonb_typeof(p -> 'riders') is distinct from 'array' or jsonb_array_length(p -> 'riders') = 0 then
    return json_build_object('ok', false, 'code', 'noRiders');
  end if;
  if v_name = '' then
    v_name := 'Familia ' || coalesce(nullif(split_part(v_contact, ' ', array_length(regexp_split_to_array(v_contact, '\s+'), 1)), ''), v_contact);
  end if;
  -- A plan that started in an earlier month is active from the current month.
  v_month := greatest(to_char(v_start, 'YYYY-MM'), to_char(club_now(), 'YYYY-MM'));

  insert into families (name, contact, email, phone, self_signup)
  values (v_name, v_contact, v_email, nullif(trim(coalesce(p ->> 'phone', '')), ''), not p_preloaded)
  returning id into v_family;

  for r in select * from jsonb_array_elements(p -> 'riders') loop
    v_level := r ->> 'level';
    if trim(coalesce(r ->> 'name', '')) = '' or v_level not in ('beginner', 'intermediate', 'advanced') then
      raise exception 'invalid rider' using errcode = 'P0001';
    end if;
    v_plan := case when p_preloaded then coalesce(nullif(r ->> 'plan', '')::int, nullif(p ->> 'plan', '')::int) end;
    if v_plan is not null and price_of('plan_' || v_plan) is null then
      raise exception 'invalid plan' using errcode = 'P0001';
    end if;
    insert into riders (family_id, name, age, level, plan_classes, plan_start)
    values (v_family, trim(r ->> 'name'), nullif(r ->> 'age', '')::int, v_level, v_plan, case when v_plan is not null then v_start end)
    returning id into v_rider;
    if v_plan is not null then
      -- Preloaded by management: the plan is active right away (the club handles its payment).
      insert into plans (rider_id, month, total, paid) values (v_rider, v_month, v_plan, true);
    end if;
    v_count := v_count + 1;
  end loop;
  return json_build_object('ok', true, 'family_id', v_family, 'riders', v_count);
exception when sqlstate 'P0001' or invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
  return json_build_object('ok', false, 'code', case when sqlerrm = 'invalid plan' then 'badPlan' else 'missing' end);
end $$;
revoke execute on function create_family_record(jsonb, boolean) from public, anon, authenticated;

-- ───────── Management ─────────
create or replace function admin_create_family(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  return create_family_record(p, true);
end $$;

-- p: array of family objects. Existing emails are skipped (never duplicated).
create or replace function admin_import_families(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare f jsonb; res json; v_created int := 0; v_skipped int := 0; v_failed int := 0;
begin
  if not is_admin() or jsonb_typeof(p) is distinct from 'array' then return json_build_object('ok', false, 'code', 'notFound'); end if;
  for f in select * from jsonb_array_elements(p) loop
    res := create_family_record(f, true);
    if (res ->> 'ok')::boolean then v_created := v_created + 1;
    elsif res ->> 'code' = 'emailExists' then v_skipped := v_skipped + 1;
    else v_failed := v_failed + 1;
    end if;
  end loop;
  return json_build_object('ok', true, 'created', v_created, 'skipped', v_skipped, 'failed', v_failed);
end $$;

-- Change a rider's standing plan (null = no plan) and this month's plan to match.
create or replace function admin_set_plan(p_rider uuid, p_classes int) returns json
language plpgsql security definer set search_path = public as $$
declare v_plan plans; v_month text := to_char(club_now(), 'YYYY-MM');
begin
  if not is_admin() or not exists (select 1 from riders where id = p_rider) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_classes is not null and price_of('plan_' || p_classes) is null then return json_build_object('ok', false, 'code', 'badPlan'); end if;
  select * into v_plan from plans where rider_id = p_rider and month = v_month for update;
  if p_classes is not null and v_plan.id is not null and p_classes < v_plan.used then
    return json_build_object('ok', false, 'code', 'belowUsed');
  end if;
  update riders set plan_classes = p_classes,
    plan_start = case when p_classes is null then null else coalesce(plan_start, club_now()::date) end
  where id = p_rider;
  if p_classes is not null then
    if v_plan.id is not null then update plans set total = p_classes where id = v_plan.id;
    else insert into plans (rider_id, month, total, paid) values (p_rider, v_month, p_classes, true);
    end if;
  end if;
  return json_build_object('ok', true);
end $$;

-- ───────── Self sign-up (new families) ─────────
-- Uses the signed-in email. If that email already belongs to a family, nothing is created.
create or replace function self_signup(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
begin
  if jwt_email() = '' or is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if exists (select 1 from families where email = jwt_email()) then
    return json_build_object('ok', true, 'linked', true);
  end if;
  return create_family_record(jsonb_set(p - 'plan' - 'start', '{email}', to_jsonb(jwt_email())), false);
end $$;

-- ───────── Booking: active riders only; standing plans renew on the first booking of a month ─────────
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

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
