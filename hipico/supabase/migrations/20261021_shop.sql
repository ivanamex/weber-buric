-- Tienda: FreeRide Equestrian clothing sold by the club. Products (one row per color, grouped by model), sizes with
-- stock, orders, and one charge per order in `payments` (service 'shop'), so Cobros, Por revisar, reminders, the
-- payment window, Mercado Pago and "Ya pagué en el club" work as for any charge. Lines in a size at 0 of a product
-- that takes orders are "bajo pedido": the order's charge is 50 % of those lines plus the in-stock lines, and the
-- balance becomes a second charge when the club marks the order ready. Safe to run twice.

alter table club_settings add column if not exists module_shop boolean not null default true;

create table if not exists shop_products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  model          text not null,
  category       text not null default 'pants' check (category in ('pants', 'shirts', 'accessories')),
  name           text not null,
  color_name     text not null default '',
  color_hex      text not null default '#D5C7AD',
  description_es text not null default '',
  description_en text not null default '',
  features       jsonb not null default '{"es": [], "en": []}'::jsonb,
  price          integer not null check (price >= 0),
  promo_price    integer check (promo_price is null or promo_price >= 0),
  sticker        text not null default 'none' check (sticker in ('none', 'inauguracion', 'promo', 'nuevo')),
  photos         text[] not null default '{}',
  takes_orders   boolean not null default false,
  active         boolean not null default true,
  sort           integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists shop_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references shop_products (id) on delete cascade,
  size       text not null,
  stock      integer not null default 0 check (stock >= 0),
  price      integer check (price is null or price >= 0),
  sort       integer not null default 0,
  unique (product_id, size)
);

create sequence if not exists shop_order_number start 1024;
create table if not exists shop_orders (
  id         uuid primary key default gen_random_uuid(),
  number     integer not null unique default nextval('shop_order_number'),
  family_id  uuid references families (id) on delete set null,
  name       text not null,
  phone      text,
  email      text,
  items      jsonb not null default '[]'::jsonb,
  total      integer not null default 0,
  status     text not null default 'nuevo' check (status in ('nuevo', 'apartado', 'pagado', 'pedido_a_fre', 'listo', 'entregado', 'cancelado')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_orders_created_idx on shop_orders (created_at desc);
create index if not exists shop_orders_family_idx on shop_orders (family_id);

-- Management reads and writes everything; a family reads its own orders; the catalog is read through public_shop().
alter table shop_products enable row level security;
alter table shop_variants enable row level security;
alter table shop_orders enable row level security;
drop policy if exists admin_all on shop_products;
create policy admin_all on shop_products for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_all on shop_variants;
create policy admin_all on shop_variants for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_all on shop_orders;
create policy admin_all on shop_orders for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists family_read on shop_orders;
create policy family_read on shop_orders for select to authenticated using (family_id = my_family_id());
grant select, insert, update, delete on shop_products, shop_variants to authenticated;
grant select, update on shop_orders to authenticated;

-- Charges for the shop.
alter table payments drop constraint if exists payments_service_check;
alter table payments add constraint payments_service_check
  check (service in ('plan', 'boarding', 'camp', 'rental', 'events', 'class', 'shop'));

-- Product photos: a public bucket, management writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-photos', 'shop-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists shop_photos_read on storage.objects;
create policy shop_photos_read on storage.objects for select to anon, authenticated using (bucket_id = 'shop-photos');
drop policy if exists shop_photos_admin on storage.objects;
create policy shop_photos_admin on storage.objects for all to authenticated
using (bucket_id = 'shop-photos' and public.is_admin()) with check (bucket_id = 'shop-photos' and public.is_admin());

-- ───────── The catalog for the website and the app (nothing personal; stock only as a number when 3 or fewer) ─────────
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
        'takesOrders', p.takes_orders, 'sort', p.sort,
        'variants', coalesce((
          select jsonb_agg(jsonb_build_object('size', v.size, 'stock', case when v.stock <= 3 then to_jsonb(v.stock) else to_jsonb('ok'::text) end, 'price', v.price)
                           order by v.sort, v.size)
          from shop_variants v where v.product_id = p.id), '[]'::jsonb)
      ) order by p.sort, p.name, p.color_name)
      from shop_products p where p.active
    ), '[]'::jsonb) else '[]'::jsonb end
  )
$$;

-- ───────── Placing an order: the website (anyone) or the app (the signed-in family) ─────────
-- p: { items: [{ product: <id or slug>, size, qty }], name, phone, email, lang, website, ip }
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
  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_qty := coalesce(nullif(v_item ->> 'qty', '')::int, 1);
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

-- A charge paid (receipt approved, card, marked paid): plans get their classes, a shop order becomes "pagado".
create or replace function apply_plan_payment(v_p payments) returns void
language plpgsql security definer set search_path = public as $$
begin
  if v_p.service = 'shop' then
    if v_p.meta ->> 'kind' = 'shop' then
      update shop_orders set status = 'pagado', updated_at = now()
      where id::text = v_p.meta ->> 'order' and status in ('nuevo', 'apartado');
    end if;
    return;
  end if;
  if v_p.service <> 'plan' then return; end if;
  if v_p.meta ->> 'kind' = 'upgrade' then
    update plans set total = greatest(total, (v_p.meta ->> 'classes')::int)
    where rider_id = (v_p.meta ->> 'riderId')::uuid and month = v_p.meta ->> 'month';
  else
    update plans set paid = true where rider_id = (v_p.meta ->> 'riderId')::uuid and month = v_p.meta ->> 'month';
  end if;
