# STEP-54: app changes after the owner round (15 Oct)

Ivana's list of 15 Oct, app part (families + management). Run after STEP-53 (it reuses its Mercado Pago endpoints).

1. **Hovers in the accent color:** every hover in the app and the panel (quick tiles, cards, buttons, list rows, sidebar items) uses the **mustard glass** instead of each tile's own color. Text and icon on mustard: olivewood (AA). The colored edges and tinted icon tiles from STEP-51 stay.
2. **Card payments in the app:** "Pagar con tarjeta" in Mi plan, Pagos and the Pensión card uses the Mercado Pago checkout from STEP-53 (hidden while the keys are missing; transfer always available).
3. **App Inicio (family, desktop): the Pensión block sits alone in the bottom-right corner** with the whole left side empty. Put it in the grid: the **Pensión card spans the full content width** (or takes the left column next to another card), with the horse's photo, "Pensión de octubre · $9,500", the status pill and **"Pagar pensión" as a mustard glass button inside the card** (not floating under it). Rule for every page of the app: no lone block in a corner; cards fill the 2-column grid from the left, and a single card spans the full width.

4. **Resumen (Dirección) must show where every number comes from.** Today the 4 tiles (Familias · Jinetes · Planes activos · Caballos en pensión) and the Dinero figures look static.
   - **Every tile and figure is clickable** and opens its source, already filtered: Familias → Familias (activas); Jinetes → Familias with the riders view; Planes activos → Cobros/Familias filtered by active plan, with the 4 / 8 / 12 split clickable too; Caballos en pensión → Caballos filtered "Pensión"; Hoy / Este mes / Últimos 30 días → Cobros → Pagados with that date range; "Cobrado de lo que se generó" → Por cobrar.
   - Each tile shows a small line under the number saying what it counts (e.g. "con plan o pensión activos"), and on hover the mustard glass + "Ver →".
   - The date at the top ("Jueves, 15 de octubre") gets a small "Actualizado hace 1 min" and a refresh icon, so it reads as live.

## Check
390 + 1440 px: hovers in mustard in the app and the panel; the Pensión card full width with its button inside; no lone card in a corner on any page; every Resumen tile and figure opens the right filtered list; card payment hidden without keys.
