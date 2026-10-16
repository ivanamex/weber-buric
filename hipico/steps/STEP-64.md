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
