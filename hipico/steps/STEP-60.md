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

## Website payment step (Clases lightbox → "¿Cómo quieres pagar?")
Ivana's screenshots: the buttons have no hierarchy, and their colors and transparency look random. "Transferencia" is a dark pill that doesn't read as a choice, "Subir comprobante" doesn't say it uploads a file, "Lo subo después desde la app" is an unstyled native button, and **card payment is missing**.

**Same pattern as the app's `PayDialog` (STEP-58), so the site and the app match:**
1. **Payment method as option cards** (radio cards, not pills): one row of three on a computer, stacked on phones.
   - Each card has an icon, a title and one line: **Transferencia** ("Desde tu banco, subes el comprobante"), **Tarjeta** ("Crédito o débito con Mercado Pago"), **En el club** ("Efectivo o tarjeta en la oficina").
   - Rest: warm white, hairline border. Hover: level 2. Selected: mustard 2 px border, light mustard tint and a check in the corner.
2. **Card missing:** it's hidden because the Mercado Pago keys aren't in Vercel yet. Until they are, the Tarjeta card still shows, disabled and greyed, with a "Muy pronto" pill. That way Mara and visitors see that card payment is coming. Once the keys are in, it works (STEP-53 flow).
3. **Transferencia → upload as a drop zone, not a button:**
   - a dashed-border box (sand) with an upload icon, "Sube tu comprobante" and "Foto o PDF · hasta 10 MB · toca o arrastra";
   - after choosing a file, it shows the file name with a thumbnail and a "Cambiar" link;
   - then the main mustard button **Enviar comprobante**, disabled until a file is chosen;
   - **"Lo subo después desde la app"** becomes a level 1 text link under it, with no box. Today it's an unstyled native button.
4. **En el club:** one line ("Paga en la oficina del club; tu lugar queda apartado") + **Apartar mi lugar**. This creates the charge with `meta.payAtClub` (as in STEP-58).
5. **Hierarchy in the whole panel:** one mustard button per screen (the main action). Everything else is an option card, a drop zone or a text link. The ¿Dudas? pills stay sage.
6. The summary line capitalizes names: "12 clases al mes · Ivana · $6,900" (today it shows "ivana").
- The app's `PayDialog` uses the same option cards and the same drop zone.

## Clases lightbox: choosing the option (better UX than 6 equal boxes)
**Skip this section in STEP-60: it is built in STEP-63 from the approved draft.** Chat Claude draws it (`steps/drafts/step-60-clases.png`), and this section is built only after Ivana approves the draft. The direction below is the starting point for the draft.

Ivana's screenshot: six white boxes of uneven height on cream, all with the same weight. Plans and single classes are mixed together, "A tu medida" looks like something you can buy, and "Continuar" sits greyed out below the fold.

**New flow (right column, ES/EN):**
1. **Two-tab switch at the top** (segmented, level 2): **Plan mensual** (default) · **Sin plan**.
2. **Plan mensual:**
   - a 3-part selector **4 · 8 · 12 clases al mes**, with 8 preselected and a small "Más elegido" tag above it;
   - under it, **one summary card** for the selected plan, light sage edge: "8 clases al mes" (large), "2 por semana · el plan corre de fecha a fecha", "$613 por clase", and the price **$4,900** large on the right;
   - the card updates as you switch 4/8/12, with no layout jump.
3. **Sin plan:** a list of two rows (radio rows, not boxes): **Clase muestra** $500 "Para conocer el club · una por jinete" and **Clase suelta** $750 "Cuando quieras, sin plan". Clase muestra is preselected.
4. **A tu medida** is not an option. It's a text link under the selector: "¿Necesitas días u horarios a tu medida? Escríbenos →", which opens the contact form prefilled.
5. **Sticky footer** in the right column, always visible without scrolling: the selected option and price on the left ("8 clases al mes · $4,900"), and the mustard **Continuar** on the right. It's never disabled, because something is always selected.
6. The description at the top shrinks to one line ("De principiante a avanzado, desde los 2 años."), so the whole choice fits at 1440×900 with no scroll inside the panel.
- Phones: the same, stacked, with the footer stuck to the bottom of the sheet.
- The next steps (rider details, payment) use the same sticky footer, so the main button is always in the same spot.

## Hoy: say what the numbers mean
Ivana: the "1/4", "2/3" pill on each class card is not understandable ("if I struggle, the client will").
- Replace it with words and an icon: a rider icon + **"1 de 4 lugares"**. In a tooltip/sub-line: "3 libres". Full class: "Llena · 4 de 4" in terracotta.
- The same rule applies everywhere a bare fraction appears (Horario week grid "2/3", Resumen "17/66", plan counts "2/4"): always words, e.g. "2 de 4 clases", "17 de 66 lugares". `npm run check:hover` doesn't cover this, so Claude Code greps the components for `{x}/{y}` displays and lists what it changed.
- On the same screen:
  - the rider's tag "Plan" becomes **"Del plan"** (vs "Muestra", "Suelta", "Adicional");
  - "Plan al corriente · quedan 0" becomes **"Plan pagado · 0 clases restantes"**, plus a small terracotta "Renovar" hint when it's 0;
  - the horse line keeps "Zafiro · propio" on one line ("propio" as a small pill after the name).

## Logo hover in the app header
Ivana's screenshot: hovering the logo puts a brown/mustard box over it, like a mask, and the browser's "Inicio" tooltip covers "RIVIERA MAYA".
- The logo gets **no background and no box** on hover. Its only hover: opacity .85 and the pointer. Same on the site bar and the desk sidebar logo.
- Remove the `title="Inicio"` tooltip. Keep `aria-label` ("Hípico Riviera Maya, inicio") for screen readers.
- `check:hover` accepts an opacity change as a hover, so the logo passes without a background.
