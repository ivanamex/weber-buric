# STEP-44: warmer site + a real gallery

Ivana (1 Oct, night): "It looks cold. We need a gallery."

## 1. Warmth
The cold comes from the mint-grey base, green everywhere and all-caps condensed type. Keep the structure from STEP-42; change the temperature:
- **Base:** warm sand `#F5EFE6` instead of mint mist. Alternate sections with a slightly deeper sand `#EDE3D3`; never two sections of the same tone in a row.
- **Golden-hour light:** a soft apricot glow (`#F2B48C` at 20–25%, grainy) in the hero edges, Equinoterapia and the footer. Green stays for text, buttons and icons.
- **Type:** section titles keep condensed Archivo but in **sentence case** (not ALL CAPS); only the hero title stays uppercase. Body text is warm ink `#2A2420`, not green-black.
- **Photos first:** the warm photos (sunset jump, flamboyán ride, grooming, families) are the ones shown big; cooler shots go to the gallery.
- **Cards and tiles:** warm white `#FFFBF5`, 20 px radius.

## 2. A real gallery section ("Galería", in the nav)
- Replace the moving row with a **proper gallery**: a masonry grid (3 columns desktop, 2 tablet, 1–2 phone), photos at their own proportions, 12 px gaps, large: the first item spans 2 columns.
- **Filters** as pills on top: Todo · Clases · Salto · Caballos · Comunidad (each image gets a tag in `content.js`/gallery manifest; untagged = Todo only).
- **Videos are in it too:** clips show their poster with a small play mark and play muted on hover (desktop); in the lightbox they play with controls.
- **Lightbox** (from STEP-42) for everything: full screen, arrows, swipe, Esc, counter, caption from the alt text.
- Shows the first 12, then "Ver más fotos".
- Source: every file in `public/img/gallery/` + the club photos + the clips. Ivana will add more photos to `public/img/gallery/` (picked up automatically; tag via file name prefix: `clases-…`, `salto-…`, `caballos-…`, `comunidad-…`).

## Check
1440 + 390 px screenshots: the page reads warm (sand base, apricot light, sentence-case titles), the gallery is a big masonry grid with working filters, hover-play on clips and the lightbox.
