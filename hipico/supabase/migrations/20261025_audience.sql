-- "Para quién" in the shop: every product says who it's for (women | men | kids | all). FreeRide's copy works it out
-- (api/_fre.js) and management can correct one product (audience_override, never undone by the daily copy); Mara's
-- own products get the field in the editor. The catalog filters by it, by several sizes and several colors, and gives
-- the sizes and colors of the current tab for the menus. Safe to run twice.

alter table fre_catalog add column if not exists audience text not null default 'women';
alter table fre_catalog drop constraint if exists fre_catalog_audience_check;
alter table fre_catalog add constraint fre_catalog_audience_check check (audience in ('women', 'men', 'kids', 'all'));
alter table fre_catalog add column if not exists audience_override text;
alter table fre_catalog drop constraint if exists fre_catalog_audience_override_check;
alter table fre_catalog add constraint fre_catalog_audience_override_check check (audience_override is null or audience_override in ('women', 'men', 'kids', 'all'));
alter table fre_catalog add column if not exists size_keys text[] not null default '{}'; -- available sizes, normalized ("34 (S)" → S)

alter table shop_products add column if not exists audience text not null default 'women';
alter table shop_products drop constraint if exists shop_products_audience_check;
alter table shop_products add constraint shop_products_audience_check check (audience in ('women', 'men', 'kids', 'all'));

-- Mara's products: who they're for.
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
        'takesOrders', p.takes_orders, 'sort', p.sort, 'createdAt', p.created_at, 'audience', p.audience,
        'variants', coalesce((
          select jsonb_agg(jsonb_build_object('size', v.size, 'stock', case when v.stock <= 3 then to_jsonb(v.stock) else to_jsonb('ok'::text) end, 'price', v.price)
                           order by v.sort, v.size)
          from shop_variants v where v.product_id = p.id), '[]'::jsonb)
      ) order by p.sort, p.name, p.color_name)
      from shop_products p where p.active
    ), '[]'::jsonb) else '[]'::jsonb end
  )
$$;

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
    audience = case when p ->> 'audience' in ('women', 'men', 'kids', 'all') then p ->> 'audience' else audience end,
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

-- FreeRide's catalog for the website and the app, a page at a time.
-- p: { offset, limit, category, audience (women|men|kids), sizes: [..], colors: [..], handle }
-- An item for "all" shows under every audience. The size menu lists the sizes of the tab for that audience (the kids'
-- sizes only under kids); the color menu the colors of the tab for that audience.
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
    select handle, title, type, colors, sizes, size_keys, variants, price_usd, compare_usd, images, url, position,
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
        'variants', f.variants, 'priceUsd', f.price_usd, 'compareUsd', f.compare_usd, 'images', to_jsonb(f.images[1:6]), 'url', f.url,
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
