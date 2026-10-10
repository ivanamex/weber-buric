-- Messages from the website's contact form: saved first, emailed to the club, listed in Dirección → Mensajes.

create table if not exists contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  email       text,
  channel     text not null default 'whatsapp' check (channel in ('whatsapp', 'email')),
  service     text,
  message     text not null default '',
  page        text,
  lang        text not null default 'es',
  ip          text,
  status      text not null default 'new' check (status in ('new', 'answered')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists contact_messages_created_idx on contact_messages (created_at desc);

-- Only management reads and updates; the website writes through send_contact_message().
alter table contact_messages enable row level security;
drop policy if exists admin_all on contact_messages;
create policy admin_all on contact_messages for all to authenticated using (is_admin()) with check (is_admin());
grant select, update on contact_messages to authenticated;

-- The website's form (no sign-in). Checks the fields, drops bots (the hidden "website" field filled in → pretends
-- success without saving) and limits each phone, email and address to 5 messages an hour.
-- p: { name, phone, email, channel, service, message, page, lang, website, ip }
create or replace function send_contact_message(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_name    text := left(btrim(coalesce(p->>'name', '')), 120);
  v_phone   text := nullif(left(btrim(coalesce(p->>'phone', '')), 40), '');
  v_email   text := nullif(lower(left(btrim(coalesce(p->>'email', '')), 160)), '');
  v_channel text := coalesce(nullif(p->>'channel', ''), 'whatsapp');
  v_message text := left(btrim(coalesce(p->>'message', '')), 2000);
  v_ip      text;
  v_id      uuid;
  v_recent  integer;
begin
  if coalesce(p->>'website', '') <> '' then return json_build_object('ok', true); end if; -- a bot filled the hidden field
  if v_name = '' then return json_build_object('ok', false, 'code', 'missing'); end if;
  if v_phone is null and v_email is null then return json_build_object('ok', false, 'code', 'contactRequired'); end if;
  if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return json_build_object('ok', false, 'code', 'badEmail');
  end if;
  if v_phone is not null and length(regexp_replace(v_phone, '\D', '', 'g')) < 8 then
    return json_build_object('ok', false, 'code', 'badPhone');
  end if;
  if v_channel not in ('whatsapp', 'email') then v_channel := 'whatsapp'; end if;
  if v_channel = 'whatsapp' and v_phone is null then v_channel := 'email'; end if;
  if v_channel = 'email' and v_email is null then v_channel := 'whatsapp'; end if;

  -- The sender's address: given by the server function, else the one the API gateway forwards.
  v_ip := nullif(p->>'ip', '');
  if v_ip is null then
    begin
      v_ip := split_part(nullif(current_setting('request.headers', true), '')::json->>'x-forwarded-for', ',', 1);
    exception when others then v_ip := null;
    end;
  end if;
  v_ip := nullif(btrim(v_ip), '');

  select count(*) into v_recent from contact_messages
  where created_at > now() - interval '1 hour'
    and ((v_ip is not null and ip = v_ip) or (v_phone is not null and phone = v_phone) or (v_email is not null and email = v_email));
  if v_recent >= 5 then return json_build_object('ok', false, 'code', 'tooMany'); end if;

  insert into contact_messages (name, phone, email, channel, service, message, page, lang, ip)
  values (v_name, v_phone, v_email, v_channel, nullif(left(btrim(coalesce(p->>'service', '')), 60), ''), v_message,
          nullif(left(coalesce(p->>'page', ''), 200), ''), case when p->>'lang' = 'en' then 'en' else 'es' end, v_ip)
  returning id into v_id;
  return json_build_object('ok', true, 'id', v_id);
end $$;

-- Management marks a message answered (or new again).
create or replace function mark_contact_message(p_id uuid, p_status text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_status not in ('new', 'answered') then return json_build_object('ok', false, 'code', 'notFound'); end if;
  update contact_messages set status = p_status, answered_at = case when p_status = 'answered' then now() else null end where id = p_id;
  if not found then return json_build_object('ok', false, 'code', 'notFound'); end if;
  return json_build_object('ok', true);
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public_site() to anon;
grant execute on function send_contact_message(jsonb) to anon;
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
