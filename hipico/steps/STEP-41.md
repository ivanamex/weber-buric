# STEP-41: the app on a computer looks stretched

Screenshot of `/demo/familia` at 1920 px: the Inicio plan card spans ~1450 px, and "Confirmar clase" / "Cambiar plan" are each ~650 px wide and 70 px tall. Nothing about the content changed; the desktop layout from STEP-30 lets everything grow to the full width, and STEP-40's green header made it obvious.

## Fix (desktop ≥ 1024 px only; phones unchanged)
- **Content width:** the family content area is max **1080 px**, left-aligned next to the sidebar with 48 px padding (not centered across a 1920 screen).
- **Inicio = 2 columns** (7/5): left = the green header card (greeting, rider chips, plan activo); right = Próxima clase + Pagos por vencer stacked. The green card is no taller than its content (~360 px), not a full-width banner.
- **Buttons are never stretched on desktop:** `width: auto`, padding 12 × 22 px, height 44 px, side by side and left-aligned. Only phones keep full-width buttons. This applies across the app (families + management): search for `width: 100%` / `flex: 1` on buttons inside desktop layouts.
- **Type scale on desktop:** the plan count ("1 de 8 clases") 32 px, labels 13 px, body 16 px, the same as on phones plus no more than 15%.
- The horseshoe row stays its natural size (no stretching to fill).
- The same max-width + 2-column rule for Mi plan, Mi caballo and Pagos.

## Check
`/demo` as Familia and Dirección at 1280, 1440 and 1920 px: no button wider than ~260 px on desktop, the content never wider than 1080 px, Inicio in 2 columns; 390 px phone unchanged. Send screenshots at 1440 and 1920.
