# STEP-68: last fixes before the video

## 1. Clases lightbox opens at the top and fits Ivana's screen
Ivana's screen: 1920 px wide, about **830 px of page height** (browser chrome included). The lightbox opens **already scrolled to the middle**, so the "Clases" title is cut, and the choice still needs a scroll.
- On every open (and on every step change: choice → details → done), the right column scrolls to the top (`scrollTop = 0`). No autofocus that scrolls the panel down. Focus goes to the close button or the panel itself, never to a field below the fold.
- Denser, with these numbers at a viewport height of 900 px or less (use `@media (max-height: 900px)`):
  - panel padding 28 px;
  - "Clases" 40 px, with the one-line description next to it on the same baseline (computer), not under it;
  - no "¿Cuántas clases al mes?" label (the cards say it);
  - tabs 36 px;
  - 4·8·12 cards 64 px (number 28 px + one line "1 por semana · Para empezar");
  - summary card 18 px padding, the three ✓ lines at 14 px, price 34 px;
  - sticky footer 64 px.
- **The test is Ivana's real size:** Playwright at **1920×830 and 1440×760**, with screenshots of the choice step in both tabs. The panel shows no scrollbar, and the title, cards, summary, row and footer are all fully visible. Put the screenshots in the report.

## 2. "A tu medida" and "¿Dudas?" on one tidy row
Ivana's screenshot: "Escríbenos →" has a mustard underline that looks random, and the WhatsApp and Mensaje pills are stacked one above the other.
- One row under the summary card: left, "¿Necesitas días u horarios a tu medida? **Escríbenos →**" (the link is olive text, semibold, with no underline at rest; on hover the level 1 underline under the baseline). Right, "¿DUDAS?" + the WhatsApp and Mensaje pills **side by side** (36 px, `flex-wrap: nowrap`).
- If the row doesn't fit (narrow screens), the pills go to their own line, still side by side. Never stacked one above the other.

## 3. The horse runs on all four legs
Ivana: the horse limps; its front right leg never moves. Cause: the canter cycle only alternates two poses that share the same front leg.
- Ivana is generating a **canter cycle** (6 frames, same silhouette style). Chat Claude cuts it into `public/img/course/canter-1.png` … `canter-6.png` (same frame height and baseline as the other poses).
- The ground gait loops canter-1 → 6 at about 90 ms per frame (a full stride about 0.55 s) with a light bob. Take-off / over / landing stay as they are.
- **If the canter frames aren't in the folder yet, skip this part and say so in the report** (the rest of the step goes ahead).

## Check
- The screenshots from part 1 at 1920×830 and 1440×760.
- A screenshot of the row from part 2 at 1440 px and at 390 px.
- A short recording of one course loop: all four legs move, with no limp.
