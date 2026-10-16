# STEP-71: nothing touches an edge (padding rule)

Ivana (Clases lightbox, Sin plan): the sticky footer ("Elegiste · Clase muestra · $500" + Continuar) sits right on the lightbox's bottom edge, which looks odd.

## The rule (site + app)
Nothing touches the edge of its container: lightbox, sheet, card, panel, footer bar, tile. Inner padding scales with size:
- small elements (pills, chips, small tiles): at least 12 px;
- cards and sheets on phones: 20 px;
- cards, panels and lightboxes on a computer: 28–32 px (`clamp(20px, 2.2vw, 32px)`);
- sticky footers inside a lightbox: the same side padding as the panel, **at least 20 px below the button**, and `env(safe-area-inset-bottom)` added on phones.
- Make it one token set (`--pad-s / --pad-m / --pad-l`) in `styles.css` and `site.css`, and use it instead of ad-hoc paddings.
- `npm run check:hover` also reports any text, button or image inside a lightbox/sheet/card that sits closer than 12 px to that container's edge (list by screen).

## Check
- The Clases lightbox (both tabs, details + payment) at 1920×830, 1440×760 and 390×844: the footer has its bottom padding, and nothing is flush with any edge.
- The report from the edge check comes back empty.
