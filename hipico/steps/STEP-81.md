# STEP-81: photos on white stay plain white (no grey blur behind them)

Ivana (18 Oct, screenshot "Bit Belt | Black Sparkle"): some products shot on white (mostly belts and other accessories) now show a white photo with grey smudges above and below it. The blurred backdrop from STEP-78 blurs the dark product itself into the empty part of the box. Everything else looks good.

## Fix: know which photos are on white, and skip the backdrop for them
- **During the FreeRide copy** (`api/_fre.js`, used by the build and the cron): for each product image, fetch a tiny version (`?width=48`), decode it (`sharp`, already fine on Vercel's build; add it as a dependency if missing), and look at the outer 3-pixel frame. If 92 % or more of those pixels are near white (every channel ≥ 238), the photo is **on white**. Store it per image: `fre_catalog.images_bg text[]` (`white` | `photo`), same order as `images`. Max 8 images per product, 6 in parallel, 4 s timeout each; on any error → `photo` (today's look). Bump `FRE_RULES` so the next deploy recopies everything.
- **Mara's photos** (`/img/shop/…` and uploads in `shop-photos`): the panel's upload already resizes in the browser, so check the same frame there and save `photos_bg` alongside `photos` (her current seven: the pants cut-outs are `white`, the two Cassidy photos `photo`).
- **Front end** (`ShopPhoto` or wherever STEP-78 put the backdrop): `white` → plain `#FFFFFF` box, the photo `contain`, **no backdrop**; `photo` → the STEP-78 blurred backdrop as now. Unknown (old cached data) → `photo`.
- `public_fre_catalog()` / `public_shop()` return the background per photo.

## Check
- Every belt, sock and glove shot on white shows clean white with no smudges; the grey studio shirts and lifestyle photos keep their filled backdrop.
- In the report: how many FreeRide images came out `white` vs `photo`, and 6 thumbnails of each so Ivana can spot a wrong one.
- `npm run build` passes, the build still never fails if FreeRide or an image can't be reached.
