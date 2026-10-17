# STEP-74: shop round 2: the freeze, real photos, the whole FreeRide catalog

Ivana (17 Oct, iPhone, live `/tienda`). Do the freeze first, push it, then the rest.

## 1. Bug: the page freezes after "Agregar al carrito" (iPhone Safari)
After adding a product, the bag shows "1", but the page can't be scrolled or tapped. Only a mustard strip shows at the very bottom of the screen. Probably the cart sheet opened and locked the page scroll, but it's stuck below the screen (its transform/transition never ran, or it's inside a transformed parent; `.page` / `.site` must not be its parent → portal it to `body` like the lightboxes).
- Fix it so the cart **slides up fully** on iPhone and Android: portaled to `body`, `position: fixed; inset: auto 0 0 0`, `max-height: 92dvh`, its own scroll, a backdrop that closes it, and the footer with `env(safe-area-inset-bottom)`.
- The scroll lock must always be released: on close, on route change, on Esc, and when the component unmounts. Use one shared lock helper (the same one the lightboxes use) with a counter, so two sheets never leave the page locked.
- Product window → Agregar → the product window closes first, then the cart opens (never two sheets on top of each other on phones).
- Check at 390×844 with iPhone emulation (touch, `isMobile`), WebKit if available: add, close the cart, scroll the page, open it from the bag, empty it, add again. Also check the checkout inside the cart and that the keyboard doesn't hide the fields.

## 2. Real product photos on white
Chat Claude cut Mara's WhatsApp photos out and put them on white: `public/img/shop/` (960×1200, 4:5, white, a soft floor shadow).
- `celestial-lux-arena-1/2`, `celestial-lux-blanco-1`, `celestial-lux-azul-acero-1/2`, `celestial-lux-azul-marino-1/2`, `celestial-lux-verde-bosque-1/2`, `celestial-lux-merlot-1/2`, `cassidy-frambuesa-1/2` (the shirt stays as a photo; the cut-out removed the shirt itself).
- Seed (`shopSeed.js`, demo `version: 8`) and a migration `20261022_shop_photos.sql` that sets `photos` **only where it's still empty** (so Mara's uploads are never overwritten).
- Cards and the product window: photo area on **pure white `#FFFFFF`** with `object-fit: contain` (the whole product visible, never cropped), card body warm white below a hairline. The second photo on hover on a computer. Uploaded photos (panel) get the same white box.

