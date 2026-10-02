# STEP-42: the website layout system (stop the boxes, give the imagery room)

Ivana's review of 1 Oct (7 screenshots), in short: we swing between extremes. First everything was video, then everything became small images inside boxes inside boxes, with separators that don't belong, buttons that look like text fields, and a side label nobody understands. This step sets **one layout system** and applies it to every section. Nothing outside these rules.

## The rules
1. **Only 3 section patterns:**
   - **A, Full-bleed media:** a video (or a big photo) the full width of the screen, 80–85vh on desktop and 70svh on phones. The title, one line of text and one button sit bottom-left on a dark gradient scrim (like the hero). **Never a card or text box on top of media.**
   - **B, Big split:** media on one side **7/12 of the width** (on 1440 px ≈ 760 px wide, at least 560 px tall; 16:9 for video, 4:5 for portrait photos), the text on the other 5/12: title, a paragraph, plain list lines, one button. Alternate sides from section to section.
   - **C, Plain:** text and tiles straight on the page background. Tiles only where the tiles **are** the content (the steps, the events).
2. **No box inside a box.** At most one container level anywhere. No section-sized panels or "glow panels" wrapping content.
3. **No separator lines** except between rows of a list. Remove the line above the steps.
4. **Spacing:** sections 120 px apart on desktop (72 on phones); 24 px between tiles; 32 px between a title and its content. Nothing stuck to anything.
5. **Buttons look like buttons:** on light backgrounds the main button is **solid jungle `#24503F` with white text**; the frosted glass button is used **only on video/dark** (the hero and pattern A). Secondary buttons are a deep outline. Never a pale button that reads like a text field.
6. **Remove the side labels** ("02 — COMPETENCIAS"…). The nav's scroll-spy already shows where you are. Section titles start at the left content edge.
7. **No duplicate titles** (e.g. "PENSIÓN Y CABALLOS" and then "PENSIÓN" again).

## Section by section
| Section | Pattern | Content |
|---|---|---|
| Hero | A | 3-scene video, as now |
| Qué hacemos | C | the bento, as now |
| Aprende a montar | C | **no sand container, no line**: the 4 colored step tiles straight on the page, a normal title above. The hoofprints walk across the page background behind the tiles (subtle, no box) |
| Competencias | **A** | `hooves-sand.mp4` full-bleed; "Entrenamos para competir" + 1 line + "Quiero competir" on the scrim. Below it (C): one row with 3 items, the 2 short points and Campeón Estatal 2024 with the round rosette, no boxes |
| Equinoterapia | **B** (video left) | `grooming.mp4` big; on the right the text, the 3 colored step tiles under it, the CTA. "Próximamente" as a small pill above the title, not on the video |
| Pensión y caballos | **B** (video right) | `paddock-herd.mp4` big; on the left one title, the list (plain lines with icons), the solid button, then one line "¿Buscas caballo? Pregunta por los disponibles →" |
| La app | B (phone left) | the whole phone (not cut off) + the 3 points + the button |
| Comunidad | B (photo left) | the families photo big + the text; the 3 event tiles below (C) |
| Galería | C, full width | **one row, 420 px tall on desktop (260 on phones)**, slowly moving, pausing on hover. **Clicking a tile opens a lightbox:** full screen, arrows + swipe + Esc, photos and the video clips (jump, kids, hooves, herd, grooming play in it). Tiles with a video show a small play mark |
| Visítanos | B (map right) | address, hours, WhatsApp |

**Videos visible on the page:** hero, Competencias, Equinoterapia, Pensión (the rest in the gallery lightbox). Each plays only while on screen.

## Check
At 1440 and 390 px, Claude Code sends full-page screenshots plus a short list: for each section, its pattern (A/B/C), its media size in px, and confirmation that there's no nested box, no separator and no side label. Page height ≤ 10,000 px on desktop.
