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
