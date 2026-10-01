# STEP-38: site look: new type for nav/body, green + apricot glass (no lilac), readable everywhere

Feedback from Ivana's testing with other people (1 Oct). This step changes only the **look system** of the website; content order and videos are STEP-39.

## 1. Type: the nav looks like a default Word font
- The nav, buttons, labels and body currently use Archivo at normal width, which reads like Arial.
- **Nav + buttons + chips:** Archivo at `font-stretch: 80%`, weight 600, 16–17 px, letter-spacing 0.01em. It now belongs to the same family as the condensed headlines.
- **Body text:** `@fontsource-variable/hanken-grotesk` (weight 400/500, 17–18 px, line-height 1.55). Hanken Grotesk has more character than Arial and sits well next to condensed Archivo. Headlines stay condensed Archivo.
- Section titles all share one size; card titles all share one smaller size.

## 2. Colors: drop purple, use greens + apricot
- Remove `--lilac` everywhere on the site (buttons, glows, progress line, footer).
- New tokens: deep `#10271F` · jungle `#24503F` · moss `#4E7A5A` · sage `#A9C3AE` · mint mist `#EEF3EE` (base) · sand `#E9DCC6` · apricot `#F2B48C` · ember `#D9783F` (small accents only, never body text on mist).
- **Glows:** sage + apricot only (hero edges, Equinoterapia panel, footer).
- **Progress line:** sage → apricot.

## 3. Glass buttons (keep the glassy look Ivana liked)
- Main button: frosted glass. Background `linear-gradient(120deg, rgba(169,195,174,.55), rgba(242,180,140,.55))`, `backdrop-filter: blur(14px) saturate(1.3)`, a 1 px border `rgba(255,255,255,.6)`, an inner top highlight (`inset 0 1px 0 rgba(255,255,255,.7)`), a soft shadow, text deep, weight 650.
- On the dark video hero: the same glass, but white-tinted (`rgba(255,255,255,.18)`) with white text.
- Keep the hover from STEP-35 (little fence + hop); the gradient slide becomes sage → apricot.
- Secondary buttons: a deep outline (on video: a white outline).

## 4. Steps: each its own color
In "Aprende a montar" (4 steps) and Equinoterapia (3 steps), each step gets its own soft tile: **1 sage · 2 mint · 3 sand · 4 apricot** (Equinoterapia uses 1–3). The number and text are deep on every tile (AA contrast). The line above still fills as the row comes into view.

## 5. Readability fixes (screenshots of 1 Oct)
- **No text boxes floating on a video or photo.** Pensión: remove the video background and the two white cards on top of it (see STEP-39 for the new layout). Anywhere text sits on an image, it uses a solid scrim behind it and passes AA.
- **Events row (Comunidad):** no half-cut card. Desktop: a grid of up to 3 cards (the rest behind "Ver todos"). Phones: the swipe row with snap, the first card fully visible and the next one peeking by at most 24 px, plus dots.
- **Video crops:** every video or photo frame uses an aspect ratio close to its source (16:9 / 4:5 with `object-position` on the subject), so no frame shows only blurry fur. Check each one.

## Check
1440 + 390 px: the nav no longer looks like Arial; no lilac or purple anywhere on the site; buttons are frosted green → apricot glass; each step is in its own color; no text sits on a moving video; the events show whole cards. Send screenshots.
