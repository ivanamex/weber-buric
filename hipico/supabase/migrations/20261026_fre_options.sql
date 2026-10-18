-- FreeRide's products with more than color and size: a breech's grip (Full Seat / Knee Patch) and length (Regular /
-- Petite), a shirt's sleeve. The copy (api/_fre.js) now gives every variant { color, size, extra, available, image } and
-- every product its extra options (extras) plus a few of FreeRide's own variants (raw), to check odd ones against. The
-- product window asks for each option, the list carries them (send_wishlist matches the exact variant), and an order
-- made from a list keeps them. The window gets every photo of the product (the grid, the first six). Safe to run twice.

alter table fre_catalog add column if not exists extras jsonb not null default '[]'::jsonb; -- [{ key, values }]
alter table fre_catalog add column if not exists raw jsonb;

create or replace function public_fre_catalog(p jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_set club_settings; v_off int := greatest(0, coalesce(nullif(p ->> 'offset', '')::int, 0));
  v_lim int := least(60, greatest(1, coalesce(nullif(p ->> 'limit', '')::int, 24)));
  v_cat text := nullif(p ->> 'category', ''); v_aud text := nullif(p ->> 'audience', ''); v_handle text := nullif(p ->> 'handle', '');
  v_sizes text[] := case when jsonb_typeof(p -> 'sizes') = 'array' then array(select jsonb_array_elements_text(p -> 'sizes')) else '{}' end;
  v_colors text[] := case when jsonb_typeof(p -> 'colors') = 'array' then array(select lower(x) from jsonb_array_elements_text(p -> 'colors') x) else '{}' end;
  v_out jsonb; v_horse boolean;
begin
  select * into v_set from club_settings where id = 1;
  if not coalesce(v_set.module_shop, true) then return jsonb_build_object('total', 0, 'items', '[]'::jsonb); end if;
  if v_aud not in ('women', 'men', 'kids') then v_aud := null; end if;
  -- "Para tu caballo" is its own tab only with 4 or more products; otherwise they show under Accesorios.
  select count(*) >= 4 into v_horse from fre_catalog c
  where c.active and not c.hidden and c.category = 'horse' and not (c.type = any (coalesce(v_set.fre_hidden_types, '{}')));
  with base0 as (
    select * from fre_catalog c where c.active and not c.hidden and not (c.type = any (coalesce(v_set.fre_hidden_types, '{}')))
  ), base as (
    select handle, title, type, colors, sizes, size_keys, extras, variants, price_usd, compare_usd, images, url, position,
           case when category = 'horse' and not v_horse then 'accessories' else category end as category,
           coalesce(audience_override, audience) as audience
    from base0
  ), tab as (
    select * from base b where (v_cat is null or b.category = v_cat) and (v_aud is null or b.audience in (v_aud, 'all'))
  ), filt as (
    select * from tab t
    where (v_handle is null or t.handle = v_handle)
      and (cardinality(v_sizes) = 0 or t.size_keys && v_sizes)
      and (cardinality(v_colors) = 0 or exists (select 1 from unnest(t.colors) x where lower(x) = any (v_colors)))
  )
  select jsonb_build_object(
    'factor', v_set.fre_mxn_factor, 'discount', v_set.fre_discount,
    'total', (select count(*) from filt),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'handle', f.handle, 'title', f.title, 'category', f.category, 'audience', f.audience, 'colors', to_jsonb(f.colors), 'sizes', to_jsonb(f.sizes),
        'extras', f.extras, 'variants', f.variants, 'priceUsd', f.price_usd, 'compareUsd', f.compare_usd,
        'images', to_jsonb(case when v_handle is null then f.images[1:6] else f.images end), 'url', f.url,
        'unit', (fre_price(f.price_usd, f.compare_usd, v_set.fre_mxn_factor, v_set.fre_discount)).unit,
        'list', (fre_price(f.price_usd, f.compare_usd, v_set.fre_mxn_factor, v_set.fre_discount)).list,
        'onSale', coalesce(f.compare_usd, 0) > f.price_usd
      ) order by f.position, f.title) from (select * from filt order by position, title offset v_off limit v_lim) f), '[]'::jsonb),
    'categories', coalesce((select jsonb_object_agg(category, n) from (select category, count(*) n from base group by 1) x), '{}'::jsonb),
    'sizes', coalesce((select jsonb_agg(distinct k) from tab t, unnest(t.size_keys) k
                       where (v_aud = 'kids') = (t.audience = 'kids') or (v_aud is null and t.audience <> 'kids')), '[]'::jsonb),
    'colors', coalesce((select jsonb_agg(c order by n desc, c) from (select x c, count(*) n from tab, unnest(colors) x group by 1 order by 2 desc, 1 limit 40) y), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;

-- A list line names its options too: a line from before them (no extra) still matches any variant of its color and size.
create or replace function send_wishlist(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_mine uuid := my_family_id();
  v_family families;
  v_name text := left(btrim(coalesce(p ->> 'name', '')), 120);
  v_phone text := nullif(left(btrim(coalesce(p ->> 'phone', '')), 40), '');
  v_email text := nullif(lower(left(btrim(coalesce(p ->> 'email', '')), 160)), '');
  v_note text := nullif(left(btrim(coalesce(p ->> 'note', '')), 1000), '');
  v_ip text;
  v_set club_settings; v_item jsonb; v_fre fre_catalog; v_price record; v_qty int;
  v_lines jsonb := '[]'::jsonb; v_total int := 0; v_recent int; v_list shop_wishlists;
begin
  if coalesce(p ->> 'website', '') <> '' then return json_build_object('ok', true, 'bot', true); end if;
  select * into v_set from club_settings where id = 1;
  if not coalesce(v_set.module_shop, true) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if jsonb_typeof(p -> 'items') is distinct from 'array' or jsonb_array_length(p -> 'items') = 0 or jsonb_array_length(p -> 'items') > 30 then
    return json_build_object('ok', false, 'code', 'emptyCart');
  end if;
  if v_mine is not null then
    select * into v_family from families where id = v_mine;
    v_name := coalesce(nullif(v_name, ''), v_family.contact);
    v_phone := coalesce(v_phone, v_family.phone);
    v_email := coalesce(v_email, v_family.email);
  else
    if v_name = '' then return json_build_object('ok', false, 'code', 'missing'); end if;
    if v_phone is null or length(regexp_replace(v_phone, '\D', '', 'g')) < 8 then return json_build_object('ok', false, 'code', 'badPhone'); end if;
    if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      return json_build_object('ok', false, 'code', 'badEmail');
    end if;
  end if;

  v_ip := nullif(p ->> 'ip', '');
  if v_ip is null then
    begin
      v_ip := split_part(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ',', 1);
    exception when others then v_ip := null;
    end;
  end if;
  v_ip := nullif(btrim(v_ip), '');
  select count(*) into v_recent from shop_wishlists
  where created_at > now() - interval '1 hour'
    and ((v_ip is not null and ip = v_ip) or (v_phone is not null and phone = v_phone) or (v_email is not null and email = v_email));
  if v_recent >= 5 then return json_build_object('ok', false, 'code', 'tooMany'); end if;

  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_qty := coalesce(nullif(v_item ->> 'qty', '')::int, 1);
    select * into v_fre from fre_catalog c
    where c.handle = v_item ->> 'fre' and c.active and not c.hidden and not (c.type = any (coalesce(v_set.fre_hidden_types, '{}')));
    if v_fre.handle is null or v_qty < 1 or v_qty > 3 or not exists (
      select 1 from jsonb_array_elements(v_fre.variants) v
      where coalesce(v ->> 'size', '') = coalesce(v_item ->> 'size', '') and coalesce(v ->> 'color', '') = coalesce(v_item ->> 'color', '')
        and (jsonb_typeof(v_item -> 'extra') is distinct from 'object' or coalesce(v -> 'extra', '{}'::jsonb) = v_item -> 'extra')
        and coalesce((v ->> 'available')::boolean, false)) then
      return json_build_object('ok', false, 'code', 'out_of_stock',
        'line', json_build_object('product', 'fre:' || coalesce(v_item ->> 'fre', ''), 'size', v_item ->> 'size', 'name', v_fre.title, 'color', v_item ->> 'color'));
    end if;
    select * into v_price from fre_price(v_fre.price_usd, v_fre.compare_usd, v_set.fre_mxn_factor, v_set.fre_discount);
    v_total := v_total + v_price.unit * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'handle', v_fre.handle, 'name', v_fre.title, 'color', coalesce(v_item ->> 'color', ''), 'size', coalesce(v_item ->> 'size', ''),
      'extra', case when jsonb_typeof(v_item -> 'extra') = 'object' then v_item -> 'extra' else '{}'::jsonb end, 'qty', v_qty, 'unit', v_price.unit, 'photo', v_fre.images[1], 'url', v_fre.url));
  end loop;

  insert into shop_wishlists (family_id, name, phone, email, note, items, total_estimate, lang, ip)
  values (v_family.id, v_name, v_phone, v_email, v_note, v_lines, v_total, case when p ->> 'lang' = 'en' then 'en' else 'es' end, v_ip)
  returning * into v_list;
  return json_build_object('ok', true, 'id', v_list.id, 'number', v_list.number, 'total', v_total, 'items', v_lines);
