# STEP-56: real prices, inset fields, short info buttons

Ivana checked STEP-53's Clases lightbox (15 Oct). Run this before STEP-55, so the video shows the final screens.

## 1. The club's real prices
| Key | Now | New |
|---|---|---|
| `class_trial` (Clase muestra) | 400 | **500** |
| `class_single` (Clase suelta) | 650 | **750** |
| `class_extra` (Clase adicional) | 600 | **750** |
| `plan_4` (4 clases al mes) | 2200 | 2200 (stays) |
| `plan_8` (8 clases al mes) | 3900 | **4900** |
| `plan_12` (12 clases al mes) | 5400 | **6900** |
| `boarding_monthly` (Pensión) | 9500 | 9500 (stays) |

- Update `src/data/prices.js` (demo + defaults) and the `prices` table with a migration `20261016_real_prices.sql` that upserts these keys. It must be safe to run twice and end with the usual re-grants listed in `CLAUDE.md` (`public_site`, `send_contact_message`, `web_enroll`, `submit_web_receipt`, `web_receipt_folder_ok`).
- Charges already created keep their amount. Only new charges use the new prices.
- Remove "de ejemplo" from these prices wherever the code or the panel calls them example prices. The other services (rides, camps, parties…) stay example prices.
- Everything reads from the same place: the website (lightbox, "desde", Pagar button), the app (Mi plan, Clases, Cobros → Precios de clases) and the demo.

## 2. Fields that look sealed in (inset)
The white fields on the warm-white panel almost disappear. Make every field look pressed into the card:
- fill: sand tint `#EFE6D3`;
- border: 1 px `#D5C7AD`;
- radius: 14 px;
- shadow: `inset 0 2px 4px rgba(51,53,42,.14), inset 0 -1px 0 rgba(255,255,255,.7)`;
- placeholder text: bark `#68604D` at 70%.

Focus: the fill turns warm white `#FFFBF5`, the border turns mustard `#D9A441`, and a 3 px ring appears in mustard at 35%. Invalid: a terracotta `#B5704F` border.

- Make it one field token in `site.css`, used by the Clases form (`Enroll.jsx`) and the contact form (`.cfield`). Apply the same token to the app's fields (`styles.css`) so the forms match. The 46 px height stays.
- Contrast: the label, the text typed and the field edge each must reach AA / 3:1 against the panel.

## 3. Short info buttons
Replace the two long, stacked buttons under "Más información":
- The label becomes **"¿Dudas?"** (Archivo caps, small).
- Two compact sage glass pills **side by side**: [WhatsApp icon] **WhatsApp** · [mail icon] **Mensaje**. Natural width, 44 px tall, same style as now.
- On phones they stay side by side; they fit at 360 px.
- Same actions as now: WhatsApp with the prefilled text, and the contact form sliding in.
- The same change goes everywhere these two buttons appear (the other lightboxes, Visítanos). Update the i18n keys: ES "¿Dudas?", "WhatsApp", "Mensaje"; EN "Questions?", "WhatsApp", "Message".

## 4. Date in Spanish
"Fecha de inicio" shows "10/15/2026" (the browser's US format). Use the app's `DateInput` pattern on the site too: it shows "15 oct 2026" in Spanish and "Oct 15, 2026" in English, with the native picker on top, invisible.

## Check
- At 1440 and 390 px, in ES and EN: the Clases lightbox shows 500 / 750 / 4 clases $2,200 / 8 clases $4,900 / 12 clases $6,900. Choosing 12 makes the button read "Pagar $6,900".
- In the app, Precios de clases shows 500 / 750 / 750.
- The fields read clearly as inset, and focus turns them mustard.
- The two info pills sit on one row.
- The date reads "15 oct 2026".
