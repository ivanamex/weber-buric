# STEP-47: the "mutant": the current site + the recorrido draft (approved by Ivana, 2 Oct 09:23: build it)

Reference: the current live site + `steps/drafts/draft-recorrido-overview.png`.

## Notes so far
1. **Keep the hero exactly as it is** (video, title, line, buttons; "15 minutos").
2. **Hoofprints in the sand behind the page:** the effect Ivana loves (prints appear where the mouse moves over the sand) becomes the **background of the page** (behind the content, subtle), not only a band.
3. **Right under the hero, without much scrolling: "Qué hacemos" and "El club"**, so classes are visible at first glance.
4. **Click a service → a lightbox** with its explanation. For Clases: not only "12 clases al mes": the options include classes every day and **"a tu medida"** (a plan built to measure), with the prices from the app and a WhatsApp button.

5. **Competencias, Pensión and Estimulación temprana also open in a lightbox** (the same pattern as Clases: explanation, what's included, prices if the app has them, WhatsApp).
6. **Campamentos · Pony Friday · Fiestas infantiles · Desarrollo personal con caballos** (new name for "Coaching con caballos") go in **small colorful boxes**, in the style of today's 4 step tiles (sage, mint, sand, apricot).
7. **Remove the "Aprende a montar" 4-step row completely** (Clase muestra / Tu plan / Pony Friday / Tu primer concurso): its colorful-box style moves to the boxes in note 6.

8. **Competencias, freer:** a video (`hooves-sand.mp4`) placed to one side, not a full-width row; "Entrenamos para competir · Técnica, ritmo y confianza: del primer salto al campeonato estatal", the glass buttons, and Campeón Estatal 2024 with a **big** rosette photo overlapping the corner of the video.
9. **Equinoterapia ("Crecer junto al caballo"): same background as everything else**, no panel or different color.
10. **Pensión, La app and "Te esperamos en Paamul": keep as they are.**
11. **"Familias que montan juntas":** a big **film strip** gallery (dark strip with sprocket holes, photos 420 px tall) that you **drag left and right** (and swipe on phones); clicking a photo opens the lightbox.
12. **Palette = Serene Sage** (`steps/drafts/palette-serene-sage.png`): parchment `#F1EAD8` (base), sand `#D5C7AD`, sage `#8A8E75`, light sage `#BEC5A4`, bark `#68604D`; text and dark accents olivewood `#33352A` (from Olive Garden). No apricot, no coral.
13. **Glass buttons in shades of green** (reference `steps/drafts/glass-green-reference.jpg`): sage → olive → light-sage glass, parchment text, **text centered**. "App del club" in the nav uses it too (min 170 px, centered). Secondary = olivewood outline.

**Draft (approved):** `steps/drafts/step-47-draft.png` / `.html` (desktop). Match it.

## Build notes
- **Order:** Hero → Qué hacemos (4 photo cards + 4 colorful boxes) → Competencias → Equinoterapia → Pensión → Familias que montan juntas (film strip) → La app → Te esperamos en Paamul → footer.
- **Remove:** the "Aprende a montar" row, the masonry Galería section (the film strip replaces it), any section background color changes. Nav: Qué hacemos · Competencias · Equinoterapia · Pensión · Familias · La app · Visítanos.
- **Side numbers** ("01 El club", "02 Salto", …) stay as in the draft, sticky on desktop while their section scrolls.
- **Lightbox for the 4 services** (one component, focus trap, Esc, close button, scrolls inside on phones): photo on the left, text on the right.
  - *Clases:* Clase muestra · Planes 4 · 8 · 12 clases al mes (desde the lowest plan price) · Todos los días (Consulta) · A tu medida (Consulta) · buttons "Agenda una clase muestra" + "Escríbenos" (WhatsApp).
  - *Competencias:* what the training includes, concursos in the state and outside, Campeón Estatal 2024 · "Quiero competir".
  - *Pensión:* the care list, "en la app ves su ración, su salud y el pago", monthly price if set · "Preguntar por la pensión".
  - *Estimulación temprana:* for the youngest (from 2 years), short sessions, games with ponies, from-price if set · WhatsApp.
  Prices always come from the app (`public_site()`); "Consulta" when missing.
- **Colorful boxes:** sage `#8A8E75` (white text), light sage `#BEC5A4`, sand `#D5C7AD`, olive `#C3CBB2`; each opens WhatsApp with its own message (Pony Friday shows the next date).
- **Hoofprints:** the existing sand-print effect runs as a fixed, subtle background layer for the whole page (behind content), prints appear under the mouse on desktop and fade; a few static prints on phones; off with reduced motion.
- **Film strip:** horizontal drag (pointer + touch + trackpad), momentum, snap per photo, arrows on desktop, all gallery photos + clips (clips play muted in the strip, with controls in the lightbox).
- **Copy:** hero sub says "a **15 minutos** de Playa del Carmen" (ES) / "15 minutes" (EN). "Coaching con caballos" → "Desarrollo personal con caballos" (EN "Personal growth with horses").
- **App (portal):** switch the app's tokens to the same Serene Sage palette and the green glass main buttons, so the site's phone mockup matches.
- This step **replaces STEP-45** (its notes are covered here).

## Check
1440 + 390 px full-page screenshots next to the draft; each lightbox open; the film strip dragged; hoofprints following the mouse; page height reported.
