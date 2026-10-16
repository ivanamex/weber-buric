# STEP-69: the demo comes first on the sign-in screen, and a way back to the website

## 1. "Ver la demo" as the main option (sign-in screen at `/app`)
Ivana: when someone opens the app now (Mara, the club team, families during the presentation), she wants them to **see the demo**, not create an account. Today the demo is a small grey link under the card.
- On top of the sign-in card, a **demo card** in sage glass:
  - title "Conoce la app";
  - one line: "Recorre la app con datos de ejemplo, como familia o como dirección. No necesitas cuenta.";
  - the mustard main button **Ver la demo** (→ `/demo`).
- The sign-in card below keeps its fields, but "Enviarme acceso" becomes a secondary (outline) button, since there's only one mustard button per screen.
- The small "Ver la demo con datos de ejemplo" link under the card goes away (it's now the card).
- **This is temporary.** Once real families use the app, the sign-in should come first again. Put it behind a switch: `club_settings.promote_demo` (on by default now), with **Ajustes → "Mostrar la demo primero al entrar"** to turn it off. When it's off, the demo card shrinks back to the small link.

## 2. "Volver al sitio" in the sidebar
- In both desk sidebars (family and dirección) and on phones in "Más": a link **← Volver al sitio** at the bottom, above Salir, that opens `/` (or `/en`, by language). It uses an arrow icon at text level 1.
- Also in the demo bar, next to "Salir de la demo": "Ver el sitio".

## Check
- `/app` at 1440 and 390 px: the demo card is the first thing you see, Ver la demo opens `/demo`, and the sign-in still works.
- Ajustes switch off → the sign-in comes first again.
- "Volver al sitio" from Familia, Dirección and the demo lands on the website in the right language.
