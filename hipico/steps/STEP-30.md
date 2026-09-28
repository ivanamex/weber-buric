# STEP-30: desktop family view full width, no "Más", and a way back

Seen on a laptop (`/demo/familia/mas`): the family content is still a phone-width column in the middle of the screen, the sidebar has a "Más" item that hides things, and the only way back is the browser's back button.

## 1. Family side uses the full width on desktop (≥ 1024 px)
- Drop the ~560 px centered column: content fills the area next to the sidebar (max ~1200 px), in **2 columns** where it helps. Inicio: plan activo + próximas clases side by side. Mi caballo: profile + ración diaria next to salud. Mi plan: plan card + historial de pagos.
- The green header and DEMO bar span the full width, aligned with the content.

## 2. No "Más" on desktop: show everything in the sidebar
- On desktop, the sidebar lists every section directly: **Inicio · Clases · Mi plan · Mi caballo** (only if they have a boarded horse) **· Pagos · Eventos · Perfil / Jinetes · Instalar app · Ajustes / idioma**, plus **Salir** at the bottom.
- The same for management: every section in the sidebar (no "Más").
- Phones keep the bottom tab bar with "Más" as it is now.

## 3. A way back (both families and management, phone and desktop)
- **Clicking the logo** (top left) always goes to the role's home (Inicio for families, Resumen for management).
- **Detail pages** (a horse, a family, a class, a payment, an event) get a **← back** link at the top left, labeled with where it goes ("← Caballos", "← Familias"). It returns to the list with the same scroll position and filters.
- Desktop: a small breadcrumb under the header (e.g. "Dirección / Caballos / Relámpago").
- The browser's back button keeps working the same way (every screen has its own URL).

Check it in `/demo` on a laptop (1280 / 1440 px) as Familia and Dirección, and on a phone (unchanged apart from the back links).
