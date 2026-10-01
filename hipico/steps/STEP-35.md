# STEP-35: gradient buttons with a jump on hover, moving animal gallery

The STEP-34 look is live on `main`; build this on `main` as usual.

## 1. Buttons in the hero gradient
- Main buttons (Agenda una clase muestra, App del club, Únete a la lista…): background = the hero's gradient, **peach `#F6C6A6` → mist `#EEF1EC` → lilac `#C8B9EC`** (left to right), with the same light grain as the hero. Text deep `#10271F`, weight 650. A 1 px border `rgba(16,39,31,.12)` so the button reads on the mist background.
- Secondary buttons stay as a deep outline.
- **Hover (desktop):** the gradient slides (background-position 0% → 100%, 500 ms) and a **small show-jumping fence** draws in at the right end of the button: two thin deep posts with a striped pole (deep / mist bands, 18 × 12 px). The label **hops once** over it (translateY −3 px, then back, 280 ms). Active / tap on phones: the hop only.
- Focus-visible: a 3 px deep ring. Reduced motion: no slide, no hop, the fence just appears.

## 2. Horseshoe icon: draw it right
Wherever a horseshoe is used (app counter, icons), it must read as a horseshoe and never as an "S" or a refresh arrow: **a "U" open at the top, upright, thick even stroke, 3 nail holes on each side, slightly flared tips.** No rotation, no arrows, no gap in the curve. Replace the current icon in `Icons.jsx` / the app's pictograms.

## 3. Replace the two big images at the bottom with a moving gallery
- Instead of the two side-by-side big photos before "Visítanos": **a gallery of 2 rows of photos sliding in opposite directions**, slowly (row 1 left, row 2 right, about 60 s per loop), infinite, with no gap at the loop point.
- Photos ~320 px tall on desktop, 200 px on phones, mixed widths (portrait and landscape), 20 px radius, 16 px gap. Hover on desktop: the row pauses and the photo under the cursor grows slightly (scale 1.03).
- Above it, "Disfruta" stays as the big condensed title (deep text on mist, not white on a photo).
- **Source:** every image in `public/img/gallery/` (`import.meta.glob`, so adding a file is enough, no code change). Until Ivana adds the stock photos, use all the photos in `public/img/club/`.
- Lazy-load and use `-800` versions where they exist; `alt` = a short scene description. Reduced motion: the rows stand still and scroll sideways by hand.

## Check
Branch preview, desktop + iPhone: buttons show the peach → lilac gradient with dark text; hovering slides the gradient, draws the little fence and the label hops; the horseshoe is an upright U; the two gallery rows move in opposite directions and pause on hover; a new file in `public/img/gallery/` shows up after a rebuild.
