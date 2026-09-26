# STEP-13: landing page polish

Landing page only; don't touch the app. Photos are in `public/img/`: `horse-beach-standing.jpg` and `horse-beach-running.jpg`. Convert them to WebP, lazy-load them, and keep each under 200 KB.

## Hovers: subtle
- Feature cards lift 3 px with a soft shadow, and the pictogram tilts once.
- Buttons get a light gold glow, and the arrow nudges 2 px.
- Links get an underline that slides in.
- Hero text horse: characters near the pointer brighten from sage to gold, then fade back. On phones, play one slow automatic sweep on load.
- Hovers are desktop only (`@media (hover: hover)`), every animation stays under 300 ms, and all of it respects `prefers-reduced-motion`.

## Faded photo bands
- Between "Cómo funciona" and the features: `horse-beach-running` under an ~80% green overlay, with one line in cream: "Montar es libertad" / "Riding is freedom".
- Behind the install section: `horse-beach-standing`, cropped to the head, fading into cream.
- The photos fade in on scroll (opacity + 20 px drift), with a slight parallax on desktop.

## Running horse at the end
- A closing band before the footer: the text-drawn horse (same style as the hero, an original drawing, galloping side profile) runs slowly across in about 12 s, looping, in 2–3 frames so the legs move. The closing line and the two download buttons sit on top.
- With reduced motion, show one still frame.

Check it at 375 px and 1440 px wide.