end $$;

-- ───────── Management ─────────
-- p: { id?, slug?, model, category, name, colorName, colorHex, descriptionEs, descriptionEn, features: { es: [], en: [] },
--      price, promoPrice, sticker, photos: [], takesOrders, active, sort, variants: [{ size, stock, price }] }
create or replace function admin_shop_save_product(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_slug text; v_v jsonb; v_i int := 0; v_sizes text[] := '{}';
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if btrim(coalesce(p ->> 'name', '')) = '' or coalesce(nullif(p ->> 'price', '')::int, -1) < 0 then
    return json_build_object('ok', false, 'code', 'missing');
  end if;
  v_id := nullif(p ->> 'id', '')::uuid;
  v_slug := coalesce(
    trim(both '-' from regexp_replace(lower(translate(coalesce(p ->> 'model', p ->> 'name') || '-' || coalesce(p ->> 'colorName', ''),
      'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')), '[^a-z0-9]+', '-', 'g')), 'producto');
  if exists (select 1 from shop_products where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end if;
  if v_id is null then
    insert into shop_products (slug, model, category, name, price) values (v_slug, 'x', 'pants', 'x', 0) returning id into v_id;
  elsif not exists (select 1 from shop_products where id = v_id) then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  update shop_products set
    model = coalesce(nullif(btrim(p ->> 'model'), ''), case when model = 'x' then v_slug else model end),
    category = coalesce(nullif(p ->> 'category', ''), 'pants'),
    name = btrim(p ->> 'name'),
    color_name = btrim(coalesce(p ->> 'colorName', '')),
    color_hex = coalesce(nullif(p ->> 'colorHex', ''), '#D5C7AD'),
    description_es = coalesce(p ->> 'descriptionEs', ''),
    description_en = coalesce(p ->> 'descriptionEn', ''),
    features = coalesce(p -> 'features', '{"es": [], "en": []}'::jsonb),
    price = (p ->> 'price')::int,
    promo_price = nullif(p ->> 'promoPrice', '')::int,
    sticker = coalesce(nullif(p ->> 'sticker', ''), 'none'),
    photos = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'photos', '[]'::jsonb)) x), '{}'),
    takes_orders = coalesce((p ->> 'takesOrders')::boolean, false),
    active = coalesce((p ->> 'active')::boolean, true),
    sort = coalesce(nullif(p ->> 'sort', '')::int, sort),
    updated_at = now()
  where id = v_id;
  if jsonb_typeof(p -> 'variants') = 'array' then
    for v_v in select * from jsonb_array_elements(p -> 'variants') loop
      continue when btrim(coalesce(v_v ->> 'size', '')) = '';
      v_i := v_i + 1;
      v_sizes := v_sizes || btrim(v_v ->> 'size');
      insert into shop_variants (product_id, size, stock, price, sort)
      values (v_id, btrim(v_v ->> 'size'), greatest(0, coalesce(nullif(v_v ->> 'stock', '')::int, 0)), nullif(v_v ->> 'price', '')::int, v_i)
      on conflict (product_id, size) do update set stock = excluded.stock, price = excluded.price, sort = excluded.sort;
    end loop;
    delete from shop_variants where product_id = v_id and not (size = any (v_sizes));
  end if;
  return json_build_object('ok', true, 'id', v_id, 'slug', (select slug from shop_products where id = v_id));
end $$;

-- The order's next step. Cancelling returns the in-stock pieces and drops the charges not paid yet; "listo" adds
-- the balance of the pieces ordered from FreeRide as a second charge.
create or replace function admin_shop_set_status(p_order uuid, p_status text) returns json
language plpgsql security definer set search_path = public as $$
declare v_o shop_orders; v_l jsonb; v_charged int; v_balance int; v_pay uuid;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_status not in ('nuevo', 'apartado', 'pagado', 'pedido_a_fre', 'listo', 'entregado', 'cancelado') then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  select * into v_o from shop_orders where id = p_order for update;
  if v_o.id is null or v_o.status = 'cancelado' then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_status = 'cancelado' then
    if v_o.status = 'entregado' then return json_build_object('ok', false, 'code', 'notFound'); end if;
    for v_l in select * from jsonb_array_elements(v_o.items) loop
      if not coalesce((v_l ->> 'onOrder')::boolean, false) then
        update shop_variants set stock = stock + coalesce((v_l ->> 'qty')::int, 1)
        where product_id = (v_l ->> 'productId')::uuid and size = v_l ->> 'size';
      end if;
    end loop;
    delete from payments where service = 'shop' and meta ->> 'order' = v_o.id::text and status = 'pending';
  elsif p_status = 'listo' then
    select coalesce(sum(amount), 0) into v_charged from payments where service = 'shop' and meta ->> 'order' = v_o.id::text;
    v_balance := v_o.total - v_charged;
    if v_balance > 0 and v_o.family_id is not null then
      insert into payments (family_id, service, amount, due_on, meta)
      values (v_o.family_id, 'shop', v_balance, club_now()::date,
              jsonb_build_object('order', v_o.id, 'number', v_o.number, 'kind', 'shop_balance'))
      returning id into v_pay;
    end if;
  end if;
  update shop_orders set status = p_status, updated_at = now() where id = p_order;
  return json_build_object('ok', true, 'balance_payment', v_pay, 'balance', coalesce(v_balance, 0));
