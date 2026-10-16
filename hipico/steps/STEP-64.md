# STEP-64: Ivana's round after STEP-63

## "Más elegido" tag (Clases lightbox, 8 clases)
Ivana: the tag is the same mustard as the selected card's border, so it blends in and doesn't stand out.
- The tag becomes an **olivewood `#33352A` pill** with parchment text, plus a small **mustard horseshoe** before the words (the app's `HORSESHOE_D`, 12 px, upright U): "[horseshoe] MÁS ELEGIDO".
- It keeps its place on the card's top edge and its size (Archivo caps, 11–12 px).
- It looks the same whether or not the 8 card is selected. It never turns mustard, so it stays readable against the mustard border.
- Same tag wherever "Más elegido" appears (app plan packages in Mi plan, /descargar if shown).

## Clases lightbox fits without scrolling
Ivana (1920 px wide screen, the browser leaves about 870 px of height): the right column needs a scroll. Rule: **the choice step never scrolls** at 1280×720 and up.
- Title "Clases": 48 px (now ~64), and the one-line description right under it with 8 px between.
- Tabs: 40 px tall, 20 px under the description.
- Option cards 4 · 8 · 12: 76 px tall (number 32 px + "por semana" on one line), 12 px label above.
- Summary card: 20 px padding. The three ✓ lines at 15 px, each kept on **one line** ("2 por semana, eliges día y hora en la app" · "De fecha a fecha" · "Si cancelas a tiempo, la clase regresa"). Price 40 px.
- "¿Necesitas días u horarios a tu medida? Escríbenos →" and "¿Dudas? WhatsApp · Mensaje" go on **one row** (link left, pills right, 36 px pills).
- Sticky footer: 72 px tall.
- Use `clamp()` on the vertical gaps tied to the viewport height, so a 720 px-tall screen tightens the gaps instead of scrolling. The lightbox is at most `calc(100dvh - 48px)` tall.
- Check at 1280×720, 1440×800, 1920×870 and 390×844: no scrollbar in the panel at the choice step (rider details and payment may scroll above the sticky footer).

## Rider details + payment on one compact screen (Clases lightbox, step 2)
Ivana (screenshot): after Continuar, "Pagar $6,900" seems to do nothing. It only shows errors, and the fields jump out of line: Edad and Teléfono sit lower than their neighbours, and each error pushes the row. The three ways to pay only came after this screen. She wants it simple: details and the payment choice together, with the three ways as equal choices.

**One screen, top to bottom (above the sticky footer):**
1. "← Volver" + "12 clases al mes · $6,900" on one line.
2. **Details**, compact (fields 44 px, labels 13 px, 12 px gaps), in a 2-column grid on a computer:
   - Nombre del jinete | Edad (narrow);
   - Mamá, papá o tutor | Teléfono (WhatsApp);
   - Correo ("Con este correo entras a la app.") | Fecha de inicio.
   - Fields in a row stay **aligned at the top** (`align-items: start`). Every field reserves its error line, so an error never shifts the layout.
   - Errors show only after the first Pagar press, field by field. The panel scrolls to the first one and focuses it.
3. **"¿Cómo quieres pagar?"**: three equal option cards in one row (stacked on phones), icon + title + one line:
   - **Tarjeta** "Crédito o débito";
   - **Transferencia** "Sube tu comprobante";
   - **En el club** "Efectivo o tarjeta en la oficina".
   - None preselected the first time; the last choice is remembered on the device.
4. **Accordion:** the chosen card opens its part right under the row (smooth 200 ms, the others stay closed):
   - **Tarjeta:** the card form **inside the lightbox**, using Mercado Pago's **Card Payment Brick** (card number, expiry, CVV, name, installments where Mercado Pago offers them). It needs `MP_PUBLIC_KEY` on the client; the payment is created on the server with `MP_ACCESS_TOKEN` (`api/mp-pay.js`, same webhook and `card_payment_result()` as STEP-53). Keep Checkout Pro as the fallback. Without the keys, the accordion shows "El pago con tarjeta estará disponible muy pronto. Mientras tanto, elige Transferencia o En el club." In `/demo`, a simulated form (test card prefilled, "Simulación de demo").
   - **Transferencia:** the bank details (copy CLABE, amount, reference) + the drop zone from STEP-60. "Lo subo después desde la app" is a text link.
   - **En el club:** one line: "Tu lugar queda apartado; paga en la oficina del club."
5. **Sticky footer:** "12 clases al mes · $6,900" + one mustard button whose label follows the choice: **Pagar $6,900** (Tarjeta), **Enviar comprobante** (Transferencia, or **Apartar mi lugar** if they chose "Lo subo después"), **Apartar mi lugar** (En el club). With no choice yet, the button reads "Elige cómo pagar" and the payment row pulses once when pressed.
- One press does it all: validate → create the family/rider/charge (`web_enroll`) → pay or upload or mark `payAtClub` → the "¡Listo, {nombre}!" screen. No separate payment screen any more.
- Fits without scrolling at 1440×900 with the accordion closed. With an accordion open, the panel may scroll above the sticky footer.
- The app's `PayDialog` keeps the same three cards and the same accordion parts.

## Check
- 1920×870, 1440×900, 1280×720, 390×844 (ES and EN): each of the three choices goes through to "¡Listo!" in the demo, with errors in place and no fields out of line.

## Footer horse: bigger, then the illustrated poses
Ivana: the horse is small and cute, but now it's half the fence height. Make it bigger: **the horse's withers sit about 1.1× the fence height** (the head reaches about 1.4×). Hooves stay on the dotted line, and the jump arc clears each top pole.
- **The letter-horse is replaced by Ivana's silhouettes** (approved 15 Oct), already cut into `public/img/course/`: `horse-canter.png`, `horse-takeoff.png`, `horse-over.png`, `horse-landing.png`. They're transparent and olivewood `#33352A`, and all four share one frame height (415 px) so the ground line matches: hooves at the bottom edge for canter, take-off and landing.
- Pose by phase: canter on the ground → take-off one horse-length before the fence → over at the top of the arc → landing one horse-length after it → canter again. Swap the poses with a 120 ms cross-fade (no flicker), and keep the canter alive with a tiny 2 px bob.
- Size: frame height = about 1.9× the fence height (that puts the withers at about 1.1× the fence). Phones use the same ratio.
- Reduced motion: the canter pose standing at the start line.
- Keep `TextHorse` for `/descargar`; only the footer course changes.
