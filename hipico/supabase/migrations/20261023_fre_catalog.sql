-- The whole FreeRide catalog in the shop: a daily copy of shopfre.com's public catalog (api/fre-sync.js), shown in
-- pesos with Mara's factor and her extra 5 % (not on FreeRide's own sales), always "sobre pedido" (50 % today).
-- Mara hides a product or a whole type from the panel. Plus a "Chamarras" category for her own products. Safe to run twice.

alter table club_settings add column if not exists fre_mxn_factor numeric not null default 23.7;
alter table club_settings add column if not exists fre_discount numeric not null default 5;
alter table club_settings add column if not exists fre_hidden_types text[] not null default '{}';
alter table club_settings add column if not exists fre_last_sync timestamptz;
alter table club_settings add column if not exists fre_last_count integer;
alter table club_settings add column if not exists fre_last_error text;

alter table shop_products drop constraint if exists shop_products_category_check;
alter table shop_products add constraint shop_products_category_check check (category in ('pants', 'shirts', 'jackets', 'accessories'));

create table if not exists fre_catalog (
  handle      text primary key,
  title       text not null,
  type        text not null default '',
  tags        text[] not null default '{}',
  category    text not null default 'accessories' check (category in ('pants', 'shirts', 'jackets', 'accessories')),
  mapped      boolean not null default true, -- false: nothing in its type or tags said what it is (the panel lists these)
  kids        text check (kids in ('girl', 'boy')),
  colors      text[] not null default '{}',
  sizes       text[] not null default '{}',
  variants    jsonb not null default '[]'::jsonb, -- [{ color, size, available }]
  price_usd   numeric not null default 0,
  compare_usd numeric,
  images      text[] not null default '{}',
  url         text not null default '',
  position    integer not null default 0,
  hidden      boolean not null default false,
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);
create index if not exists fre_catalog_cat_idx on fre_catalog (category, position);

-- Management reads and edits (hide / show); everyone else reads through public_fre_catalog(); the server function writes.
alter table fre_catalog enable row level security;
drop policy if exists admin_all on fre_catalog;
create policy admin_all on fre_catalog for all to authenticated using (is_admin()) with check (is_admin());
grant select, update on fre_catalog to authenticated;

-- Pesos: USD × factor to the nearest $50 (Celestial Lux $95 → $2,250); Mara's discount on top, to the nearest $50
-- ($2,150), except on what FreeRide already has on sale.
create or replace function fre_price(p_usd numeric, p_compare numeric, p_factor numeric, p_discount numeric, out unit int, out list int)
language sql immutable as $$
  select case when coalesce(p_compare, 0) > p_usd then (round(p_usd * p_factor / 50) * 50)::int
              else (round(round(p_usd * p_factor / 50) * 50 * (1 - coalesce(p_discount, 0) / 100) / 50) * 50)::int end,
         case when coalesce(p_compare, 0) > p_usd then (round(p_compare * p_factor / 50) * 50)::int
              else (round(p_usd * p_factor / 50) * 50)::int end
$$;

