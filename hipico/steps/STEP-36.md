# STEP-36: the first videos go live

Ivana's first clips are already in the repo, cut, cleaned and compressed (no sound, 1280 px wide, 0.4–1.8 MB each), each with a `.webp` poster of the same name:

| File | Length | Use |
|---|---|---|
| `public/video/hero-1-jump.mp4` | 5 s | Hero scene **Saltos** (sunset jump, clean) |
| `public/video/hero-2-face.mp4` | 5.5 s | Hero scene **Caballos** |
| `public/video/hero-3-kids.mp4` | 5 s | Hero scene **Niños** (girl on the pony, flamboyán trees) |
| `public/video/hooves-sand.mp4` | 5 s | Background of **02 Competencias** pinned media (or a gallery tile, see 2) |
| `public/video/grooming.mp4` | 5 s | **04 Equinoterapia** media panel (hands brushing a horse) |
| `public/video/paddock-herd.mp4` | 6.4 s | Background of **05 Pensión y caballos** |
| `public/video/paddock-face.mp4` | 3.4 s | A video tile in the Disfruta gallery |
| `public/img/gallery/horse-rope-jungle.webp` | still | Gallery (picked up automatically) |

## 1. Hero
- In `content.js` set `video` for `jumps` → `/video/hero-1-jump.mp4` and `horses` → `/video/hero-2-face.mp4`, `kids` → `/video/hero-3-kids.mp4`; each scene's `poster` = the matching `.webp`. All three scenes are video now.
- **Slow and smooth:** `playbackRate = 0.75` for a softer slow motion. A scene lasts as long as its clip (at that speed), then a **1 s cross-fade** to the next; Chips follow as now.
- A light vertical scrim on the left of the frame on desktop only where text could overlap (none should overlap; check).

## 2. Video backgrounds in sections
- **05 Pensión y caballos:** `paddock-herd.mp4` as the section's full-width background (cover, muted, looping, `playbackRate 0.75`) under a mist scrim strong enough for AA text contrast, or as the big media panel next to the text if the scrim hurts the look; pick the one that reads better at 1440 and on iPhone, and say which.
- **04 Equinoterapia:** `grooming.mp4` in the glow panel (rounded, cover), the "Próximamente" pill and the CTA on top.
- **Competencias:** `hooves-sand.mp4` as the pinned media on desktop (instead of the still), the stories scroll past it.
- **Disfruta gallery:** support video tiles: files listed in `GALLERY_VIDEOS` in `content.js` (start with `paddock-face.mp4`) play muted and looped inside a tile in row 1, same size and radius as the photos.

## 3. Rules for every video
`muted playsinline loop preload="metadata"`, poster always set; play only while on screen (IntersectionObserver: pause off-screen); reduced motion or Save-Data → poster only; never autoplay with sound. Total video on first load under 2 MB (the hero loads scene 1 first, the next one while it plays).

## Check
Desktop 1440 + iPhone: the hero plays the jump, fades to the horse face, then the girl on the pony, in a loop, and the chips follow; Pensión shows the herd moving behind or beside the text; the gallery has one moving tile; reduced motion → only posters; no clip shows text or a logo.
