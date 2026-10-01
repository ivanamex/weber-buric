# STEP-33: lime accent (site + app), hero video, changing words, fix the app-section blur

## 1. Bug: the blurred photo in "06 — La app" has a hard edge
On iPhone the blurred `girl-horse-nose` backdrop stops about a quarter of the way in: a sharp vertical edge, with dark plain green on the left. Fix it: the blurred layer covers the whole section (`inset: -10%` + `overflow: hidden` on the section, so the blur never shows its edge), with the jungle scrim on top. On phones under 768 px, drop the photo and use only the jungle + glow gradient. Check at 360 / 390 / 1440 px.

## 2. Accent: lime replaces the salmon/coral everywhere (site AND app, decided 1 Oct)
- New tokens: `--accent #C8F25A` (lime) · `--accent-hover #B5E03F` · `--accent-soft #EEF9CF` (tiles, badges) · `--accent-ink #3E6B3F` (small accent text on light backgrounds: moss, because lime text on bone is unreadable).
- **Buttons:** lime fill + **jungle `#0F2A1D` bold text** (never white on lime). Hover: darker lime. On dark sections, the same.
- **Highlighted headline word:** on dark backgrounds, a lime → bone gradient fill. On bone backgrounds, jungle text with a **lime marker stroke behind it** (a lime band across the lower 40% of the word), never lime text on bone.
- **Jump-pole stripes and the progress line:** lime / bone / moss.
- **Gradients:** the flamboyán glow becomes a lime + moss glow (app section, footer sunset → "jungle to lime haze"). The Equinoterapia sand → moss mesh stays.
- **App:** the same tokens (`styles.css`): coral buttons, booking celebration, icon tiles, dots on booked days, focus ring, the glass buttons from STEP-15. Errors stay red `--danger` (never confused with an accent).
- Remove every leftover `#E6735A`, `#F4876A`, `#EE5A3C` and `rgba(230,115,90…)`. Check the contrast (AA) of every text/background pair that changed.
- `logo-*.png` stay as they are. The PWA `theme_color` stays jungle.

## 3. Hero: background video, 3 scenes
- The hero becomes a muted background video: `public/video/hero-1-jump.mp4`, `hero-2-face.mp4`, `hero-3-kids.mp4` (+ `.webm` if present), played **in sequence and looped** (scene 1 → 2 → 3 → 1), with a 600 ms cross-fade between them (two stacked `<video>` elements).
- `autoplay muted playsinline loop` off (we sequence ourselves), `preload="metadata"`, `poster` = the matching photo.
- **Until the video files exist** (Ivana is generating them), the same component runs on the 3 photos with a slow zoom (Ken Burns, 6 s each): `horse-blaze`, `girl-horse-closeup`, `girl-riding-flamboyan`. When the files are added to `public/video/`, the videos replace the photos with no code change (check whether the file loads, fall back to the photo).
- Phones: the same videos with `object-fit: cover`, focus point per scene. Under 768 px load the `-720` versions if present.
- `prefers-reduced-motion` or Save-Data on: show only the first poster, no video.
- Weight: each clip ≤ 2 MB (H.264, 720p for phones / 1080p for desktop, no audio track).

## 4. The headline word changes with each scene
"Pasión por los **caballos**." The last word **swaps in sync with the scene** (vertical slide + fade, 400 ms):
- Scene 1 (jump): **saltos** / *jumps*
- Scene 2 (face): **caballos** / *horses*
- Scene 3 (kids): **niños** / *kids*
The changing word uses the lime gradient fill. Reserve its width (use the longest word) so the line never jumps. Screen readers get the static sentence "Pasión por los caballos" (`aria-live="off"`, the swapping word `aria-hidden`).

## 5. The moving stripe under the hero
A full-width band right under the hero (48 px, jungle background, lime dots between items), scrolling slowly to the left in an endless loop: **CLASES · PENSIÓN · SALTO · EQUINOTERAPIA · CAMPAMENTOS · PONY FRIDAY · PAAMUL, RIVIERA MAYA ·** (EN on `/en`). Outfit 600, uppercase, letter-spaced. It pauses on hover; with reduced motion it stands still. Each item links to its section.

## Check
Phone (360 / 390) and desktop (1440): no hard edge in the app section; no coral left anywhere (site, app, demo, `/descargar`, the poster); buttons are lime with dark text; the hero cycles through 3 scenes (photos for now) and the word changes with each; the stripe moves and pauses on hover; reduced motion → a static hero and a static stripe.