-- The catalog for the website and the app, a page at a time, with the filters and the counts for the tabs.
-- p: { offset, limit, category, size, color, kids, handle }
create or replace function public_fre_catalog(p jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_set club_settings; v_off int := greatest(0, coalesce(nullif(p ->> 'offset', '')::int, 0));
  v_lim int := least(60, greatest(1, coalesce(nullif(p ->> 'limit', '')::int, 24)));
  v_cat text := nullif(p ->> 'category', ''); v_size text := nullif(p ->> 'size', ''); v_color text := lower(nullif(p ->> 'color', ''));
  v_kids text := nullif(p ->> 'kids', ''); v_handle text := nullif(p ->> 'handle', ''); v_out jsonb;
begin
  select * into v_set from club_settings where id = 1;
  if not coalesce(v_set.module_shop, true) then return jsonb_build_object('total', 0, 'items', '[]'::jsonb); end if;
  with base as (
    select * from fre_catalog c where c.active and not c.hidden and not (c.type = any (coalesce(v_set.fre_hidden_types, '{}')))
  ), filt as (
    select * from base b
    where (v_handle is null or b.handle = v_handle)
      and (v_cat is null or b.category = v_cat)
      and (v_kids is null or b.kids = v_kids)
      and (v_size is null or exists (select 1 from jsonb_array_elements(b.variants) v where v ->> 'size' = v_size and coalesce((v ->> 'available')::boolean, false)))
      and (v_color is null or exists (select 1 from unnest(b.colors) x where lower(x) = v_color))
  )
  select jsonb_build_object(
    'factor', v_set.fre_mxn_factor, 'discount', v_set.fre_discount,
    'total', (select count(*) from filt),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'handle', f.handle, 'title', f.title, 'category', f.category, 'kids', f.kids, 'colors', to_jsonb(f.colors), 'sizes', to_jsonb(f.sizes),
        'variants', f.variants, 'priceUsd', f.price_usd, 'compareUsd', f.compare_usd, 'images', to_jsonb(f.images[1:6]), 'url', f.url,
        'unit', (fre_price(f.price_usd, f.compare_usd, v_set.fre_mxn_factor, v_set.fre_discount)).unit,
        'list', (fre_price(f.price_usd, f.compare_usd, v_set.fre_mxn_factor, v_set.fre_discount)).list,
        'onSale', coalesce(f.compare_usd, 0) > f.price_usd
      ) order by f.position, f.title) from (select * from filt order by position, title offset v_off limit v_lim) f), '[]'::jsonb),
    'categories', coalesce((select jsonb_object_agg(category, n) from (select category, count(*) n from base group by 1) x), '{}'::jsonb),
    'colors', coalesce((select jsonb_agg(c order by n desc, c) from (select x c, count(*) n from base, unnest(colors) x group by 1 order by 2 desc, 1 limit 40) y), '[]'::jsonb),
    'kids', coalesce((select jsonb_agg(distinct kids) from base where kids is not null), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;

create or replace function shop_order(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(coalesce(p ->> 'email', '')));
  v_name text := left(btrim(coalesce(p ->> 'name', '')), 120);
  v_phone text := nullif(left(btrim(coalesce(p ->> 'phone', '')), 40), '');
  v_ip text := nullif(btrim(coalesce(p ->> 'ip', '')), '');
  v_mine uuid := my_family_id();
  v_web boolean := my_family_id() is null;
  v_family families; v_item jsonb; v_prod shop_products; v_var shop_variants; v_qty int; v_unit int; v_list int; v_on boolean;
  v_fre fre_catalog; v_price record; v_set club_settings;
  v_lines jsonb := '[]'::jsonb; v_total int := 0; v_now int := 0; v_later int := 0; v_recent int; v_order shop_orders; v_pay uuid;
begin
  if coalesce(p ->> 'website', '') <> '' then return json_build_object('ok', true, 'bot', true); end if; -- a bot filled the hidden field
  if not coalesce((select module_shop from club_settings where id = 1), true) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if jsonb_typeof(p -> 'items') is distinct from 'array' or jsonb_array_length(p -> 'items') = 0 or jsonb_array_length(p -> 'items') > 20 then
    return json_build_object('ok', false, 'code', 'emptyCart');
  end if;
  if v_mine is not null then
    select * into v_family from families where id = v_mine;
  else
    if v_name = '' then return json_build_object('ok', false, 'code', 'missing'); end if;
    if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then return json_build_object('ok', false, 'code', 'badEmail'); end if;
    if v_phone is null or length(regexp_replace(v_phone, '\D', '', 'g')) < 8 then return json_build_object('ok', false, 'code', 'badPhone'); end if;
    -- At most 5 website charges an hour from one address or email (shared with the class sign-ups).
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
      values ('Familia ' || coalesce(nullif(split_part(v_name, ' ', array_length(regexp_split_to_array(v_name, '\s+'), 1)), ''), v_name),
              v_name, v_email, v_phone, true)
      returning * into v_family;
    elsif v_family.phone is null then
      update families set phone = v_phone where id = v_family.id;
    end if;
  end if;

  -- Every line against the stock, in one go: one order at a time takes stock.
  perform pg_advisory_xact_lock(hashtext('shop_stock'));
  select * into v_set from club_settings where id = 1;
  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_qty := coalesce(nullif(v_item ->> 'qty', '')::int, 1);
    -- A product of FreeRide's catalog: always ordered from FreeRide (50 % today), its size and color available there.
    if coalesce(v_item ->> 'fre', '') <> '' then
      select * into v_fre from fre_catalog c
      where c.handle = v_item ->> 'fre' and c.active and not c.hidden and not (c.type = any (coalesce(v_set.fre_hidden_types, '{}')));
      if v_fre.handle is null or v_qty < 1 or v_qty > 3 or not exists (
        select 1 from jsonb_array_elements(v_fre.variants) v
        where coalesce(v ->> 'size', '') = coalesce(v_item ->> 'size', '') and coalesce(v ->> 'color', '') = coalesce(v_item ->> 'color', '')
          and coalesce((v ->> 'available')::boolean, false)) then
        return json_build_object('ok', false, 'code', 'out_of_stock',
          'line', json_build_object('product', 'fre:' || coalesce(v_item ->> 'fre', ''), 'size', v_item ->> 'size', 'name', v_fre.title, 'color', v_item ->> 'color'));
      end if;
      select * into v_price from fre_price(v_fre.price_usd, v_fre.compare_usd, v_set.fre_mxn_factor, v_set.fre_discount);
      v_total := v_total + v_price.unit * v_qty;
      v_later := v_later + v_price.unit * v_qty;
      v_lines := v_lines || jsonb_build_array(jsonb_build_object(
        'fre', true, 'slug', 'fre:' || v_fre.handle, 'name', v_fre.title, 'color', coalesce(v_item ->> 'color', ''), 'size', coalesce(v_item ->> 'size', ''),
        'qty', v_qty, 'unit', v_price.unit, 'list', v_price.list, 'onOrder', true, 'photo', v_fre.images[1], 'url', v_fre.url));
      continue;
    end if;
    select * into v_prod from shop_products where (id::text = v_item ->> 'product' or slug = v_item ->> 'product') and active;
    select * into v_var from shop_variants where product_id = v_prod.id and size = v_item ->> 'size' for update;
    if v_prod.id is null or v_var.id is null or v_qty < 1 or v_qty > 10 then
      return json_build_object('ok', false, 'code', 'out_of_stock', 'line', json_build_object('product', v_item ->> 'product', 'size', v_item ->> 'size'));
    end if;
    if v_var.stock >= v_qty then
      v_on := false;
      update shop_variants set stock = stock - v_qty where id = v_var.id;
    elsif v_var.stock = 0 and v_prod.takes_orders and v_qty <= 3 then
      v_on := true;
    else
      return json_build_object('ok', false, 'code', 'out_of_stock',
        'line', json_build_object('product', v_prod.slug, 'size', v_var.size, 'name', v_prod.name, 'color', v_prod.color_name, 'left', v_var.stock));
    end if;
    v_list := coalesce(v_var.price, v_prod.price);
    v_unit := coalesce(v_var.price, v_prod.promo_price, v_prod.price);
    v_total := v_total + v_unit * v_qty;
    if v_on then v_later := v_later + v_unit * v_qty; else v_now := v_now + v_unit * v_qty; end if;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'productId', v_prod.id, 'slug', v_prod.slug, 'name', v_prod.name, 'color', v_prod.color_name, 'size', v_var.size,
      'qty', v_qty, 'unit', v_unit, 'list', v_list, 'onOrder', v_on, 'photo', v_prod.photos[1]));
  end loop;
  v_now := v_now + ceil(v_later / 2.0)::int; -- 50 % of what is ordered from FreeRide, all of what is here

  insert into shop_orders (family_id, name, phone, email, items, total)
  values (v_family.id, coalesce(nullif(v_name, ''), v_family.contact), coalesce(v_phone, v_family.phone), coalesce(nullif(v_email, ''), v_family.email), v_lines, v_total)
  returning * into v_order;
  insert into payments (family_id, service, amount, due_on, meta)
  values (v_family.id, 'shop', v_now, club_now()::date,
          jsonb_build_object('order', v_order.id, 'number', v_order.number, 'kind', 'shop', 'lang', coalesce(p ->> 'lang', 'es'))
          || case when v_web then jsonb_build_object('web', 'true', 'ip', v_ip) else '{}'::jsonb end)
  returning id into v_pay;
  return json_build_object('ok', true, 'order', v_order.id, 'number', v_order.number, 'payment_id', v_pay, 'amount', v_now,
                           'total', v_total, 'family_name', v_family.name);
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
