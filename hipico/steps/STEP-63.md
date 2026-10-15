# STEP-63: the Clases choice, as in the approved draft

Ivana approved the draft on 15 Oct ("very happy with the classes page"). Build it exactly as drawn:
- the picture: `steps/drafts/step-60-clases.png` (computer: Plan mensual / Sin plan; phone: both);
- the markup and CSS as a reference: `steps/drafts/step-60-clases.html`.

This replaces the six equal boxes in the Clases lightbox (`site/Enroll.jsx`). It is the "Clases lightbox: choosing the option" section of STEP-60, which was held for the draft.

## What to build (the draft, in words)
- One line under "Clases": "De principiante a avanzado, desde los 2 años."
- Segmented tabs: **Plan mensual** (default) · **Sin plan**. The tabs sit inset in a sand track, and the active one is a raised warm-white pill.
- **Plan mensual:**
  - the label "¿Cuántas clases al mes?";
  - three option cards **4 · 8 · 12**, each with "1 / 2 / 3 por semana" under the number. 8 is preselected, with a mustard "Más elegido" tag on its top edge. The selected card has a mustard 2 px border and a light mustard tint.
  - Under them, the summary card (sage left edge):
    - the title "8 clases al mes" and three ✓ lines: "2 clases por semana, tú eliges día y hora en la app" · "El plan corre de fecha a fecha" · "Si cancelas a tiempo, la clase regresa";
    - on the right: the price large, "$613 por clase", and a sage pill "Ahorras 18% vs. clase suelta";
    - the per-class price and the saving are worked out from the live prices (`public_site()`), never typed in. Show no saving pill if the saving is 0 or less.
- **Sin plan:** the label "Una clase, sin plan", then two radio rows: **Clase muestra** $500 "Para conocer el club · una por jinete" (preselected) and **Clase suelta** $750 "Cuando quieras, sin plan". If the rider's family already used its trial (known in the app only), the website still shows it; the app enforces the rule.
- Under both: "¿Necesitas días u horarios a tu medida? **Escríbenos →**" (a level 1 link → the contact form prefilled "Me interesa: A tu medida"). Then "¿Dudas?" with the WhatsApp · Mensaje pills (hidden on phones in this step, which keeps the screen short; they come back in the later steps).
- **Sticky footer:** "Elegiste" + "8 clases al mes · $4,900" on the left and the mustard **Continuar →** on the right. Never disabled. The rider-details and payment steps keep the same footer (main button always in the same spot).
- Phones: a 110 px photo strip on top, everything stacked, the footer stuck to the bottom of the sheet, and the button text never wraps.
- English: "Monthly plan · No plan", "How many classes a month?", "1 / 2 / 3 a week", "Most chosen", "You save 18% vs. a single class", "Trial class · To get to know the club · one per rider", "Single class · Whenever you want, no plan", "Need your own days or times? Write to us →", "You chose", "Continue →".
- All strings in `es.json` / `en.json`.

## Check
- 1440×900 and 390×844, in ES and EN: it matches the draft, with no scroll inside the panel on a computer.
- Switching 4/8/12 updates the card and the footer with no layout jump.
- Continuar leads to the rider details with the right option and price.
- `npm run check:hover` passes.
