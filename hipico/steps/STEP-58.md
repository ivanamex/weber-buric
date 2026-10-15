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
