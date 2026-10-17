-- The products' own photos (cut out on white, 960×1200), only where a product still has none: photos Mara uploads
-- in the panel are never overwritten. Safe to run twice.
update shop_products p set photos = x.photos, updated_at = now()
from (values
  ('cassidy-frambuesa', array['/img/shop/cassidy-frambuesa-1.webp', '/img/shop/cassidy-frambuesa-2.webp']),
  ('celestial-lux-arena', array['/img/shop/celestial-lux-arena-1.webp', '/img/shop/celestial-lux-arena-2.webp']),
  ('celestial-lux-blanco', array['/img/shop/celestial-lux-blanco-1.webp']),
  ('celestial-lux-azul-acero', array['/img/shop/celestial-lux-azul-acero-1.webp', '/img/shop/celestial-lux-azul-acero-2.webp']),
  ('celestial-lux-azul-marino', array['/img/shop/celestial-lux-azul-marino-1.webp', '/img/shop/celestial-lux-azul-marino-2.webp']),
  ('celestial-lux-verde-bosque', array['/img/shop/celestial-lux-verde-bosque-1.webp', '/img/shop/celestial-lux-verde-bosque-2.webp']),
  ('celestial-lux-merlot', array['/img/shop/celestial-lux-merlot-1.webp', '/img/shop/celestial-lux-merlot-2.webp'])
) as x(slug, photos)
where p.slug = x.slug and coalesce(cardinality(p.photos), 0) = 0;
