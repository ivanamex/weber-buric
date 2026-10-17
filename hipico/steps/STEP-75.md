# STEP-75: Todo shows everything, the FreeRide catalog live now, FreeRide items as a wish list

Ivana (17 Oct, live `/tienda`): "Todo" shows only 2 cards while Pantalones shows all six. There are no accessories or other FreeRide items on the live site. And FreeRide items should not go through payment: people pick what they want on our site and send the list to Mara, who answers with her price.

## 1. "Todo" shows every product
- Todo = one card per product **and color** (the same cards as the category tabs), in this order: Mara's own stock first (newest first), then the FreeRide part. No more one-card-per-model grouping anywhere on the grid. The swatches on a card stay, as a way to jump to the other colors.
- The tab counts match what the tab shows.

## 2. The FreeRide catalog is on the live site today
Live shows no FreeRide items because the copy only runs at 6:00 from the cron or from "Actualizar catálogo" with a management sign-in.
- Run the copy **in the production build**, right after `scripts/migrate.mjs`: `scripts/fre-sync.mjs` (the same parser as `api/fre-sync.js`, shared module) when `fre_catalog` is empty or older than 20 h. If FreeRide can't be reached, the build goes on and logs it (never fail a deploy for this).
- Keep the daily cron and the panel button.
- In the report: how many products came in, how many per tab (Pantalones, Camisas, Chamarras, Accesorios) and how many "sin categoría clara". Map the unclear ones you can (belts, socks, gloves, hats, bras, saddle pads, bonnets, ear nets, horse items) so Accesorios is well filled; FreeRide's horse products (saddle pads, bonnets) go to a new **Para tu caballo** tab if there are 4 or more, otherwise to Accesorios.

## 3. FreeRide items = "Mi lista de deseos" (no payment)
Only Mara's own stock is bought and paid on the site. FreeRide items are chosen and sent to Mara as a list.
- **Look:** FreeRide cards sit on a light sand tint (`#EFE6D3` card, the photo box stays white) with a small "Sobre pedido" tag, so they read differently from Mara's warm-white cards at a glance. The section title: "Todo FreeRide · sobre pedido" + one line: "Agrégalo a tu lista de deseos y Mara te manda el precio final."
- **Product window (FreeRide):** colors, sizes (FreeRide's unavailable ones struck), quantity (up to 3), the price as "Precio aproximado $2,150" (bark, not big), and the main button **Agregar a mi lista** (heart icon; with no size it pulses the sizes). After adding: "En tu lista ✓" for 1.5 s, the list opens.
- **Mi lista** (its own side panel / bottom sheet, the same shell as the cart, never two sheets at once): each line with photo, name, color · talla, quantity stepper, approx. price, remove; the total as "Total aproximado"; a line "Mara confirma precio y disponibilidad. Anticipo del 50% al confirmar, el resto al recibirlo; envío e importación incluidos." Footer: **Enviar a Mara** (mustard).
- **Enviar a Mara:** inside the panel, the floating fields Nombre, WhatsApp, Correo (optional) and a Nota (optional). One press:
  1. saves the list (`shop_wishlists`: id, number "L-101", name, phone, email, note, items jsonb, total_estimate, status `nueva|cotizada|convertida|cerrada`, family_id if signed in, created_at; anon `send_wishlist(jsonb)` with the contact form's rate limit and honeypot; demo mirror);
  2. emails the club the list (same sender as the contact form);
  3. shows "¡Listo, {nombre}! Mara te escribe por WhatsApp con tu precio." + a secondary **Enviar también por WhatsApp** that opens WhatsApp to the club with the list typed out ("Hola Mara, esta es mi lista de FreeRide: 1 × Celestial Lux Navy, talla S … Total aproximado $4,300. Lista L-101").
  4. empties the list.
- **Where the heart lives:** in the shop's sticky header (and the app's shop band) a heart with the count, next to the cart's bag. The nav bar keeps only the cart count on Tienda.
- In the family app: same list; "Enviar a Mara" skips the fields (the family is known) and the list also shows in "Mis pedidos" as "Lista enviada · esperando precio".
- The FreeRide lines leave the cart and checkout (old carts with FreeRide lines move them into the list on load). `shop_order` keeps accepting FreeRide lines only from the panel (next point).

## 4. Panel: Tienda → Listas
- A new tab **Listas** (badge with the new ones) beside Pedidos · Productos · Catálogo FreeRide: number, date, name / WhatsApp (two lines), items, total aproximado, status.
- Side panel: the lines with links to each FreeRide product, **Responder por WhatsApp** (prefilled "Hola {nombre}, tu lista L-101: …" with the line prices so Mara can edit before sending), **Convertir en pedido**: opens the list as an order editor where Mara can change each line's final price and remove lines, then creates the order (all lines "sobre pedido") with the 50% charge, so the family pays in the app or the website link (Cobros as any shop order; status `convertida`). "Marcar como cerrada" (text link) for lists that went nowhere.
- Resumen's "Pedidos nuevos" tile also counts new lists.

## Also
- i18n ES/EN ("Mi lista de deseos" / "My wish list", "Agregar a mi lista" / "Add to my list", "Enviar a Mara" / "Send to Mara", "Precio aproximado" / "Approximate price").
- Grants: add `send_wishlist(jsonb)` to the anon re-grant list.
- `hipico/CLAUDE.md` updated.

## Check
- `/tienda` Todo at 1440 and 390: Mara's 7 cards, then FreeRide's (sand cards), counts right; Accesorios has real items.
- Add 2 FreeRide items to the list, send it: the confirmation, the WhatsApp text, the list in Dirección → Tienda → Listas; convert it with a changed price → the order and the 50% charge in Cobros.
- The cart only takes Mara's products; buying one still works end to end.
- `npm run build` and `npm run check:hover` pass.
