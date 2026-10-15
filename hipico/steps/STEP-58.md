# STEP-58: Resumen rows: no empty side, no box cut off

Ivana (15 Oct, Resumen at ~1500 px): in the row Por renovar · Ocupación · Caballos: próximos pendientes:
- Por renovar has no card, just one grey line, so the left third looks empty.
- Ocupación is a short card.
- The horses' list is a tall box with its own scrollbar, cut at the bottom.

## Rules (the whole panel and the family app)
1. **Every block is a card**, even when it's empty. An empty block keeps its card with the empty state: pictogram + one line + one action when there is one. Por renovar empty: refresh pictogram, "Ningún plan se renueva esta semana", link "Ver planes →" (→ Familias with `plan=con`).
2. **Cards in a row are the same height** (`align-items: stretch`). Short content sits at the top, and the card's action sits at the bottom.
3. **No box with its own scrollbar.** A list shows at most 5 lines, then "Ver todos (N) →" to its full page or a side panel. Caballos: próximos pendientes → the 5 nearest (overdue first, in red) + "Ver todos (9) →" → Caballos with a "Pendientes de salud" filter (14 days).
4. **No lone block and no empty column.** If a row has fewer blocks than columns, the last block spans the rest of the width (the STEP-54 rule, now for Resumen too).
5. **The heading stays outside the card** with the STEP-57 spacing (16 px to the card).

## Ocupación
Keep the ring. Put "17 de 66 lugares" on one line, and add "Ver horario →" at the bottom (→ Horario, week view). The ring changes color by occupancy: under 40% slate, 40–80% sage, over 80% mustard.

## Check
- Resumen at 1280, 1440 and 1920 px, in the demo with data and with empty data (`/demo?reset=1`, then a family without plans): every row has equal-height cards and no inner scrollbars.
- The page has no empty third, and no "Ver todos" link is dead.
- The same check on family Inicio and Mi plan.
- Run `npm run check:hover` (from STEP-57).

## One payment lightbox for every "Pagar" (family app)
Ivana (15 Oct, the Pensión card on Inicio): "Pagar pensión" should open a lightbox where you choose how to pay, and it then shows how.

**Where:** every Pagar in the family app uses the same `PayDialog`: Pagar pensión, the plan in Mi plan, Pagos por vencer, Pagos, events and single classes. It replaces opening the transfer panel directly. On a computer it's a centered lightbox, and on phones a bottom sheet. Focus trap, Esc to close.

**Top:** what you're paying, e.g. "Pensión de octubre · Relámpago" with the horse's photo, the amount large, the due date and the status pill.

**Choose how:** a segmented choice with icons, one per line on phones: **Transferencia · Tarjeta · En el club**.
- **Transferencia:** the bank details (copy buttons for CLABE, amount and reference), then "Sube tu comprobante" (photo or file), then **Enviar comprobante**. The charge goes to Por revisar. If the club has no bank details yet: "El club te enviará los datos para pagar" (STEP-57).
- **Tarjeta:** "Pagas con tarjeta de crédito o débito en Mercado Pago, de forma segura", then **Pagar $9,500 con tarjeta**, which goes to Checkout Pro (`payByCard`), and back to `/pago/…`. Shown only when `cardEnabled()`.
  - In `/demo` it is shown and simulated: a short "Procesando…", then "Pago recibido" and the charge marked paid, labelled "Simulación de demo".
- **En el club:** "Paga en efectivo o con tarjeta en la oficina del club. Cuando el club registre tu pago, aquí lo verás como Pagado." Then **Avisar que pago en el club**, which stores `meta.payAtClub = date` on the charge. Cobros shows "Paga en el club" on that line, and the club marks it paid as usual. The reminders skip it for 3 days.
- The method chosen last is remembered per device.

**After paying:** the dialog shows the result (Por revisar / Pagado / Aviso enviado), with **Listo** to close. The card on Inicio updates without reloading.

**The Pensión card on Inicio** (same screenshot):
- The status pill "Pago pendiente" is cut off at the right edge. It must stay fully inside the card.
- The small "o paga en el club" text goes away, because En el club is now a choice in the dialog.
- The horse's round photo must show the horse: use the photo's focal point, not the default center crop.
