# STEP-29: management on a big screen (desktop layout)

Same app, same link (`/app`), same login; no separate product. On screens **≥ 1024 px**, management gets a real desktop layout instead of the phone column centered in the page. Phones stay exactly as they are.

## Layout
- **Left sidebar** (replaces the bottom tab bar on desktop): logo, Resumen, Hoy, Horario, Cobros, Familias, Caballos, Nómina, Rentabilidad, Ajustes, with the user's name and Salir at the bottom. Collapsible to icons.
- Content uses the full width (max ~1440 px), with a top bar: page title, search, date/period selector where relevant, primary action button (e.g. "+ Nueva clase").

## Screens
- **Resumen:** a grid of cards: money (today / month / 30 days + the daily income chart, bigger), Quién debe, Por renovar, Hoy (classes and riders), Caballos pendientes (vaccines, farrier). Everything visible without scrolling on a laptop.
- **Cobros and Familias as tables:** sortable columns, search, filters (status, plan, overdue), and a row click that opens a **side panel** with details and actions (Marcar pagado, WhatsApp, Editar), without leaving the list. Export to CSV / Excel.
- **Horario:** the week grid (days × hours) full width, with drag to create a class and click to edit (in the side panel).
- **Hoy:** classes as columns by time, with riders and horses; attendance with one click.
- **Caballos / Nómina / Rentabilidad:** tables with side-panel detail; Rentabilidad's charts side by side.
- Forms open in the side panel or a centered dialog, with the same Guardar / Cancelar pattern.

## Desktop comforts
- Keyboard: Esc closes the panel, Enter saves, `/` focuses search.
- Hover states on rows and buttons; tooltips on icons.
- Printing: Cobros and the Hoy list print cleanly (a print stylesheet).

## Family side on desktop
- Families keep the phone design, shown as a comfortable centered column (max ~560 px) with a light sidebar for their tabs. No big changes.

## Entry
- The landing header gets **"Entrar"** next to "Abrir la app"; on desktop, it goes straight to the login and then to Resumen for management.
- The demo gets the same desktop layout (`/demo` → Dirección on a laptop).

Check it at 1280 px and 1440 px (laptop), 1024 px (tablet landscape), and 390 px (phone must be unchanged).
