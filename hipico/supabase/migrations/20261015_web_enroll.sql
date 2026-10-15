-- Choosing and paying on the website: a visitor picks a class option, gives the rider's and the parent's details and pays
-- by transfer (receipt reviewed in Cobros) or by card. The family, the rider, the plan and the charge are created
-- the same way management would; the family then enters the app with that email.

-- ───────── The club's bank details on the website (shown to anyone who chooses "transferencia") ─────────
create or replace function public_site() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'prices', coalesce((
      select jsonb_object_agg(key, amount) from prices
      where key like 'plan\_%' or key in ('class_trial', 'class_single', 'boarding_monthly')
    ), '{}'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'type', type, 'startDate', start_date, 'endDate', end_date, 'ages', ages, 'price', price
      ) order by start_date)
      from events where active and end_date >= club_now()::date
    ), '[]'::jsonb),
    'sales', case when coalesce((select module_sales from club_settings where id = 1), false) then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'level', level, 'breed', breed, 'sex', sex,
        'age', coalesce(age, extract(year from club_now())::int - birth_year),
        'photo', photos[1]
      ) order by name)
      from horses where status = 'for_sale'
    ), '[]'::jsonb) end,
    'bank', (select jsonb_build_object('bankName', bank_name, 'accountHolder', account_holder, 'clabe', clabe) from club_settings where id = 1)
  )
$$;

