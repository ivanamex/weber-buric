# STEP-53: changes after the second round with the owner (15 Oct), collecting Ivana's list; don't build yet

## Notes
1. **Hovers in the accent color:** every hover state (cards, tiles, colorful boxes, buttons, nav links, list rows) uses the **mustard accent `#D9A441`** (glass, as in STEP-51) instead of each card's own color. Text and icon on the mustard: olivewood `#33352A` (AA).

2. **Qué hacemos → Clases lightbox: choose and pay on the website**, without the app. The options become selectable: **Clase muestra · Clase suelta · 4 · 8 · 12 clases al mes · A tu medida** (A tu medida = request, not payment). After choosing: rider's name and age, parent's name, phone, email, start date → **Pagar**. The payment creates (or finds) the family in the app, assigns the plan from the start date, and sends an invitation to the app by email.
   - **Payment methods:** **transferencia** (the club's bank details + upload the receipt; it lands in Cobros → Por revisar, as in the app) and **card through Mercado Pago, built completely now and switched on when the club's credentials arrive** (Ivana, 15 Oct):
     - `api/mp-checkout.js`: creates a **Checkout Pro** preference for the chosen option (price from `prices`, `external_reference` = the payment id, `back_urls` to a "Pago recibido / pendiente / rechazado" page on the site, `notification_url` to the webhook).
     - `api/mp-webhook.js`: verifies the Mercado Pago signature (`x-signature`), fetches the payment from the API, and on `approved` marks the payment paid, creates/activates the plan and sends the confirmation email; `pending` / `rejected` update the status. Idempotent (the same notification twice changes nothing).
     - The same card payment is available **inside the app** ("Pagar con tarjeta" in Mi plan / Pagos, today "Próximamente").
     - Env vars in Vercel: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`. **While they're missing, the card option is hidden** (transfer only) and nothing breaks. Write the 5 click-by-click steps for Ivana to paste them in Vercel and set the webhook URL in the Mercado Pago panel, in `hipico/MERCADO-PAGO.md`.
     - Test with mocked Mercado Pago responses (preference created, webhook approved / pending / rejected / duplicate), since there are no credentials yet.
3. **"Más información": two buttons, two different jobs:** **"Escríbenos por WhatsApp"** (opens WhatsApp with a ready message) and **"Envíanos un mensaje"** (opens the contact form dialog from STEP-52). The same pair in every service lightbox.

4. **Footer band with the letter-horse (now only a horse on empty sand):** turn it into a small **course**. 3–4 show-jumping fences drawn in the same thin line style (posts + striped poles, numbered 1 · 2 · 3 like a course plan) spread across the band; the letter-horse **gallops along and jumps each fence** (a smooth arc over each one), then loops. A faint dotted course line on the ground connects the fences.
   - **A slogan** above the course, big condensed type: **"Tu lugar feliz, a caballo."** (EN: "Your happy place, on horseback."), with the alternatives "Aquí los caballos son el plan." and "Un salto a la vez." listed in the report so Ivana can swap it in `content.js`.
   - Reduced motion: the horse stands still at the start line, the fences and slogan stay.

(more notes coming)
