# STEP-76: shop filters as three small menus, and "Para quién" instead of Niña / Niño

Ivana (17 Oct, `/tienda` filter row): the row of size pills + color + Niña / Niño is long and the logic is off: why girl / boy but not woman / man? Put the filters in drop-downs and organize them.

## The filter bar (website and app shop)
One short row under the category tabs, three menus + a reset link:

**[Para: Todos ▾]  [Talla ▾]  [Color ▾]  Quitar filtros**

- **Para** (who it's for), one choice: **Todos** (default) · **Mujer** · **Hombre** · **Niños** (girls and boys together; FreeRide's kids range is small). Mapping in `api/_fre.js`: replace `kids` with `audience` = `women | men | kids | all`, from FreeRide's type, tags, collections words and title ("Men's" → men, "Girl's / Boy's / Young Rider / Kids" → kids, "Women's" or nothing → women; belts, socks, gloves, horse items → all). Mara's own products have the same field in the panel editor (default Mujer; her breeches and the Cassidy shirt are Mujer). `all` items show under every choice.
- **Talla**, several choices with checkboxes inside the menu. The list follows **Para**: Mujer / Hombre / Todos = XXS · XS · S · M · L · XL · XXL; Niños = the kids sizes FreeRide uses (4-5 … 12-13). Shows only sizes that exist in the current tab. The button reads "Talla" or "Talla: S, M".
- **Color**, several choices: each row a swatch + name, only the colors in the current tab. Button: "Color" or "Color: Navy +1".
- **Menus:** the soft level (pill outline, 40 px, Archivo caps label), a ▾ that turns on open, a card under the button (warm white, hairline, 12 px radius, max 320 px tall with its own scroll), Esc / outside click closes, arrow keys, the count badge on the button when active. On phones each menu opens as a small bottom sheet with **Ver N productos** at the bottom.
- **Quitar filtros** shows only when something is set (level 1 link).
- The filters live in the address (`?para=mujer&talla=S,M&color=navy`) so a filtered page can be shared, and they apply to both parts (Mara's stock and FreeRide).
- Under the bar, a small line with the result count: "38 productos".
- Remove the old size pills, the color select and Niña / Niño.

## Category tabs
Keep: Todo · Pantalones de montar · Camisas · Chamarras · Accesorios · Para tu caballo (only tabs with products). Rename "Pantalones de montar" → **Pantalones** in the tab only (the product names stay). On phones the tabs scroll sideways with a fade.

## Panel
- Catálogo FreeRide: an "Para" column (Mujer / Hombre / Niños / Todos) with a small menu to correct it per product, saved as an override that the daily copy doesn't undo (`audience_override`).
- Productos (Mara's): the Para field in the editor.

## Check
- 1440 and 390, ES and EN: the bar is one row on a computer; each menu opens, filters, shows its count; Niños changes the size list; Quitar filtros resets; the address keeps the filters on reload.
- In the report: how many FreeRide products landed in each Para group, and 5 examples per group so Ivana can check the mapping.
- `npm run build` and `npm run check:hover` pass.
