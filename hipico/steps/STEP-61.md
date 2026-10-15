# STEP-61: /descargar with the same hovers as the site

Run after STEP-60 (it uses STEP-60's three hover levels). Ivana (15 Oct, `/descargar`): we keep this page (it was made before the site's redesign), but its hovers are wrong too: the logo gets the same brown box/mask as in the app, and the buttons don't follow the new rules.

## Fixes (`pages/Landing.jsx`, its CSS)
- **Logo** (header `lheader` and hero `hero__logo`): no background or box on hover, opacity .85 only, no `title` tooltip (STEP-60 "Logo hover").
- **Entrar:** level 1 (light mustard text + underline under the baseline over the dark bar), never a pill.
- **Abrir la app** (header) and the main hero button: level 3 (mustard, sheen + lift, the color stays).
- **Ver cómo funciona:** secondary green glass, like the site hero's "Ver clases y precios": stays green on hover.
- **ES/EN, the feature tiles, the "Cómo funciona" steps, the download buttons, the QR card:** each on its STEP-60 level. Tiles are level 2 with the lift.
- **Header:** the same as the site bar: transparent only at the very top, olivewood glass as soon as the page scrolls.
- Text: the subline drops the long dash: "Confirma tus clases, lleva tu plan mensual, la pensión de tu caballo y los pagos de la escuela de equitación, todo desde el celular, sin llamadas ni hojas de cálculo."

## Check
- `npm run check:hover` covers `/descargar` (already in the audit): no element without a hover, and no level 1 element with a background.
- At 1440 and 390 px: screenshot pairs (rest / hover) of the logo, Entrar, Abrir la app and Ver cómo funciona.
