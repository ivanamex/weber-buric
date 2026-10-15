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
- **Sort arrows** (every `DataTable`: Cobros, Familias, Caballos, Nómina). Today the idle arrow is a pale chevron that almost disappears.
  - Idle: a small up-and-down pair (⇅ shape, 14 px, 2 px stroke) in bark `#68604D`, so it reads as "sortable" at a glance.
  - Sorted column: a single arrow (up or down) in olivewood, in a mustard tint pill around the header label. The label is bold.
  - Hover on any header: the mustard glass highlight, with the arrow in olivewood. Pointer cursor, and the arrow pair nudges 1 px.
  - Contrast: the idle arrow reaches at least 3:1 against the header row.
- Column widths so that nothing wraps at 1280 px except the concept's second line.

## Section headings above cards ("Por revisar" and the like)
Today the "Por revisar" heading (icon, title, count pill) sits right on top of the card below it.
- 32 px of space above the heading, **16 px** between the heading and its card(s), and 12 px between cards.
- The icon, title and count pill sit on one baseline, with an 8 px gap between them.
- In the card, keep 24 px of padding on the left after the mustard edge, and leave the icon room to breathe (12 px gap to the text).
- Apply the same heading spacing to every section heading in the panel (Cobros, Resumen, Hoy, Familias, Mensajes) and in the family app: one class, one rule.

## Datos para transferencia (Cobros)
Today the card shows only the labels Banco, Titular and CLABE with nothing next to them, plus an outline Editar button. It looks broken.
- **Empty (no bank details yet):** heading "Datos para transferencia", then one line: "Aún no hay datos bancarios. Mientras tanto, las familias ven «El club te enviará los datos para pagar»." Then a mustard main button **Agregar datos**. Also a small terracotta pill "Falta" next to the heading, because without these details nobody can pay by transfer.
- **Filled:** heading plus three rows. Each row has the label in small caps (bark) above the value in olivewood, 16 px semibold. The CLABE is grouped in blocks (`0121 8000 1234 5678 90`) in tabular numbers, with a copy icon. **Editar** sits top-right of the card as a small slate button.
- Same padding as the other cards (24 px), and 16 px between rows.
- The current Editar looks like it's missing its CSS: an unstyled outline pill, out of line with the text. Find why (a class name that has no style, or a style that's in a file not loaded on that page), give it the app's button class and size (44 px), and check the other cards in Cobros and Ajustes for the same bug.
- Check what the family sees in the transfer panel and the website's Transferencia step when the details are empty: the same "El club te enviará los datos para pagar" line, never empty labels.

## Hover everywhere: one sweep, not screenshot by screenshot
Ivana keeps finding elements with no hover (latest: the Nuevos · Contestados · Todos tabs in Mensajes). Find them all at once:
1. **Audit script** (`scripts/hover-audit.mjs`): Playwright at 1440×900 on `/demo?reset=1`, both roles. Visit every route of Familia and Dirección, every tab and open sheet, plus `/`, `/en` and `/descargar`. Collect every interactive element: `button`, `a[href]`, `[role=tab|button|link|option|switch]`, `summary`, `label` wrapping a control, `[tabindex="0"]`, clickable table rows and cards.
2. For each one, read its computed style (background, color, border, box-shadow, transform, text-decoration, outline). Hover it, read again, and list every element where **nothing changes**.
3. Fix them all with the existing tokens:
   - unselected segmented tabs (`--mg-soft`), with a mustard tint fill and olivewood text;
   - the selected tab, which keeps its white pill and only gets the pointer;
   - pills, chips, icon buttons, rows, cards and links: `--mg` / `--mg-soft` as in STEP-54.
   - Pointer cursor on all of them, and `:focus-visible` matching the hover for the keyboard.
4. Re-run the audit until the list is empty, except disabled elements. Put the before and after counts and the elements fixed (by screen) in the report.
- Add the audit as `npm run check:hover` (`scripts/hover-audit.mjs`), so every future step can run it before pushing. Add one line to `steps/README.md`: "Run `npm run check:hover`; a new interactive element without hover is a bug."

## Same order elsewhere
Apply the same rows (tabs row, then filter row, with the same spacing) to the other desktop pages that have tabs plus filter pills: Familias, Caballos and Mensajes, if their rows run into each other too.

## Check
- Screenshots at 1280, 1440 and 1920 px: tabs and pills on separate rows, pills on one line, $0 tiles neutral, and the concept as two clean lines.
- Phones are unchanged.
