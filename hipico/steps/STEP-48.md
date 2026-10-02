# STEP-48: final polish of the new layout

Ivana (2 Oct, 09:54): "with this we are very close to wrapping up."

## 1. Photo crops: no cut heads
- The **Pensión** card cuts off the horse's head. Use `img/gallery/horse-rope-jungle.webp` for that card (the whole head at the fence), or keep the paddock photo with `object-position` that shows the heads; whichever shows a full head at 1440 and 390 px.
- Check all 4 service cards and the lightbox photos at 1440, 1024 and 390 px: **every horse head and every face fully inside the frame.** Set a focal point per image in `content.js` (`position`).

## 2. The 4 colorful boxes: icons + hover
- Each box gets a line pictogram (same stroke as the site's icons, 32 px, top-left above the title): **Campamentos** = a tent, **Pony Friday** = a pony head, **Fiestas infantiles** = balloons, **Desarrollo personal con caballos** = a hand with a heart (or a compass).
- **Hover (desktop):** the box lifts 4 px with a soft shadow, its color darkens a touch, the icon does one small wiggle (rotate −6° → 6° → 0°, 400 ms) and the "→" slides 4 px to the right. **Tap (phones):** a short press-down (scale .98). The whole box is clickable (WhatsApp / the lightbox). Reduced motion: only the color change.

## 3. Buttons: a new hover (no more letter hop)
- Remove the hop of the label **and** the little fence.
- New hover for the green glass buttons: a **light sheen sweeps across** the glass (a soft diagonal highlight moving left → right, 700 ms), the button rises 1 px and its glow gets slightly stronger. The text stays still.
- Active: press down 1 px. Focus-visible ring stays. Reduced motion: just the glow.

## 4. Nav in ALL CAPS
- The nav links back to uppercase: Archivo `font-stretch: 80%`, weight 600, 14 px, letter-spacing 0.08em. "App del club" in the nav: uppercase too, centered. The scroll-spy underline stays.

## Check
1440 + 390 px screenshots: full heads in every card, the boxes with icons and their hover, the sheen on the buttons with no moving letters, the nav in caps.
