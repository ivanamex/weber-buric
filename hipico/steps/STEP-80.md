# STEP-80: shop cards get the site's shadow and a matching hover

Ivana (18 Oct): the product cards in `/tienda` should have the same soft shadow as the rest of the site's cards (the 4 colored boxes, the service cards), for consistency. And a hover that goes with it.

## At rest
- Product cards (Mara's warm white and FreeRide's sand) use the **same shadow token as `.sbox` / the site cards** (the soft long shadow), the same radius (22 px), and **no hairline border** (the shadow does the edge, like the other cards). The white photo box inside keeps its 1 px hairline only where it meets the card body.
- Same in the app's shop and in the filter menus' cards (lighter shadow for those).

## Hover (computer only, level 2 "cards" as in STEP-60, no mustard tint on a photo card)
- The card **lifts 4 px** and its shadow deepens (the same move as the 4 colored boxes), 220 ms ease.
- The photo: if the product has a second photo, it **cross-fades to it** (400 ms; already built); if not, the photo **zooms to 1.04** inside its box (the blurred backdrop from STEP-78 zooms with it, nothing leaks out).
- The name gets the level 1 underline (mustard, growing from the center), so it reads as clickable.
- A small "Ver →" appears at the bottom right of the card body, fading in (Mara's: olive; FreeRide's: bark), the same as "Ver →" on the Resumen tiles.
- Tap on phones: scale .98 for 120 ms, no lift.
- Reduced motion: only the shadow change, no lift, zoom or fade.

## Check
- `/tienda` at 1440: rest and hover screenshots of a Mara card, a FreeRide card with two photos and one with one photo; the shadow matches a `.sbox` on `/` side by side.
- `npm run check:hover` passes (the cards count as level 2 with a lift).