end $$;

-- ───────── What Mara posted in the WhatsApp group (stock 1 per listed size; she corrects it in the panel) ─────────
do $$
declare
  v_pants_es jsonb := '["Tela de cuatro vías, no transparente", "Agarre de silicón (asiento completo)", "Tiro medio con presillas para cinturón", "Dos bolsas para celular", "72% poliéster, 28% spandex"]';
  v_pants_en jsonb := '["Four-way stretch fabric, not see-through", "Full-seat silicone grip", "Mid rise with belt loops", "Two phone pockets", "72% polyester, 28% spandex"]';
  v_desc_es text := 'Pantalón de montar Celestial Lux de FreeRide Equestrian: ajuste cómodo, agarre de silicón en todo el asiento y una tela que no se transparenta.';
  v_desc_en text := 'FreeRide Equestrian Celestial Lux breeches: a comfortable fit, full-seat silicone grip and fabric that is not see-through.';
  r record; v_id uuid; v_s text; v_i int;
begin
  for r in select * from (values
    ('celestial-lux-arena', 'Arena', '#D8C3A0', array['XS', 'S', 'M'], 1,
     ' Tela muy fresca; color permitido los sábados en los concursos de CESQROO.', ' A very cool fabric; a color allowed on Saturdays at CESQROO shows.'),
    ('celestial-lux-verde-bosque', 'Verde bosque', '#2F4A3A', array['XXS', 'XS', 'S', 'M'], 2, '', ''),
    ('celestial-lux-azul-marino', 'Azul marino', '#1F2A44', array['XS', 'M'], 3, '', ''),
    ('celestial-lux-blanco', 'Blanco', '#F4F1EA', array['XXS', 'XS', 'M'], 4, '', ''),
    ('celestial-lux-azul-acero', 'Azul acero', '#3E5873', array['XXS', 'XS', 'M'], 5, '', ''),
    ('celestial-lux-merlot', 'Merlot', '#6B2737', array['XS', 'M'], 6, '', '')
  ) as t(slug, color, hex, sizes, sort, extra_es, extra_en) loop
    continue when exists (select 1 from shop_products where slug = r.slug);
    insert into shop_products (slug, model, category, name, color_name, color_hex, description_es, description_en, features, price, promo_price, sticker, takes_orders, sort)
    values (r.slug, 'celestial-lux', 'pants', 'Pantalón Celestial Lux', r.color, r.hex, v_desc_es || r.extra_es, v_desc_en || r.extra_en,
            jsonb_build_object('es', v_pants_es, 'en', v_pants_en), 2250, 1950, 'inauguracion', false, 10 + r.sort)
    returning id into v_id;
    v_i := 0;
    foreach v_s in array r.sizes loop
      v_i := v_i + 1;
      insert into shop_variants (product_id, size, stock, sort) values (v_id, v_s, 1, v_i) on conflict do nothing;
    end loop;
  end loop;
  if not exists (select 1 from shop_products where slug = 'cassidy-frambuesa') then
    insert into shop_products (slug, model, category, name, color_name, color_hex, description_es, description_en, features, price, promo_price, sticker, takes_orders, sort)
    values ('cassidy-frambuesa', 'cassidy', 'shirts', 'Camisa Cassidy manga larga', 'Frambuesa', '#B3385E',
      'Camisa de concurso Cassidy de FreeRide Equestrian, de manga larga. También en tallas de niña (hasta 12–13) con precio menor: pídela y te confirmamos el precio.',
      'FreeRide Equestrian Cassidy long-sleeve show shirt. Also in girls'' sizes (up to 12–13) at a lower price: order it and we confirm the price.',
      jsonb_build_object(
        'es', '["Tela técnica que seca rápido", "Cuello blanco en contraste", "Media cremallera al frente", "Puños con broche de perla", "83% nylon, 17% spandex"]'::jsonb,
        'en', '["Quick-dry technical fabric", "Contrast white collar", "Front half zip", "Pearl snap cuffs", "83% nylon, 17% spandex"]'::jsonb),
      1700, 1450, 'inauguracion', true, 1)
    returning id into v_id;
    insert into shop_variants (product_id, size, stock, sort) values
      (v_id, 'XXS', 0, 1), (v_id, 'XS', 1, 2), (v_id, 'S', 1, 3), (v_id, 'M', 1, 4), (v_id, 'L', 0, 5), (v_id, 'XL', 0, 6), (v_id, 'XXL', 0, 7)
    on conflict do nothing;
  end if;
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