end $$;

-- The order keeps the options of each line.
create or replace function admin_wishlist_convert(p_list uuid, p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_list shop_wishlists; v_family families; v_line jsonb; v_src jsonb; v_unit int; v_qty int;
  v_email text := nullif(lower(btrim(coalesce(p ->> 'email', ''))), '');
  v_lines jsonb := '[]'::jsonb; v_total int := 0; v_order shop_orders; v_pay uuid; v_now int;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_list from shop_wishlists where id = p_list for update;
  if v_list.id is null or v_list.status = 'convertida' then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if jsonb_typeof(p -> 'lines') is distinct from 'array' or jsonb_array_length(p -> 'lines') = 0 then
    return json_build_object('ok', false, 'code', 'emptyCart');
  end if;
  for v_line in select * from jsonb_array_elements(p -> 'lines') loop
    v_src := v_list.items -> ((v_line ->> 'i')::int);
    v_unit := nullif(v_line ->> 'unit', '')::int;
    v_qty := coalesce(nullif(v_line ->> 'qty', '')::int, (v_src ->> 'qty')::int);
    if v_src is null or v_unit is null or v_unit < 0 or v_qty < 1 or v_qty > 10 then return json_build_object('ok', false, 'code', 'missing'); end if;
    v_total := v_total + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'fre', true, 'slug', 'fre:' || (v_src ->> 'handle'), 'name', v_src ->> 'name', 'color', coalesce(v_src ->> 'color', ''),
      'size', coalesce(v_src ->> 'size', ''), 'extra', coalesce(v_src -> 'extra', '{}'::jsonb), 'qty', v_qty, 'unit', v_unit, 'list', greatest(v_unit, coalesce((v_src ->> 'unit')::int, v_unit)),
      'onOrder', true, 'photo', v_src ->> 'photo', 'url', v_src ->> 'url'));
  end loop;

  if v_list.family_id is not null then select * into v_family from families where id = v_list.family_id; end if;
  if v_family.id is null then
    v_email := coalesce(v_email, v_list.email);
    if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then return json_build_object('ok', false, 'code', 'badEmail'); end if;
    select * into v_family from families where email = v_email;
    if v_family.id is null then
      insert into families (name, contact, email, phone, self_signup)
      values ('Familia ' || coalesce(nullif(split_part(v_list.name, ' ', array_length(regexp_split_to_array(v_list.name, '\s+'), 1)), ''), v_list.name),
              v_list.name, v_email, v_list.phone, true)
      returning * into v_family;
    elsif v_family.phone is null and v_list.phone is not null then
      update families set phone = v_list.phone where id = v_family.id;
    end if;
  end if;

  v_now := ceil(v_total / 2.0)::int;
  insert into shop_orders (family_id, name, phone, email, items, total)
  values (v_family.id, v_list.name, coalesce(v_list.phone, v_family.phone), coalesce(v_list.email, v_family.email), v_lines, v_total)
  returning * into v_order;
  insert into payments (family_id, service, amount, due_on, meta)
  values (v_family.id, 'shop', v_now, club_now()::date,
          jsonb_build_object('order', v_order.id, 'number', v_order.number, 'kind', 'shop', 'lang', v_list.lang, 'wishlist', v_list.number))
  returning id into v_pay;
  update shop_wishlists set status = 'convertida', order_id = v_order.id, family_id = v_family.id where id = v_list.id;
  return json_build_object('ok', true, 'order', v_order.id, 'number', v_order.number, 'payment_id', v_pay, 'amount', v_now,
                           'total', v_total, 'family_id', v_family.id, 'email', v_family.email);
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public_site() to anon;
grant execute on function send_contact_message(jsonb) to anon;
grant execute on function web_enroll(jsonb) to anon;
grant execute on function submit_web_receipt(uuid, text) to anon;
grant execute on function web_receipt_folder_ok(text) to anon;
grant execute on function web_pay_at_club(uuid) to anon;
grant execute on function promote_demo() to anon;
grant execute on function public_shop() to anon;
grant execute on function shop_order(jsonb) to anon;
grant execute on function public_fre_catalog(jsonb) to anon;
grant execute on function fre_price(numeric, numeric, numeric, numeric) to anon;
grant execute on function send_wishlist(jsonb) to anon;
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
