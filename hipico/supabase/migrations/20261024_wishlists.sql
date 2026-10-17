-- FreeRide pieces become a wish list sent to Mara (no payment on the site); she answers with her price and turns the
-- list into an order from the panel. Also: "Para tu caballo" for FreeRide's horse products, the sync's rules version
-- (a new version copies the catalog again on the next deploy), and the products' creation date for "newest first".
-- Safe to run twice.

alter table club_settings add column if not exists fre_rules integer not null default 0;

alter table shop_products drop constraint if exists shop_products_category_check;
alter table shop_products add constraint shop_products_category_check check (category in ('pants', 'shirts', 'jackets', 'accessories', 'horse'));
alter table fre_catalog drop constraint if exists fre_catalog_category_check;
alter table fre_catalog add constraint fre_catalog_category_check check (category in ('pants', 'shirts', 'jackets', 'accessories', 'horse'));

-- ───────── Wish lists ─────────
create sequence if not exists shop_wishlist_number start 101;
create table if not exists shop_wishlists (
  id             uuid primary key default gen_random_uuid(),
  number         integer not null unique default nextval('shop_wishlist_number'),
  family_id      uuid references families (id) on delete set null,
  name           text not null,
  phone          text,
  email          text,
  note           text,
  items          jsonb not null default '[]'::jsonb, -- [{ handle, name, color, size, qty, unit, photo, url }]
  total_estimate integer not null default 0,
  status         text not null default 'nueva' check (status in ('nueva', 'cotizada', 'convertida', 'cerrada')),
  order_id       uuid references shop_orders (id) on delete set null,
  lang           text not null default 'es',
  ip             text,
  created_at     timestamptz not null default now()
);
create index if not exists shop_wishlists_created_idx on shop_wishlists (created_at desc);

alter table shop_wishlists enable row level security;
drop policy if exists admin_all on shop_wishlists;
create policy admin_all on shop_wishlists for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists family_read on shop_wishlists;
create policy family_read on shop_wishlists for select to authenticated using (family_id = my_family_id());
grant select, update on shop_wishlists to authenticated;

-- Anyone sends a list (the website); a signed-in family sends it as itself. The contact form's rules: a hidden field
-- only bots fill, at most 5 an hour per address, phone or email. Each piece is checked against FreeRide's copy and
-- priced with fre_price() (the estimate Mara confirms).
-- p: { items: [{ fre, color, size, qty }], name, phone, email, note, lang, website, ip }
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
        and coalesce((v ->> 'available')::boolean, false)) then
      return json_build_object('ok', false, 'code', 'out_of_stock',
        'line', json_build_object('product', 'fre:' || coalesce(v_item ->> 'fre', ''), 'size', v_item ->> 'size', 'name', v_fre.title, 'color', v_item ->> 'color'));
    end if;
    select * into v_price from fre_price(v_fre.price_usd, v_fre.compare_usd, v_set.fre_mxn_factor, v_set.fre_discount);
    v_total := v_total + v_price.unit * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'handle', v_fre.handle, 'name', v_fre.title, 'color', coalesce(v_item ->> 'color', ''), 'size', coalesce(v_item ->> 'size', ''),
      'qty', v_qty, 'unit', v_price.unit, 'photo', v_fre.images[1], 'url', v_fre.url));
  end loop;

  insert into shop_wishlists (family_id, name, phone, email, note, items, total_estimate, lang, ip)
  values (v_family.id, v_name, v_phone, v_email, v_note, v_lines, v_total, case when p ->> 'lang' = 'en' then 'en' else 'es' end, v_ip)
  returning * into v_list;
  return json_build_object('ok', true, 'id', v_list.id, 'number', v_list.number, 'total', v_total, 'items', v_lines);
end $$;

-- Management: a list answered (cotizada), closed with no order, or back to new.
create or replace function admin_wishlist_status(p_list uuid, p_status text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_status not in ('nueva', 'cotizada', 'cerrada') then return json_build_object('ok', false, 'code', 'notFound'); end if;
  update shop_wishlists set status = p_status where id = p_list and status <> 'convertida';
  if not found then return json_build_object('ok', false, 'code', 'notFound'); end if;
  return json_build_object('ok', true);
end $$;

-- Management: the list becomes an order with Mara's final prices (every line "sobre pedido") and the 50 % charge, so the
-- family pays in the app like any shop order. The family: the list's, else found by email, else created (an email is
-- needed then: the family signs in with it).
-- p: { lines: [{ i: <index in the list>, unit, qty }], email }
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
      'size', coalesce(v_src ->> 'size', ''), 'qty', v_qty, 'unit', v_unit, 'list', greatest(v_unit, coalesce((v_src ->> 'unit')::int, v_unit)),
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

-- The products' creation date (Mara's newest first on the website).
create or replace function public_shop() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'on', coalesce((select module_shop from club_settings where id = 1), true),
    'products', case when coalesce((select module_shop from club_settings where id = 1), true) then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'slug', p.slug, 'model', p.model, 'category', p.category, 'name', p.name,
        'colorName', p.color_name, 'colorHex', p.color_hex,
        'descriptionEs', p.description_es, 'descriptionEn', p.description_en, 'features', p.features,
        'price', p.price, 'promoPrice', p.promo_price, 'sticker', p.sticker, 'photos', to_jsonb(p.photos),
        'takesOrders', p.takes_orders, 'sort', p.sort, 'createdAt', p.created_at,
        'variants', coalesce((
          select jsonb_agg(jsonb_build_object('size', v.size, 'stock', case when v.stock <= 3 then to_jsonb(v.stock) else to_jsonb('ok'::text) end, 'price', v.price)
                           order by v.sort, v.size)
          from shop_variants v where v.product_id = p.id), '[]'::jsonb)
      ) order by p.sort, p.name, p.color_name)
      from shop_products p where p.active
    ), '[]'::jsonb) else '[]'::jsonb end
  )
$$;

-- FreeRide's catalog with "Para tu caballo" when it has 4 or more products.
create or replace function public_fre_catalog(p jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_set club_settings; v_off int := greatest(0, coalesce(nullif(p ->> 'offset', '')::int, 0));
  v_lim int := least(60, greatest(1, coalesce(nullif(p ->> 'limit', '')::int, 24)));
  v_cat text := nullif(p ->> 'category', ''); v_size text := nullif(p ->> 'size', ''); v_color text := lower(nullif(p ->> 'color', ''));
  v_kids text := nullif(p ->> 'kids', ''); v_handle text := nullif(p ->> 'handle', ''); v_out jsonb; v_horse boolean;
begin
  select * into v_set from club_settings where id = 1;
  if not coalesce(v_set.module_shop, true) then return jsonb_build_object('total', 0, 'items', '[]'::jsonb); end if;
  -- "Para tu caballo" is its own tab only with 4 or more products; otherwise they show under Accesorios.
  select count(*) >= 4 into v_horse from fre_catalog c
  where c.active and not c.hidden and c.category = 'horse' and not (c.type = any (coalesce(v_set.fre_hidden_types, '{}')));
  with base0 as (
    select * from fre_catalog c where c.active and not c.hidden and not (c.type = any (coalesce(v_set.fre_hidden_types, '{}')))
  ), base as (
    select handle, title, type, kids, colors, sizes, variants, price_usd, compare_usd, images, url, position,
           case when category = 'horse' and not v_horse then 'accessories' else category end as category
    from base0
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

-- Orders: FreeRide pieces only from the panel (a wish list turned into an order); the website and the app send lists.
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
      if not is_admin() then return json_build_object('ok', false, 'code', 'wishOnly'); end if; -- FreeRide pieces go through a wish list
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
