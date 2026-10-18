# STEP-82: the shop starts right under the hero, and plain backgrounds filled with their own color

Ivana (18 Oct, 1920 px screen, `/tienda`):
1. Products on plain light backgrounds (the Bondi thongs: white, off-white, light grey) still get dark blurred smudges above and below the photo. STEP-81's white test is too strict (an off-white or light grey frame fails it and falls back to the blur).
2. Too much height before the products: a tall hero, a big gap, the tabs, then the filters. On a normal laptop / 1920×~900 screen the first products should be visible without scrolling.

## 1. Fill with the photo's own edge color
Replace STEP-81's yes/no white test with the photo's frame color:
- During the copy (`api/_fre.js`) and on Mara's uploads: from the tiny image, take the outer 3-pixel frame; compute its **average color** and how much it varies (standard deviation over the frame, per channel).
- **Uniform frame** (deviation ≤ 14 on every channel, whatever the color: white, off-white, light grey, studio grey, beige): store that color as hex (`images_bg[i] = '#F2F1EF'`). The box is filled with **exactly that solid color**, the photo `contain` on top, no blur. The photo melts into the box with no visible edge.
- **Not uniform** (lifestyle, outdoors): `images_bg[i] = 'blur'`, the STEP-78 blurred backdrop as now.
- Mara's cut-outs on white → `#FFFFFF`; her two Cassidy photos → `blur`.
- Old values (`white` / `photo`) still read as `#FFFFFF` / `blur`. Bump `FRE_RULES` so the next deploy recopies.
- In the report: 6 thumbnails per kind (solid / blur) with the color picked.

## 2. Products above the fold
Target: at **1920×900 and 1440×800** (browser inside size), the first row of product cards shows at least its **photos fully** without scrolling; at 1280×720 at least the top half of the photos.
- **Hero shorter:** about **300 px** on a computer (from ~420), 200 px on phones. Same photo and focal point, the title 40 px, the line under it, the "Ver productos" button removed (the products are right there).
- **One toolbar right under the hero** (24 px below it, no big gap), sticky under the site bar while scrolling:
  - left: the category tabs (as now, a bit smaller: 40 px tall, 14 px labels, counts as small pills);
  - right, on the same row on a computer: a **search field** "Buscar en la tienda" (icon, 40 px, 220 px wide, grows to 300 on focus; searches name and color in Mara's stock and FreeRide's, in the address `?q=`), then the three menus **Para · Talla · Color** (as STEP-76, 40 px), then the heart and bag (40 px round).
  - Below 1440 px the menus + search go to a second row; on phones: tabs scroll on row 1, row 2 = search (full width) + a single **Filtros** button that opens one sheet with Para, Talla and Color.
- "Quitar filtros" and the "N productos" count sit in one small line under the toolbar, only when a filter or a search is on.
- The section titles ("Entrega inmediata en el club", "Todo FreeRide · sobre pedido") at 24 px with 16 px above the grid; 40 px between the two sections.
- Search with no results: "No encontramos «{q}». ¿Lo buscamos por ti?" + the WhatsApp line.

## Check
- Screenshots at 1920×900, 1440×800, 1280×720 and 390×844 of the first screen of `/tienda` (no scrolling) in the report.
- The Bondi thongs (white, black, off-white) and a grey studio shirt: no smudges, no visible box edge; a lifestyle photo keeps the blur.
- Search "navy" finds Mara's Azul marino breeches and FreeRide's navy pieces.
- `npm run build` and `npm run check:hover` pass.
