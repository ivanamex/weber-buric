# STEP-77: a lighter nav bar

Ivana (18 Oct): the items in the site's nav bar are too big and the bar fills almost the whole width. The bar's height stays; the items shrink and gather on the right.

## Sizes (computer, `site.css`)
- Links (Qué hacemos … Visítanos, Tienda, ENTRAR, ES ▾): **12 px**, Archivo 80 %, weight 600, letter-spacing **.06em** (today 14 px, .08em), padding **0 8px**, the hover underline 1.5 px at the same place.
- "App del club": **36 px tall**, 12 px label, padding 0 16px, no 170 px minimum (natural width), same glass and hover.
- Tienda: bag icon 15 px, the "Nuevo" tag 9 px; the divider 14 px tall.
- ES ▾: 12 px, the arrow 8 px.
- Logo unchanged.

## Layout
- The links are **one group pushed to the right** (`margin-left: auto`), not stretched with `flex: 1`. Between the logo and the first link there is open space.
- **Remove the "LA APP" link** from the nav: "App del club" already takes people there, and the La app section is still reached by scrolling. The section's side number stays. (Phone menu keeps it.)
- At 1440 px the whole right group (links + divider + Tienda + ES ▾ + ENTRAR + App del club) takes **at most about 60 %** of the bar's width; at 1920 about 45 %. Measure and put the numbers in the report.
- Remove the tighter-spacing rules under 1360 / 1280 px that STEP-74 added if they're no longer needed; below 1180 px the phone menu takes over as before.
- Same sizes on `/tienda` and `/descargar`'s header so all bars match.

## Check
- Screenshots at 1280, 1440 and 1920 px, ES and EN, over the hero and scrolled, plus `/tienda`.
- The scroll-spy line and the hover underline still sit under the words; text stays AA over the video.
- `npm run check:hover` passes.