## 3. The whole FreeRide catalog, so people never need to go to shopfre.com
FreeRide's store runs on Shopify, so its full catalog is public as JSON: `https://shopfre.com/products.json?limit=250&page=N` (title, handle, product_type, tags, variants with size/color options, `available`, USD price, images). Read it on the server, never from the browser.
- **Sync:** `api/fre-sync.js`, a Vercel cron once a day (`0 12 * * *`) and a **Actualizar catálogo** button in Dirección → Tienda → Catálogo FreeRide. Pages through `products.json` until empty, upserts into `fre_catalog` (`handle` unique, `title`, `type`, `tags`, `colors`, `sizes`, `variants jsonb` with available per size/color, `price_usd`, `compare_usd`, `images text[]` (FRE's CDN URLs, `?width=800` for cards), `url`, `updated_at`, `active`). Products that disappear from FRE are marked inactive, not deleted. If FRE answers with an error, keep yesterday's catalog and log the error (shown in the panel: "Última actualización: hoy 6:00 · 214 productos" or the error).
- **Price in pesos:** `club_settings.fre_mxn_factor` (default **23.7**, which is Mara's own: Celestial Lux $95 USD → $2,250) and `fre_discount` (default **5%**, her "descuento adicional"). Shown price = USD × factor, rounded up to the next $50; then her 5% off shown as the sale price with a "−5%" sticker. FRE items that are already on sale at FRE (`compare_at_price`) get no extra 5% (her rule: "excepto promociones"). Both numbers editable in the panel, with a live example line ("Celestial Lux: $95 USD → $2,250 · con 5%: $2,150").
- **Categories:** map FRE's `product_type` / tags to ours: pants (breeches, leggings), shirts (show shirts, tops, sun shirts), and a new **Chamarras** tab (jackets, vests, outerwear). Accessories (belts, socks, gloves, hats, bras) go to Accesorios. Kids items get a "Niña" / "Niño" filter chip. Anything we can't map → Accesorios, and the panel lists it.
- **On the shop page:** Mara's own stock first ("Entrega inmediata en el club"), then **"Todo FreeRide · sobre pedido"** with the same cards (FRE photos on white, `contain`), the same tabs and a **"Ver más"** button that loads 24 at a time (and loads by itself when you reach the bottom). A small filter row: Talla (XXS…XXL) · Color, searching both lists. Product window for a FRE item: FRE's photos, its colors and sizes (unavailable at FRE = struck), price as above, and the line "Sobre pedido · llega en 2 a 3 semanas · anticipo del 50%, el resto al recibirlo · envío e importación incluidos". Agregar al carrito works the same; these lines are "bajo pedido" (50% today).
- An order with FRE lines appears in Pedidos with a **"Pedir a FreeRide"** list for Mara: product, color, size, quantity and the FRE link, plus "Copiar lista" so she can place it on shopfre.com in one go.
- Mara can hide any FRE product or a whole type from the panel (Catálogo FreeRide tab: search, Mostrar/Ocultar switch, the factor and discount, Actualizar catálogo).
- If the sync has never run (or the table is empty), the "Todo FreeRide" part simply doesn't show.

## 4. The "Pedido especial" box goes down and gets small
With the whole catalog in the shop, the instructions box is no longer the way to order. Replace it with one quiet line at the very bottom of the page (above the footer, bark text, no card): "¿No encuentras algo? Escríbenos por WhatsApp y lo pedimos por ti." with the WhatsApp link (level 1). No steps, no shopfre.com button, nothing that sends people to FreeRide's website. The same in the app.

## 5. Nav bar: Tienda stands out, the language becomes a small menu
Ivana: Tienda should be emphasized in the bar, and the ES/EN switch takes too much room.
- **Order on a computer:** QUÉ HACEMOS · COMPETENCIAS · EQUINOTERAPIA · PENSIÓN · FAMILIAS · LA APP · VISÍTANOS · **TIENDA** · | · ES ▾ · ENTRAR · [App del club]. Tienda is the last link, after Visítanos, and a thin 1 px divider (white 30 % over the video, sand on parchment) separates the site's sections from Tienda + the rest.
- **How Tienda stands out (without being a second button):** a bag pictogram (18 px) before the word, the word in light mustard `#E9C27A` over the video and dark bar and deep mustard `#866114` on parchment (both AA), and a small "Nuevo" tag (mustard fill, olivewood text, 10 px caps) on its top-right corner for the first weeks (`SHOP_NEW_UNTIL` in `content.js`, 30 Nov 2026). Hover stays level 1 (the underline). "App del club" stays the only button in the bar.
- **The cart count lives on Tienda's bag:** once the cart has pieces, a mustard dot with the number sits on the bag pictogram, and the separate bag button after ENTRAR goes away. A tap on Tienda goes to `/tienda`; the cart opens from the page (and from `/tienda?carrito=1`).
- On `/tienda` itself, Tienda carries the active underline like a section.
- **Language as a small menu:** "ES ▾" (Archivo caps, 14 px, level 1 hover). It opens a small card under it: "Español" / "English", the current one with a check; Esc or a click outside closes it; arrow keys move; it keeps the section like the switch did (View Transitions). About 48 px wide instead of the switch.
- **Phones:** the bar keeps the logo, the bag with its count (only when the cart has pieces), App del club and the menu. In the bottom-sheet menu Tienda is the first item (bag icon, mustard, "Nuevo"), and the language is one row at the bottom: "Idioma: Español ▾".
- Check at 1280, 1440 and 1920 px that the bar fits on one line in both states (over the video and after scrolling) in ES and EN; at 1280 the links can tighten their gaps, never wrap. Screenshots in the report.

## Notes
- Ask nothing of Mara in the UI; the factor and discount defaults are her own numbers from the WhatsApp posts.
- `hipico/CLAUDE.md`: add the catalog sync, the table and the migration.
- Grants: `public_shop()` also returns the active FRE catalog (or a new anon `public_fre_catalog(page, filters)`, added to the re-grant list).

## Check
- The freeze: the iPhone sequence above works with no stuck page; screenshots of the open cart at 390×844.
- `/tienda`: Mara's 7 products with the white photos, then the FreeRide catalog loading 24 more with Ver más; filters by size and color; a FRE product added and checked out (50%).
- Panel: Actualizar catálogo fills the table (on the build server, which can reach shopfre.com; if this container can't reach it, test the parser with a saved sample of `products.json` and say so), hide one product, change the factor and see the prices change.
- `npm run build` and `npm run check:hover` pass.
