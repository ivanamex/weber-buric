# STEP-79: FreeRide products with more than color + size (grip, length, sleeve)

Ivana (18 Oct, `/tienda?p=fre:define-breeches`, screenshot): the "Talla" area shows waist sizes 22–36 and then ~40 pills reading only "Full Seat" / "Knee Patch", repeated. The gallery mixes several colors with no way to tell which is which.

## Cause (confirm it on the real data)
FreeRide's products can have up to 3 options: Color, Size, and a third one such as **Grip** (Full Seat / Knee Patch), **Length** (Regular / Petite) or **Sleeve** (Long / Short). Some also pack two things into one value ("Full Seat / 26", "26 Petite"). `api/_fre.js` only knows color + size, so the extra option ends up inside the sizes and the values are cut down to their first word. Open the cached `products.json` entry for `define-breeches` and two or three others (a show shirt with sleeves, a breech with Petite) and put their raw `options` + 3 variants in the report.

## Fix
1. **Read every option by name.** `variants` become `{ color, size, extra: { grip?, length?, sleeve?, style? }, available, image }`. Known names → our keys (grip/seat, length/inseam, sleeve, style/fit); anything else → `style`. A value that holds two parts ("Full Seat / 26") is split on " / ", "-" or a space before a size and each part goes to its option.
2. **Sizes are only sizes**, deduplicated and in order (XXS…XXXL, kids 4-5…12-13, waist 22…36). Waist sizes keep their number with the letter after it where FreeRide gives one ("26 · S"); `sizeKey()` maps 22→XXS, 24→XS, 26→S, 28→M, 30→L, 32→XL, 34→XXL, 36→XXXL for the Talla filter.
3. **Product window:** each extra option is its own small segmented row above Talla, translated:
   - Agarre: **Asiento completo** · **Rodilla** (Full Seat / Knee Patch)
   - Largo: **Regular** · **Corto (Petite)**
   - Manga: **Larga** · **Corta**
   - anything else: its value as FreeRide writes it.
   The first available value of each is preselected; Talla shows only the sizes that exist for the chosen color + options, struck when FreeRide has none.
4. **Photos follow the color:** use each variant's `featured_image` / image `variant_ids` to group photos by color; choosing a color shows its photos first (others after, dimmed thumbnails). Products without that link keep the order they have.
5. **The list (wish list) line** shows everything chosen: "Define · Sage · Rodilla · Regular · 26 (S)". The WhatsApp text and the panel's Listas / "Pedir a FreeRide" show the same.
6. Compact size pills (40 px, 6 px gap), so one size row fits on a computer.
7. Bump `FRE_RULES` so the next deploy recopies the catalog with the new parser.

## Check
- `define-breeches`: Agarre and Largo rows, sizes 22–36 once each, photos change with the color, the line in the list reads every option.
- A show shirt with Long/Short sleeve and a product with only size, both look right.
- In the report: how many FreeRide products have an extra option, by name.
- `npm run build` and `npm run check:hover` pass.