-- ───────── Assigning a plan: the same rules for management and for the website ─────────
create or replace function set_plan_for(p_rider uuid, p_classes int, p_start date default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rider riders; v_plan plans; v_today date := club_now()::date; v_anchor date; v_per record; v_month text; v_old text; v_pending boolean;
begin
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
  update payments set amount = price_of('plan_' || p_classes), due_on = v_plan.starts_on,
    meta = meta || jsonb_build_object('classes', p_classes, 'month', v_plan.month, 'start', v_plan.starts_on)
  where service = 'plan' and status = 'pending' and coalesce(receipt_status, '') <> 'review' and coalesce(meta ->> 'kind', '') <> 'upgrade'
    and meta ->> 'riderId' = p_rider::text and meta ->> 'month' in (v_month, v_old);
  return json_build_object('ok', true, 'month', v_plan.month, 'starts_on', v_plan.starts_on);
end $$;

create or replace function admin_set_plan(p_rider uuid, p_classes int, p_start date default null) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  return set_plan_for(p_rider, p_classes, p_start);
end $$;

-- ───────── The website's "Pagar": family (found by email or created), rider, plan or class, and the charge ─────────
-- p: { option: 'trial' | 'single' | '4' | '8' | '12', rider: { name, age }, contact, phone, email, start, lang, website, ip }
create or replace function web_enroll(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_option text := coalesce(p ->> 'option', '');
  v_email text := lower(btrim(coalesce(p ->> 'email', '')));
  v_contact text := left(btrim(coalesce(p ->> 'contact', '')), 120);
  v_phone text := nullif(left(btrim(coalesce(p ->> 'phone', '')), 40), '');
  v_rname text := left(btrim(coalesce(p -> 'rider' ->> 'name', '')), 80);
  v_age int;
  v_start date;
  v_ip text := nullif(btrim(coalesce(p ->> 'ip', '')), '');
  v_family families; v_rider riders; v_classes int; v_price int; v_pay uuid; v_per record; v_month text; v_new boolean := false; v_recent int;
begin
  if coalesce(p ->> 'website', '') <> '' then return json_build_object('ok', true, 'bot', true); end if; -- a bot filled the hidden field
  if v_option not in ('trial', 'single', '4', '8', '12') then return json_build_object('ok', false, 'code', 'badPlan'); end if;
  if v_rname = '' or v_contact = '' then return json_build_object('ok', false, 'code', 'missing'); end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then return json_build_object('ok', false, 'code', 'badEmail'); end if;
  if v_phone is not null and length(regexp_replace(v_phone, '\D', '', 'g')) < 8 then return json_build_object('ok', false, 'code', 'badPhone'); end if;
  begin
    v_age := nullif(p -> 'rider' ->> 'age', '')::int;
    v_start := coalesce(nullif(p ->> 'start', '')::date, club_now()::date);
  exception when others then return json_build_object('ok', false, 'code', 'missing');
  end;
  if v_age is not null and v_age not between 2 and 99 then return json_build_object('ok', false, 'code', 'missing'); end if;
  if v_start < club_now()::date then v_start := club_now()::date; end if;
  if v_option in ('trial', 'single') then
    v_price := price_of('class_' || v_option);
  else
    v_classes := v_option::int;
    v_price := price_of('plan_' || v_classes);
  end if;
  if v_price is null then return json_build_object('ok', false, 'code', 'badPlan'); end if;

  -- At most 5 enrolments an hour from one address or email.
  select count(*) into v_recent from payments
  where meta ->> 'web' = 'true' and created_at > now() - interval '1 hour'
    and ((v_ip is not null and meta ->> 'ip' = v_ip) or family_id in (select id from families where email = v_email));
  if v_recent >= 5 then return json_build_object('ok', false, 'code', 'tooMany'); end if;

  perform pg_advisory_xact_lock(hashtext('web_enroll:' || v_email));
  select * into v_family from families where email = v_email;
  if v_family.id is not null and (v_family.deleted_at is not null or not v_family.active) then
    return json_build_object('ok', false, 'code', 'accountBlocked');
  end if;
  if v_family.id is null then
    insert into families (name, contact, email, phone, self_signup)
    values ('Familia ' || coalesce(nullif(split_part(v_contact, ' ', array_length(regexp_split_to_array(v_contact, '\s+'), 1)), ''), v_contact),
            v_contact, v_email, v_phone, true)
    returning * into v_family;
    v_new := true;
  elsif v_phone is not null and v_family.phone is null then
    update families set phone = v_phone where id = v_family.id;
  end if;
  -- The rider, by name inside the family (a second payment for the same child adds nothing).
  select * into v_rider from riders where family_id = v_family.id and lower(name) = lower(v_rname) and active order by created_at limit 1;
  if v_rider.id is null then
    insert into riders (family_id, name, age, level) values (v_family.id, v_rname, v_age, 'beginner') returning * into v_rider;
  elsif v_age is not null and v_rider.age is distinct from v_age then
    update riders set age = v_age where id = v_rider.id;
  end if;

  if v_classes is not null then
    -- A plan from the start date: the charge first, then the plan (which stays unpaid until the charge is).
    if exists (select 1 from payments where family_id = v_family.id and service = 'plan' and status = 'pending'
               and meta ->> 'riderId' = v_rider.id::text and coalesce(receipt_status, '') = 'review') then
      return json_build_object('ok', false, 'code', 'pendingExists');
    end if;
    select * into v_per from period_of(v_start, greatest(v_start, club_now()::date));
    v_month := to_char(v_per.starts_on, 'YYYY-MM');
    select id into v_pay from payments where family_id = v_family.id and service = 'plan' and status = 'pending'
      and meta ->> 'riderId' = v_rider.id::text and coalesce(meta ->> 'kind', '') <> 'upgrade' and meta ->> 'month' = v_month limit 1;
    if v_pay is null then
      insert into payments (family_id, service, amount, due_on, meta)
      values (v_family.id, 'plan', v_price, v_per.starts_on,
              jsonb_build_object('riderId', v_rider.id, 'classes', v_classes, 'month', v_month, 'start', v_per.starts_on, 'web', 'true', 'ip', v_ip, 'lang', coalesce(p ->> 'lang', 'es')))
      returning id into v_pay;
    else
      update payments set meta = meta || jsonb_build_object('web', 'true', 'ip', v_ip) where id = v_pay;
    end if;
    perform set_plan_for(v_rider.id, v_classes, v_start);
    select amount into v_price from payments where id = v_pay;
  else
    -- A sample or single class: the charge now; the day and time are set with the club (the app links the booking to it).
    insert into payments (family_id, service, amount, due_on, meta)
    values (v_family.id, 'class', v_price, v_start,
            jsonb_build_object('riderId', v_rider.id, 'kind', v_option, 'date', v_start, 'web', 'true', 'ip', v_ip, 'lang', coalesce(p ->> 'lang', 'es')))
    returning id into v_pay;
  end if;
  return json_build_object('ok', true, 'payment_id', v_pay, 'amount', v_price, 'family_id', v_family.id, 'family_name', v_family.name,
                           'rider_id', v_rider.id, 'new_family', v_new, 'option', v_option, 'start', v_start);
end $$;

-- A receipt uploaded from the website (web/<payment>/<file>) → "Por revisar", like in the app.
create or replace function submit_web_receipt(p_payment uuid, p_path text) returns json
language plpgsql security definer set search_path = public as $$
declare v_p payments;
begin
  select * into v_p from payments where id = p_payment for update;
  if v_p.id is null or v_p.status <> 'pending' or v_p.meta ->> 'web' is distinct from 'true'
     or coalesce(v_p.receipt_status, '') = 'review'
     or p_path is null or p_path not like ('web/' || v_p.id::text || '/%') or p_path like '%..%' then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  update payments set receipt_path = p_path, receipt_status = 'review', receipt_note = null, receipt_uploaded_at = now(), reviewed_at = null
  where id = p_payment;
  return json_build_object('ok', true);
end $$;

-- The website may upload a receipt only into web/<charge>/ of a pending website charge that has none under review.
create or replace function web_receipt_folder_ok(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select split_part(p_name, '/', 1) = 'web' and split_part(p_name, '/', 3) <> ''
     and exists (select 1 from payments p
                 where p.id::text = split_part(p_name, '/', 2) and p.status = 'pending'
                   and p.meta ->> 'web' = 'true' and coalesce(p.receipt_status, '') <> 'review')
$$;
drop policy if exists receipts_web_upload on storage.objects;
create policy receipts_web_upload on storage.objects for insert to anon
with check (bucket_id = 'receipts' and public.web_receipt_folder_ok(objects.name));
grant usage on schema storage to anon;
grant insert on storage.objects to anon;
-- A family sees the receipt of its own charge, wherever it was uploaded from.
drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects for select to authenticated
using (bucket_id = 'receipts' and (public.is_admin() or (storage.foldername(objects.name))[1] = public.my_family_id()::text
       or exists (select 1 from public.payments p where p.receipt_path = objects.name and p.family_id = public.my_family_id())));

-- ───────── Card payments: what the Mercado Pago notification says about a charge (same notification twice changes nothing) ─────────
create or replace function card_payment_result(p_payment uuid, p_mp_id text, p_status text) returns json
language plpgsql security definer set search_path = public as $$
declare v_p payments;
begin
  select * into v_p from payments where id = p_payment for update;
  if v_p.id is null then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_status = 'approved' then
    if v_p.status = 'paid' then return json_build_object('ok', true, 'changed', false, 'status', 'paid'); end if;
    update payments set status = 'paid', method = 'card', paid_at = now(),
      receipt_status = case when receipt_status is null then null else 'approved' end, reviewed_at = case when receipt_status is null then reviewed_at else now() end,
      meta = meta || jsonb_build_object('mpPayment', p_mp_id, 'mpStatus', 'approved')
    where id = p_payment;
    perform apply_plan_payment(v_p);
    return json_build_object('ok', true, 'changed', true, 'status', 'paid');
  end if;
  if v_p.status = 'paid' then return json_build_object('ok', true, 'changed', false, 'status', 'paid'); end if;
  update payments set meta = meta || jsonb_build_object('mpPayment', p_mp_id, 'mpStatus', case when p_status in ('pending', 'in_process', 'authorized') then 'pending' else 'rejected' end)
  where id = p_payment and coalesce(meta ->> 'mpStatus', '') is distinct from case when p_status in ('pending', 'in_process', 'authorized') then 'pending' else 'rejected' end;
  return json_build_object('ok', true, 'changed', found, 'status', 'pending');
end $$;

-- ───────── A class paid on the website is used by the first booking of that kind (no second charge) ─────────
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
  -- A class of this kind paid (or charged) on the website and not yet used: this booking takes it.
  select id into v_pay from payments
  where family_id = v_rider.family_id and service = 'class' and meta ->> 'web' = 'true' and meta ->> 'kind' = p_kind
    and meta ->> 'riderId' = p_rider::text and coalesce(meta ->> 'bookingId', '') = ''
  order by (status = 'paid') desc, created_at limit 1;
  if v_pay is not null then
    update payments set meta = meta || jsonb_build_object('date', p_date, 'slotId', p_slot, 'bookingId', v_id), due_on = least(due_on, p_date) where id = v_pay;
  else
    insert into payments (family_id, service, amount, meta)
    values (v_rider.family_id, 'class', v_price,
            json_build_object('riderId', p_rider, 'kind', p_kind, 'date', p_date, 'slotId', p_slot, 'bookingId', v_id)::jsonb)
    returning id into v_pay;
  end if;
  update bookings set payment_id = v_pay where id = v_id;
  return json_build_object('ok', true, 'booking_id', v_id, 'payment_id', v_pay, 'amount', (select amount from payments where id = v_pay));
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public_site() to anon;
grant execute on function send_contact_message(jsonb) to anon;
grant execute on function web_enroll(jsonb) to anon;
grant execute on function submit_web_receipt(uuid, text) to anon;
grant execute on function web_receipt_folder_ok(text) to anon;
revoke execute on function set_plan_for(uuid, int, date) from authenticated;
revoke execute on function card_payment_result(uuid, text, text) from authenticated;
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
