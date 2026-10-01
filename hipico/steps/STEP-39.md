# STEP-39: site rhythm: fewer videos, the gallery lower, hoofprints in the sand

Run after STEP-38. Today the page has video almost everywhere: the hero, then two moving gallery stripes right below it, then hooves, grooming and the herd. That's too much. The fix is a middle ground: **2 videos on the whole page**, the rest real photos.

## 1. Video budget
- **Hero:** keeps the 3-scene background video (the main show).
- **Equinoterapia:** keeps `grooming.mp4` (calm, fits the topic), in a 16:9 rounded frame next to the text, never cropped to fur.
- **Everything else uses stills:**
  - **Competencias:** `jump-sunset.webp` (from `img/gallery`) as the main image + the round rosette (`rosette-campeon`). No video.
  - **Pensión:** a simple two-column layout on mist: on the left, `paddock-herd.webp` (the poster frame) as a photo, rounded, 4:5; on the right, the Pensión list and "Caballos en venta" stacked as plain text blocks with a thin divider (no white cards, no overlay).
  - Remove `paddock-face.mp4` from the gallery.

## 2. Order
Hero → **Qué hacemos (+ Aprende a montar steps)** → Competencias → Equinoterapia → Pensión y caballos → La app → Comunidad (+ events) → **Disfruta gallery** → Visítanos → footer.
- The **gallery moves down** to just before Visítanos, as **one row** of photos (stills only), slowly moving, 260 px tall (180 on phones), pausing on hover. One row, not two.

## 3. Hoofprints in the sand (the signature effect)
The background of the **Aprende a montar** row (the 4 steps) becomes **arena sand** (`#E9DCC6` with a fine grain), and **hoofprints press into it**:
- A trail of hoofprints, **embossed** (light from the top left: a darker inner edge, a light rim), walks diagonally across the band as the row scrolls into view, one print every ~250 ms, the step tiles on top.
- On desktop, moving the mouse over the band leaves fresh prints along the pointer's path (throttled; real gait spacing; alternating left/right).
- Prints fade back into the sand after ~6 s.
- **Shape:** a real hoofprint (a rounded U-shaped hoof wall with the V of the frog inside), not the horseshoe icon.
- **Tech:** WebGL fragment shader for the emboss (a height map of the print sprite → normals → lighting), drawn into a canvas behind the tiles; fall back to a 2D canvas with a pre-rendered embossed sprite if WebGL isn't available. Pause when off-screen. Reduced motion: 6 static prints, no animation. No new heavy library (plain WebGL or `ogl` at most).

## Check
1440 + 390 px: only 2 videos on the whole page (hero + Equinoterapia); no moving stripes under the hero; the gallery is one row near the end; Pensión has no overlay; the sand band shows embossed hoofprints walking across and following the mouse on desktop; static prints with reduced motion. Total page height and section heights reported as in STEP-37.
