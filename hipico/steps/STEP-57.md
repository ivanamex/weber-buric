# STEP-57: Cobros on a computer, with room and order

Ivana (15 Oct, screenshot of Cobros → Por cobrar at about 1500 px): "Everything is one over another. It looks messy." The tabs, the "Concepto" label and the concept pills share one row and wrap into each other, and nothing has space around it.

## Layout, top to bottom (desktop ≥1024 px)
1. **The four total tiles** (Vencido · Vence hoy · Por vencer (5 días) · Más adelante este mes): unchanged, then **32 px** of space.
2. **The view tabs alone on their own row:** Por cobrar · Pagados (60 días) · Todos, left-aligned, then **16 px**.
3. **The concept filter on its own row:** the label "Concepto" in small caps (bark, Archivo 80%, 12 px, letter-spacing .08em), vertically centered with the pills. Then the pills on **one line**: Todos los conceptos · Planes · Pensión · Clases · Rentas · Eventos.
   - Pills: 36 px tall, 14 px text, 8 px gap.
   - The active pill is olive with white text. The others are warm white with a hairline border, and get the mustard hover.
   - If they don't fit, the line scrolls sideways with the fade, as on phones. It never wraps under the label.
4. **24 px**, then the table.

## Tiles
- A tile at $0 stays neutral: warm white, hairline border, muted text. Only a tile with money in it gets its color: Vencido red tint, Vence hoy terracotta tint, Por vencer mustard tint.
- Today, "Vence hoy" and "Por vencer" look tinted even at $0, so they read as selected.
- Same height, same inner padding (20 px 24 px), 16 px between tiles.
- Clicking a tile filters the table to that group, and the tile shows an olive 2 px outline while active. Clicking it again clears the filter.
- **Hover**, so the tiles don't look static: the tile lifts 2 px with a soft shadow in its own color, the fill deepens a touch, and a small "Ver →" appears bottom-right (the same pattern as Resumen's tiles in STEP-54). A $0 tile gets the mustard glass hover. Pointer cursor. Reduced motion: only the color changes.

## Table
- **Concepto** cell: first line "Plan 8 clases" (the plan, no "Plan mensual ·" in front). Second line the rider, "Regina", in small muted text. Same pattern for the other concepts: "Pensión · octubre" / horse name, "Clase suelta" / rider.
- Rows: 16 px vertical padding, cells vertically centered, the amount right-aligned in tabular numbers.
- Column widths so that nothing wraps at 1280 px except the concept's second line.

## Section headings above cards ("Por revisar" and the like)
Today the "Por revisar" heading (icon, title, count pill) sits right on top of the card below it.
- 32 px of space above the heading, **16 px** between the heading and its card(s), and 12 px between cards.
- The icon, title and count pill sit on one baseline, with an 8 px gap between them.
- In the card, keep 24 px of padding on the left after the mustard edge, and leave the icon room to breathe (12 px gap to the text).
- Apply the same heading spacing to every section heading in the panel (Cobros, Resumen, Hoy, Familias, Mensajes) and in the family app: one class, one rule.

## Same order elsewhere
Apply the same rows (tabs row, then filter row, with the same spacing) to the other desktop pages that have tabs plus filter pills: Familias, Caballos and Mensajes, if their rows run into each other too.

## Check
- Screenshots at 1280, 1440 and 1920 px: tabs and pills on separate rows, pills on one line, $0 tiles neutral, and the concept as two clean lines.
- Phones are unchanged.
