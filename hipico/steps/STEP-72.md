# STEP-72: Tienda FreeRide (website + app + panel)

Ivana (17 Oct): Mara sells FreeRide Equestrian clothing through posts in the WhatsApp group "FreeRide Equestrian – Riviera Maya" (a photo, a price, the sizes left, "escríbeme"). Build a real shop instead: categories, products with photos, sizes, prices with stickers, a cart and the same three payment methods as the website. Families see it in the app too, and Mara runs it from the panel. The goal is to show Mara that selling here is easier than selling in the group.

## Words (house rules: no English in the UI except brand and product names)
- Nav and app: **Tienda** (EN **Shop**). Page title: "FreeRide Equestrian en Riviera Maya" (brand = proper noun, OK).
- Categories: **Pantalones de montar · Camisas · Accesorios** (EN Breeches · Shirts · Accessories). Not "Breeches" in Spanish.
- FRE's real product name is **Celestial Lux** (Mara wrote "Celestia"): use Celestial Lux.
- Stickers: **Precio inauguración** (mustard), **Promo** (terracotta), **Nuevo** (slate), **Últimas piezas** (plum, auto when total stock ≤ 2), **Agotado** (grey, auto when every size is 0 and the product doesn't take orders).

## Data (`supabase/migrations/20261021_shop.sql`, safe to run twice)
- `shop_products`: `id`, `slug` unique, `model` (groups colors: "celestial-lux"), `category` (`pants|shirts|accessories`), `name`, `color_name`, `color_hex`, `description_es/en`, `features jsonb` (✓ lines, es/en), `price` (list price, MXN), `promo_price` (nullable), `sticker` (`none|inauguracion|promo|nuevo`), `photos text[]` (first = main), `takes_orders bool` (sizes at 0 can still be ordered: "Bajo pedido"), `active bool`, `sort int`, timestamps.
- `shop_variants`: `id`, `product_id`, `size` (XXS…XXXL, kids "10", "12"…), `stock int`, `price` (nullable override, e.g. kids sizes cheaper), `sort`.
- `shop_orders`: `id`, `number` (serial, shown as "#1024"), `family_id`, `name`, `phone`, `email`, `items jsonb` (product, color, size, qty, unit price, `on_order`), `total`, `status` (`nuevo|apartado|pagado|pedido_a_fre|listo|entregado|cancelado`), `note`, `created_at`.
- Payments reuse `payments`: add `'shop'` to the `service` check. One charge per order (`meta.order`, `meta.kind = 'shop'`); if any line is "bajo pedido", the charge is **50% of those lines + 100% of the in-stock lines**, and the balance becomes a second charge when Mara marks the order "Listo" (`meta.kind = 'shop_balance'`). So Cobros, Por revisar, reminders, `PayDialog`, Mercado Pago and "Ya pagué en el club" all work with no new payment code.
- Functions:
  - `public_shop()` (anon): active products + variants (stock as a number only when ≤ 3, else `"ok"`), for the website and the app.
  - `shop_order(jsonb)` (anon, the `web_enroll` pattern: same rate limit, family found by email or created as `self_signup`, no rider needed): checks every line against stock **in one transaction** (code `out_of_stock` with the line), takes the stock, creates the order + the charge, returns `{ order, number, payment_id, amount }`.
  - `admin_shop_*` (management only): save product, variants, photos order, set order status (cancel returns the stock and drops an unpaid charge), mark delivered.
  - Storage: public bucket `shop-photos` (management writes).
- The migration ends with the usual re-grants (`public_site`, `send_contact_message`, `web_enroll`, `submit_web_receipt`, `web_receipt_folder_ok`, `web_pay_at_club`, `promote_demo`) **plus** `public_shop()` and `shop_order(jsonb)`.
- `club_settings.module_shop` (on by default, live and demo). Off = no nav item, no app tile, `/tienda` → `/`.
- `demo.js` mirrors all of it (seed `version: 7`).

## Seed (demo and live, from Mara's posts; all MXN)
| Product | Color | Sizes in stock | List | Inauguración |
|---|---|---|---|---|
| Camisa Cassidy manga larga | Frambuesa | XS · S · M (takes orders in every size) | 1,700 | 1,450 |
| Pantalón Celestial Lux | Arena | XS · S · M | 2,250 | 1,950 |
| Pantalón Celestial Lux | Verde bosque (Hunter Green) | XXS · XS · S · M | 2,250 | 1,950 |
| Pantalón Celestial Lux | Azul marino | XS · M | 2,250 | 1,950 |
| Pantalón Celestial Lux | Blanco | XXS · XS · M | 2,250 | 1,950 |
| Pantalón Celestial Lux | Azul acero (Mara's second "Navy", lighter in the photo) | XXS · XS · M | 2,250 | 1,950 |
| Pantalón Celestial Lux | Merlot | XS · M | 2,250 | 1,950 |
- Stock = 1 per listed size (Mara corrects it in the panel). Sticker: Precio inauguración on all.
- Arena's description adds Mara's line: "Tela muy fresca; color permitido los sábados en los concursos de CESQROO."
- Features (from shopfre.com): pants "Tela de cuatro vías, no transparente · Agarre de silicón (asiento completo) · Tiro medio con presillas para cinturón · Dos bolsas para celular · 72% poliéster, 28% spandex"; shirt "Tela técnica que seca rápido · Cuello blanco en contraste · Media cremallera al frente · Puños con broche de perla · 83% nylon, 17% spandex".
- Kids sizes of the shirt: "Tallas de niña (hasta 12–13) con precio menor": leave as a takes-orders note until Mara gives the price.

## Photos
- Files: `public/img/shop/<slug>-1.webp` … (4:5, 1200 px tall, WebP ~80). The slug is `celestial-lux-arena`, `cassidy-frambuesa`, etc.
- Source pages (FreeRide's own photos; Mara is their seller here):
  - Celestial Lux Sand: https://shopfre.com/collections/lux-breeches-2/products/celestial-lux-breeches-sand
  - Celestial Lux White: https://shopfre.com/collections/lux-breeches-2/products/celestial-lux-breeches-white
  - Celestial Lux Navy: https://shopfre.com/collections/lux-breeches-2/products/celestial-lux-hybrid-breeches-full-seat-navy
  - Lux collection (Hunter Green, Merlot, the blue): https://shopfre.com/collections/lux-breeches-2 ("Load more")
  - Cassidy Show Shirt (pick Raspberry): https://shopfre.com/collections/competition-tops/products/cassidy-show-shirt-peach
- If Claude Code can download from shopfre.com, it takes the product photos for each color from those pages. If not, use Mara's WhatsApp photos that Ivana drops into `public/img/shop/incoming/`, and otherwise a neutral placeholder (sand card with the pants/shirt pictogram) so nothing is broken. List which product still has a placeholder in the report.
- **Hero:** `public/img/shop/hero.webp`: a FreeRide lifestyle photo Ivana provides; until then the best wide product photo, cropped 16:7 with the focal point on the rider.

## Website: `/tienda` and `/en/shop` (`src/site/shop/`)
- **Nav:** "TIENDA" between "Familias" and "La app" (level 1 hover). When the cart has items, a bag icon with a mustard count appears after "Entrar" (level 1; opens the cart). Not part of the one-page scroll-spy: it's its own route in `SiteLayout` with the same bar and footer.
- **Hero** (about 420 px on a computer, 300 on phones): the photo full width with the olivewood → transparent gradient on the left, white text: eyebrow "TIENDA DEL CLUB", title "FreeRide Equestrian en Riviera Maya", one line "Ropa técnica para montar, con precio de inauguración. La recoges en el club.", one mustard button "Ver productos" (scrolls to the grid).
- **Categories:** segmented tabs (as in the Clases lightbox) **Todo · Pantalones de montar · Camisas · Accesorios**, with the count in each ("Camisas 1"). In the address (`?cat=camisas`). Empty category: an empty state (hanger pictogram, "Pronto llegan accesorios.", "¿Buscas algo? Escríbenos →" = the contact form prefilled "Me interesa: Tienda").
- **Grid:** 4 columns at 1440, 3 at 1024, 2 on phones. Card: photo 4:5 (second photo on hover on a computer, level 2 lift), sticker top-left, the name ("Pantalón Celestial Lux"), the color name + its swatches row (siblings of the same `model`, clicking a swatch swaps the card to that color), the price: promo large olivewood + list struck through in bark ("$1,950 ~~$2,250~~"), then "Tallas: XS · S · M" in small bark (sold-out sizes struck). One color per card, but the 6 Celestial Lux colors show as **one card per model** on "Todo" with swatches, and the color shown first is the one with the most stock.
- **Product lightbox** (`ProductSheet`, the `ServiceSheet` pattern: portaled, focus trap, Esc, URL `?p=<slug>` so it can be shared on WhatsApp):
  - left: the gallery (main photo + thumbnails, swipe on phones);
  - right: sticker, name, color name with swatches (switching updates the photos, sizes, price and URL), the price block (promo, list struck, a sage pill "Ahorras $300");
  - **Talla:** size pills (44 px), none preselected. In stock = normal; 1–2 left = "Quedan 2" under the pill; 0 and `takes_orders` = dashed pill "Bajo pedido" (choosing it shows the line "Llega en 2 a 3 semanas · anticipo del 50%"); 0 and no orders = disabled, struck;
  - "Guía de tallas" (level 1 link → FRE's breeches guide, new tab);
  - quantity stepper (1–stock, or up to 3 on order);
  - **Agregar al carrito** (the one mustard button; with no size it pulses the size pills, like "Elige cómo pagar"); after adding, the button reads "Agregado ✓" for 1.5 s and the cart opens;
  - the features as ✓ lines, then "Recoges en el club, en Paamul." and "¿Dudas? WhatsApp · Mensaje" (`InfoPills`).
- **Cart** (`CartDrawer`, right side panel 440 px on a computer, bottom sheet on phones): each line with its thumb, name, color · size, a qty stepper, the price and a remove link; "Bajo pedido" lines carry a small dashed tag. Summary: Subtotal, "Ahorras $X con precio de inauguración" (sage), and when there are order lines: "Hoy pagas $X (anticipo del 50% de lo que se pide)" + "Al llegar: $Y". Footer (the `EnrollFoot` pattern): total on the left, mustard **Pagar $X** on the right. Empty cart: pictogram + "Tu carrito está vacío" + "Ver productos". Stored in `localStorage` `hipico.cart` (wrapped in try/catch; works without it).
- **Checkout = one screen inside the drawer** (exactly the Enroll pay step): "← Volver al carrito", the floating-label fields (Nombre, Teléfono (WhatsApp), Correo "con él sigues tu pedido en la app"), then "¿Cómo quieres pagar?" **Tarjeta · Transferencia · En el club** (`MethodCards`, nothing preselected, footer "Elige cómo pagar"), the chosen part opens under them (card form / bank details + drop zone / "Pagas al recoger en el club; tu pedido queda apartado"). One press: check → `shop_order` → pay / upload / `web_pay_at_club` → "¡Listo, {nombre}! Tu pedido #1024 está apartado. Te avisamos por WhatsApp cuando esté listo para recoger." + "Abrir la app" (outline). A line out of stock at that moment: the error names it ("La talla M de Celestial Lux Arena se acaba de agotar") and the cart marks the line.
- **Pedido especial band** at the bottom of `/tienda` (sand card, 3 numbered steps): title "¿Quieres otro modelo, color o talla?", line "Pide cualquier producto del catálogo de FreeRide: 5% de descuento adicional (excepto promociones), envío e importación sin costo, anticipo del 50% y el resto al recibirlo." Steps: "1 Arma tu carrito en shopfre.com" · "2 Toma una captura del carrito" · "3 Envíala por WhatsApp y te mandamos tu precio". Buttons: "Ver catálogo de FreeRide" (outline, new tab) + "Enviar por WhatsApp" (sage glass, prefilled "Hola, quiero un pedido especial de FreeRide").
- **One-page link:** in Qué hacemos, the 4 colored boxes stay; add nothing else to the one-page. The nav item is the way in.
- SEO: title "Tienda FreeRide Equestrian · Hípico Riviera Maya", `Product` JSON-LD per product with the MXN price.

## App (families)
- Quick tile **Tienda** (plum `c-plum`, hanger pictogram) on Inicio and in Más; in the family desk sidebar after Eventos. Route `/familia/tienda` (and `/demo/familia/tienda`).
- Same grid, product sheet and cart (shared components from `src/site/shop/` with an `inApp` prop: app type scale, no hero; a slim plum band "Tienda FreeRide · precio de inauguración" instead).
- Checkout skips the fields (the family is known) and uses `PayDialog`'s three cards. The order shows in **Pagos** like any charge ("Tienda · pedido #1024") and in a small "Mis pedidos" list at the bottom of the shop (number, date, items, status pill: Apartado · Pagado · Pedido a FreeRide · Listo para recoger · Entregado).

## Panel (Dirección → Tienda)
- Sidebar item **Tienda** (after Mensajes, badge = new orders); on phones in Más; a Resumen tile "Pedidos nuevos" only when there are any.
- Tabs **Pedidos · Productos** (`DataTable`, side panel, CSV).
- **Pedidos:** filters Nuevos · En proceso · Listos · Entregados · Todos. Columns: #, date, buyer (two lines: name / phone), items ("Celestial Lux Arena · S"), total, payment pill (Pagado / Por revisar / Pendiente / Paga en el club), status. Side panel: the lines, buyer with WhatsApp (`waTo`, prefilled "Hola {nombre}, tu pedido #1024 …"), the charge with "Ver en Cobros", and the status as one button for the next step: Marcar pedido a FreeRide (only with order lines) → Marcar listo para recoger (creates the balance charge if any, and sends the family a WhatsApp/email "ya está listo") → Marcar entregado. "Cancelar pedido" as a text link (confirm; returns the stock).
- **Productos:** columns: photo (48 px), name + color (two lines), category, price (promo + list struck), sticker pill, stock ("XS 1 · S 0 · M 2", zeros in terracotta), Activo toggle. Top bar: **+ Nuevo producto** (main) and Exportar. Side panel editor (`EditKit`: `useFormState`, `SaveBar`, discard guard):
  - Datos: Nombre, Modelo (pick an existing model or new; this links the colors), Color (name + swatch picker), Categoría, Descripción ES/EN, Características (one per line);
  - Precio: Precio de lista, Precio con descuento (empty = none), Etiqueta (Ninguna · Precio inauguración · Promo · Nuevo) with a live preview of the card;
  - Tallas: rows Talla · Piezas · Precio especial (optional), "+ Agregar talla", quick-add chips XXS…XXL and Niña 8 · 10 · 12; "Se puede pedir en tallas agotadas" toggle;
  - Fotos: drop zone (several at once, resized in the browser to 1200 px WebP before upload), drag to reorder, first = main, delete;
  - "Duplicar en otro color" (copies everything except color, photos and stock): this is how Mara adds a new color in 30 seconds.
- Cobros: the concept "Tienda" in the concept pills; charges read "Tienda · pedido #1024" / "{nombre}".

## Also
- i18n: every string in `es.json` / `en.json`.
- Hovers on the three levels, `npm run check:hover` and the edge check (STEP-71) cover `/tienda`, the product sheet, the cart, the app shop and the panel tabs.
- `hipico/CLAUDE.md`: add the shop to Status and the migration to the list.

## Check
- `/tienda` at 1440×900 and 390×844, ES and EN: hero, tabs, the grid with real photos or placeholders, swatches swap colors.
- Buy in `/demo` data: Arena S + Cassidy M bajo pedido → cart shows "Hoy pagas" (Arena + 50% of Cassidy) → Transferencia with a receipt → the order is in Dirección → Tienda → Pedidos as Nuevo, the charge in Cobros → Por revisar, Arena S stock went 1 → 0 and the card shows S struck.
- Same with En el club and Tarjeta (simulated). Cancel an order: the stock returns.
- As a family in the demo: Inicio → Tienda → buy → it shows in Pagos and in Mis pedidos.
- Panel: add a product with "Duplicar en otro color", upload 2 photos, reorder, set Promo; it shows on `/tienda` with the sticker.
- Screenshots of each of these in the report, plus the list of products still on placeholder photos.
