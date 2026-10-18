# STEP-78: shop photos fill their box (no white bands on the sides)

Ivana (18 Oct, `/tienda`, screenshot): FreeRide's photos come in three kinds: grey studio, lifestyle (outdoors), and pure white. The box is white and the photo is "contained", so grey and lifestyle photos get **white bands on the left and right**, which looks unfinished. White photos are fine as they are.

## The fix: fill the box with the photo's own background
For every shop photo box (cards, product window gallery and thumbnails, cart / list lines, panel):
1. **Box ratio 3:4** (FreeRide's photos are about 2:3, Mara's cut-outs 4:5, so less is left to fill).
2. **Behind the photo**, the same image as a backdrop: `object-fit: cover`, `filter: blur(28px) saturate(1.05)`, `transform: scale(1.2)`, `overflow: hidden` on the box. A grey studio photo extends into the same grey, a lifestyle photo into its own colors, a white photo stays white. No detection needed.
3. **The photo itself** on top: `object-fit: contain`, centered, never cropped (so a shirt's collar or a boot is never cut off).
4. Mara's own photos (`/img/shop/…`, already on white) and any photo whose box is pure white simply look white; the backdrop is harmless there. Skip the backdrop only for the cart / list thumbnails under 64 px (plain `cover` there).
5. The card body under the photo stays as it is (warm white for Mara's, sand for FreeRide's).
- Lazy-load both layers together (one `<img>` + the backdrop as the same `src`, so the browser fetches it once).
- Reduced data (`Save-Data`): no backdrop, the box's background takes the photo's average edge color via a CSS fallback `#EDEDED`.

## Check
- `/tienda` at 1440 and 390: the Kate Show Shirt cards (grey) have no white side bands, a lifestyle product (e.g. a breech photographed outdoors) extends into its own colors, the Polo Belt (white) stays white; Mara's 7 cards unchanged.
- The product window and the gallery thumbnails look the same way.
- Screenshots of one row with all three kinds side by side in the report.
- `npm run build` and `npm run check:hover` pass.
