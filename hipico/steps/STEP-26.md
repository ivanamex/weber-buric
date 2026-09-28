# STEP-26: layout bugs on iPhone (urgent)

Seen on a real iPhone (Safari, ~390 px):

## 1. Bottom tab bar floats instead of sticking to the bottom
- On Resumen and Rentabilidad, the tab bar (Resumen · Hoy · Horario · Cobros · Familias) sits above the real bottom, and page content shows **below** it.
- Fix: the bar is `position: fixed; bottom: 0; left: 0; right: 0`, with `padding-bottom: env(safe-area-inset-bottom)`. No `transform`, `filter` or `overflow` on any ancestor that would break `fixed`. Use `100dvh` (not `100vh`) for full-height layouts. Give the page content a bottom padding equal to the bar height + safe area, so the last item is never hidden.
- Check the same in the family app (Inicio · Clases · Mi plan · Más), with the Safari toolbar both expanded and collapsed, and in the installed app.

## 2. Fields overlapping in forms
- In **Gastos → new expense**, the **Fecha** and **Monto** fields overlap: the date input is wider than its column and runs under Monto, and the two have different heights.
- Fix: on phones, stack the fields one per row (full width). On wider screens, use a two-column grid with a gap and `min-width: 0` on both. All inputs share the same height, padding and border radius, including native date inputs (`appearance` reset).
- Dates shown in Spanish ("27 sep 2026") when the app is in ES.

## 3. The DEMO bar at the top is cut off
- The Familia / Dirección switch overlaps the top edge. Give the demo bar its own space below the header, and keep it sticky.

## 4. Quick pass on every screen
Go through every management and family screen at 360 px and 390 px (demo): no overlapping fields, no horizontal scroll, the tab bar always at the very bottom, and nothing hidden under it. Fix whatever else turns up in the same way, and list what was fixed in the summary.
