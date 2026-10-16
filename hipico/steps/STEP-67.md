# STEP-67: Ivana's notes after STEP-64/65

## Clases: the 4 · 8 · 12 cards without "Más elegido"
Ivana: the dark "Más elegido" tag is unreadable (olive text on a dark pill). And why push families to 2 a week? The club gains from more classes.
- **Remove the "Más elegido" tag** everywhere (site and app).
- Each card gets its own **accent bar** along the bottom (4 px) and a **small pictogram** at the top right (24 px, line style as in `Icon.jsx`), plus one short fact line:
  - **4** · slate `#5F7A8C` · horseshoe · "Para empezar"
  - **8** · sage `#8A8E75` · rosette · "Constancia"
  - **12** · mustard `#D9A441` · trophy · "Mejor precio por clase"
- "Mejor precio por clase" is a fact ($575 vs $613 and $725), worked out from the live prices. If the prices change and 12 is no longer the cheapest per class, the line goes to whichever plan is.
- **12 is preselected** (summary card and footer start on 12 · $6,900). The family can still pick 4 or 8 with one tap.
- Selected card: the 2 px border and the tint take that card's own accent color, not always mustard.
- In the app's plan packages (Mi plan → Cambiar plan) the same cards appear, and the same rule applies: no "Más elegido".

## "En el club": reminders until it's paid
Ivana: someone who chooses to pay cash at the club must get reminders (phone or email) until it's paid, unless they say they paid.
- A `payAtClub` charge is **no longer quiet for 3 days** (that STEP-58 rule goes). It follows the normal reminder schedule (5 days before, the day, 3 days after, then weekly), with its own text: "Recuerda pagar {concepto} ({monto}) en la oficina del club. Si ya pagaste, avísanos desde la app." Plus a link to Pagos.
- Where it goes: **email** (as all reminders, once SMTP is set in Vercel) and the **in-app** card "Pagos por vencer". Automatic WhatsApp needs the WhatsApp Business API, which the club doesn't have, so WhatsApp stays the club's one-tap reminder in Cobros, now with the pay-at-club text.
- **"Ya pagué en el club"** button on that charge in the family app (and in the reminder email link). It does **not** mark the charge paid. It moves it to **Cobros → Por revisar** with the tag "Dice que pagó en el club", and the reminders stop. The club confirms (Aprobar → Pagado) or rejects with a note ("No encontramos tu pago"), and the reminders start again.
- The demo shows it: one family with a pay-at-club charge and a reminder sent.

## Colored tiles hover in their own color
Ivana (Resumen → Más: Mensajes, Reportes, Rentabilidad, Nómina, Ajustes): each tile has its own color stripe on top, but the hover turns them all mustard. That makes no sense.
- Rule (it adjusts STEP-60's level 2): **a tile or card that has its own color hovers in that color**. The fill becomes its light tint (`--ct`, about 12–15%), the stripe/edge deepens to `--cg`, it lifts 2 px with a shadow in the same color, and the icon tile goes one step deeper. The text stays olivewood.
- Applies to: Resumen's "Más" tiles, the family quick tiles on Inicio, the Cobros total tiles, the 4·8·12 plan cards (STEP-67), cards with a colored edge (`edge-c`), and the website's 4 colored boxes.
- Mustard tint stays only for elements without a color of their own (rows, chips, neutral pills, outline buttons).
- `check:hover` reports any `.c-<color>` element whose hover background isn't its own tint.
