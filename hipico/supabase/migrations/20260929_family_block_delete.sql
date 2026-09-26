-- Open sign-up with instant access; management can block, unblock or delete a family
-- (soft delete: access removed, history kept), and assign an existing plan with its start date.

alter table families add column if not exists deleted_at timestamptz;

-- Only families that are neither blocked nor deleted can use the app.
create or replace function my_family_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from families
  where email = jwt_email() and jwt_email() <> '' and active and deleted_at is null
  limit 1
$$;

create or replace function whoami() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'email', jwt_email(),
    'is_admin', is_admin(),
    'family_id', my_family_id(),
    'family_inactive', exists (select 1 from families where email = jwt_email() and jwt_email() <> '' and not active and deleted_at is null),
    'family_deleted', exists (select 1 from families where email = jwt_email() and jwt_email() <> '' and deleted_at is not null)
  )
$$;

-- Assign a rider's plan (the club already collected it: no payment is created).
-- The plan is active from the month of p_start, or from this month if p_start is earlier.
drop function if exists admin_set_plan(uuid, integer);
create or replace function admin_set_plan(p_rider uuid, p_classes int, p_start date default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_plan plans;
  v_start date := coalesce(p_start, club_now()::date);
  v_month text := greatest(to_char(coalesce(p_start, club_now()::date), 'YYYY-MM'), to_char(club_now(), 'YYYY-MM'));
begin
  if not is_admin() or not exists (select 1 from riders where id = p_rider) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_classes is not null and price_of('plan_' || p_classes) is null then return json_build_object('ok', false, 'code', 'badPlan'); end if;
  select * into v_plan from plans where rider_id = p_rider and month = v_month for update;
  if p_classes is not null and v_plan.id is not null and p_classes < v_plan.used then
    return json_build_object('ok', false, 'code', 'belowUsed');
  end if;
  update riders set plan_classes = p_classes,
    plan_start = case when p_classes is null then null when p_start is not null then p_start else coalesce(plan_start, v_start) end
  where id = p_rider;
  if p_classes is not null then
    if v_plan.id is not null then update plans set total = p_classes, paid = true where id = v_plan.id;
    else insert into plans (rider_id, month, total, paid) values (p_rider, v_month, p_classes, true);
    end if;
  end if;
  return json_build_object('ok', true);
end $$;

-- The list import was replaced by open sign-up.
drop function if exists admin_import_families(jsonb);

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
