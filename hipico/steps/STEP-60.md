# STEP-60: hovers with a fine line (three levels)

Ivana (15 Oct, the site's nav): "VISÍTANOS" on hover turns into a full mustard pill. The bar then reads button, button, button, which is too aggressive. Before STEP-53/54 the hovers were almost invisible. The fine line between the two: **a hover never makes an element look like more than it is at rest.** A link stays a link, a pill stays a pill, and only real buttons look like buttons.

## The three levels (tokens in `styles.css` + `site.css`, shared)
1. **Text level**, for nav links, text links, table headers, unselected tabs and the sidebar items in the app:
   - no background, no pill;
   - the text turns deep mustard `#A9781F` on light backgrounds (AA on parchment), or light mustard `#E9C27A` over the video and on dark green;
   - a 2 px mustard underline grows from the center (200 ms), the same line as the scroll-spy underline;
   - the active section/page keeps its underline, in olivewood on light and white on dark.
2. **Soft level**, for pills, chips, rows, cards, tiles, outline and secondary buttons:
   - a mustard tint fill, `rgba(217,164,65,.14)` (rows `.08`);
   - the border turns mustard at 40%;
   - the text stays olivewood;
   - tiles and cards also lift 2 px.
   - No glass, no full mustard.
3. **Button level**, only for real main buttons (the mustard `btn--primary` / `sbtn--deep`, "Agenda una clase muestra", Pagar…):
   - they are already mustard at rest; the hover is the sheen sweep + 1 px lift + a slightly deeper shadow;
   - the color doesn't change.

## Where each goes (examples, not the full list)
- Site nav (QUÉ HACEMOS… VISÍTANOS, ENTRAR): **level 1**. "App del club" stays a button (glass), with the level 3 hover.
- ES/EN toggle, hero chips (Saltos · Caballos · Niños), concept pills, segmented tabs: **level 2**, but unselected segmented tabs are **level 1**.
- App sidebar items: **level 1** plus a 3 px mustard bar on the left; the active item keeps its current fill.
- Table rows and message rows: **level 2** (`.08`).
- Total tiles, Resumen tiles, quick tiles, the 4 boxes on the site: **level 2** with the lift. The colored boxes keep their own color and deepen it a touch instead.

## Implementation
- Replace `--mg` / `--mg-soft` with `--hover-text`, `--hover-soft` and `--hover-btn`, and map every element from STEP-53/54/57 to one of them.
- `npm run check:hover` (STEP-57) also reports elements whose hover adds a **background** while they are at level 1 (nav, links, tabs). That's the "too strong" case.
- `:focus-visible` matches the same level. Reduced motion: no underline animation and no lift, only the color.

## Check
- At 1440 px, on `/` over the video and after scrolling: hovering each nav link shows only the color + underline, never a pill.
- In the app: the sidebar, tables, tabs and tiles each at their level.
- Screenshot pairs (rest / hover) for 6 examples in the report.

## Bug: "ENTRAR" on hover over the hero (Ivana's screenshot)
On hover, ENTRAR turns dark olivewood on the dark video, so it becomes unreadable, and a line runs **through the middle of the letters**. It looks struck through. The underline's `::after` is placed at the vertical center (or the scroll-spy/sheen bar sits in the wrong spot), and the pill background is probably clipped by `overflow: hidden`.
- Fix: ENTRAR follows level 1. Over the video and the dark bar, the text is light mustard `#E9C27A` with the underline **under** the baseline (`bottom: -6px`, 2 px), never across the letters. Over the parchment bar after scrolling, the text is deep mustard `#A9781F` with the same underline.
- Check every nav link and the ES/EN toggle in both bar states (over the hero / after scrolling) for the same bug: text color vs background, and where the line sits.
- Add a screenshot pair of ENTRAR (rest / hover) in both bar states to the report.

## Hero buttons: one mustard, one green glass
Ivana (screenshot, hovering "Ver clases y precios"): both hero buttons turn mustard, so the hero has two yellow buttons.
- "Agenda una clase muestra" stays the mustard main button (level 3).
- "Ver clases y precios" goes back to the **green glass** it had before STEP-53/54 (sage → olive glass, white text, `backdrop-filter`, white edge, the light sweep on hover). Its hover stays green: a slightly brighter glass + the sweep + 1 px lift, **never mustard**.
- The same rule applies everywhere: a secondary glass button keeps its own color on hover. Only level 2 elements get the mustard tint.

## Bug: the nav bar sits on top of the hero title while scrolling
In the same screenshot (scrolled about 300 px), the transparent bar overlaps "CLUB HÍPICO EN LA SELVA DE PAAMUL": the nav links run through the title, and the logo sits on the "C".
- The bar gets its background (olivewood glass with blur, white text) **as soon as the page scrolls past 8 px**, not only after the hero. It stays fully transparent only at the very top.
- Check it at 1280, 1440 and 1920 px while scrolling slowly through the hero: the links are never drawn over the title.
