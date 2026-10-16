# STEP-70: Clases lightbox, tighter (after STEP-68)

## 1. No empty space, no help row
Ivana: under the choice there's an empty band down to the footer, and "¿Necesitas… a tu medida? Escríbenos" + "¿Dudas? WhatsApp · Mensaje" aren't needed in this lightbox.
- Remove that row from the **Clases lightbox** (all its steps). It stays in the other service lightboxes and in Visítanos.
- The panel **hugs its content**: no `min-height` or stretched flex on the right column, and the sticky footer comes straight after the content. The lightbox is only as tall as the step needs (up to `100dvh - 48px`).

## 2. Payment method: nothing preselected
- In "¿Cómo quieres pagar?" none of Tarjeta · Transferencia · En el club is selected at first, and no accordion is open.
- The footer button reads **"Elige cómo pagar"** (disabled look but clickable: pressing it pulses the three cards once and moves focus to them). After a choice it becomes Pagar / Enviar comprobante / Apartar mi lugar (STEP-64).
- Drop the "remember the last method" rule from STEP-64.

## 3. Labels inside the fields (floating labels)
To save height: every field in this lightbox (and the contact form) puts its label **inside the field** as pale text (bark at 70%). When the field gets focus or has a value, the label **floats up** to the top edge inside the field (12 px, bark) and the text sits below it.
- Field height 52 px with the label inside, so there's no separate label line above any more.
- Keep it accessible: it's a real `<label for>`, not a placeholder. Errors still show under the field without moving the layout (STEP-64).
- The date field shows its label floated, since it always has a value ("Fecha de inicio · 15 oct 2026").
- The hint "Con este correo entras a la app." goes inside the Correo field's label when empty ("Correo · con él entras a la app").

## Check
- 1920×830 and 1440×760: choice step and details+payment step, with no empty band and the footer right under the content. The details+payment step shows all six fields and the three payment cards with no scroll while no accordion is open.
- Screenshots of the fields empty / focused / filled.
