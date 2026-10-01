# STEP-37: focus pass on the website (shorter, fun first, consistent)

Run **after STEP-36** (the videos must be wired first). Audit of 1 Oct, measured on a local build at 1440 px: the page is **14,176 px tall (16 screens)**. The best content (video, photos, the app) is at the bottom, and "La app" alone is 2,719 px of mostly empty dark green with a small phone.

**Target:** desktop page **≤ 9,000 px**, phone ≤ 10,000 px. Every section after the hero is **at most one screen tall on desktop**: no pinned/sticky scroll sections anymore.

## 1. New order
1. **Hero: full-bleed background video** (the 3 scenes from STEP-36, cross-fading, cover, 100svh). The headline "Un club a caballo, en la selva de Paamul" and the sub copy sit bottom-left in **white** over a dark gradient scrim (bottom-left only); buttons below them. The nav is transparent over the video (white text) and turns to the mist glass after scrolling. The chips (Saltos · Caballos · Niños) sit bottom-right. Remove the framed box and the dotted course line from the hero. Phone: the same video, 100svh, text at the bottom.
2. **Disfruta: moved up to right after the hero.** The two moving rows of photos and clips, rows 240 px tall (160 on phones). Replace the giant "DISFRUTA" word with a normal section title on one line.
3. **Qué hacemos** (bento) with **Aprende a montar** folded into it: the 4 steps become one compact row under the bento (not their own section).
4. **Competencias:** one screen, no pinning. Left: `hooves-sand.mp4` (rounded, 4:5). Right: the 2 short stories + "Campeón Estatal 2024" with the rosette.
5. **Equinoterapia:** one screen. `grooming.mp4` + text + the 3 steps in one row + the CTA.
6. **Pensión y caballos:** one screen, `paddock-herd.mp4` as described in STEP-36.
7. **La app:** **one screen on mist (not dark green), no pinned phone.** The phone on the left (static, showing Inicio), the 3 statements stacked on the right, all visible at once, then "Descargar la app". Delete the long scroll.
8. **Comunidad:** the families photo + the events row, one screen.
9. **Visítanos**, then the footer.

## 2. Consistency rules
- **Numbers are all the same color.** In the 4 steps (and the 3 Equinoterapia steps) every number is deep `#10271F`, no peach first number. The steps show progress with the line above them instead: it fills from left to right as the row comes into view.
- **One accent system:** text and icons in deep / jungle only. Peach and lilac appear only in the main buttons, the hero/Equinoterapia glows and the progress line. No peach or lilac text, numbers or icons.
- Same section padding everywhere (96 px top and bottom on desktop, 64 on phones), the same title size for every section title, and the same card radius.
- The numbered side labels ("01 — …") stay, renumbered to the new order.

## 3. Check (Claude Code: measure, don't guess)
Build locally, take full-page screenshots at 1440 and 390 with Playwright, and report: total page height (≤ 9,000 / ≤ 10,000), the height of each section (none taller than 900 px on desktop except the hero), and that no section has more than ~30% empty space. Send Ivana the two screenshots with the report.
