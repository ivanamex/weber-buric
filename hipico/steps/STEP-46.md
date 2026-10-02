# STEP-46: the hero ends in a horseshoe curve

**Do this first, before 44/45.** Drawing approved by Ivana: `steps/drafts/step-46-horseshoe-hero.png`. **Change only the hero; everything else on the page stays as it is.**

## The shape
- The hero video keeps filling the screen **edge to edge on both sides** (no frame on the sides).
- Only the **bottom** is cut as a **half curve down, like the toe of a horseshoe facing up**: the sides go straight down to about 70% of the hero height, then the edge curves down to its lowest point in the middle (in the drawing, viewBox 1440 × 980: `M0 0 H1440 V660 C1440 860 1110 960 720 960 S0 860 0 660 Z`).
- **Perfectly symmetric:** the left and right sides start curving at exactly the same height, and the curve is a mirror image around the center (Ivana's sketch was rough; the drawing's path is the reference, not the sketch). Same for the band and the nail holes, which are placed symmetrically from the center out.
- Implement with an SVG `<clipPath clipPathUnits="objectBoundingBox">` (or CSS `clip-path: path()` from a responsive SVG) on the hero media, so the curve scales with the screen.

## The horseshoe band
- Along the curve only (not on the sides): a band **22 px** wide in bark `#68604D` with a darker edge `#3A3A2E` (30 px under it), like iron.
- **Nail holes:** small round holes (7 px) in parchment `#F1EAD8` along the middle of the band, evenly spaced ~110 px, none at the very ends.
- The band is drawn in the same SVG, so it always sits exactly on the curve.

## Around it
- The page background under the curve is the next section's background (it shows through the curve's corners). Until STEP-44 decides the palette, use parchment `#F1EAD8` there.
- Title, line and buttons stay where they are, always above the curve (never on the band). Chips (Saltos · Caballos · Niños) move up so they don't touch the band.
- **Phones:** the same idea, a narrower and slightly deeper curve, band 14 px, holes 5 px.
- Reduced motion: unchanged (it's static).

## Check
1440, 1920 and 390 px screenshots compared with the drawing: the sides full width, the curve and band only at the bottom, nothing overlapping the band, the rest of the page unchanged.
