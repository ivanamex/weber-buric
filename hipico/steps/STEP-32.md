# STEP-32: the club website as one page, 2026 style

STEP-31 works but reads like 2015: 8 separate pages, too many colors, galleries, collapsing blocks, outlined word band. Rebuild it as **one page** with a sticky bar and sections. **Keep:** the data wiring (`content.js`, `siteData.js`: prices, events, horses for sale), the photos, the icons, the rising headline letters, ES/EN, `/descargar`. **Keep and push further:** the jump-pole stripes and the movement (Ivana likes them).

## Direction: editorial sport
Few colors, huge type, real photos doing the work, motion tied to scrolling. It should feel like a sports brand, not a brochure.

## 1. Remove
- The separate pages (`/clases`, `/pension`, `/competencias`, `/equinoterapia`, `/eventos`, `/caballos`, `/contacto`): each **redirects to `/#section`** (same in `/en`).
- Galleries and lightboxes, accordions and anything that collapses, the outlined word band, card drop shadows, the navy.
- The counters, unless there are real numbers. Hide the block; don't show "—".

## 2. Color: the "Paamul" gradient (decided 1 Oct, no navy anywhere)
The colors come from Ivana's photos: jungle, arena sand and the red flamboyán trees. This is the site's signature; it's made for this club, not taken from a template.
- Tokens: jungle `#0F2A1D` · moss `#3E6B3F` · sand `#E9D6B4` · bone `#F4F1EA` (base) · flamboyán `#EE5A3C` · coral `#E6735A` (buttons) · ink `#141A15` (text).
- **One gradient system, used in 4 places only:**
  1. **03 — Equinoterapia** background: a soft mesh of sand → moss (calm, light).
  2. **06 — La app** background: deep jungle with a slow flamboyán glow rising behind the phone.
  3. **Footer:** a "sunset" from jungle at the top to a flamboyán + coral glow at the bottom edge.
  4. **One word per headline** filled with the flamboyán → coral gradient (`background-clip: text`), e.g. "Pasión por los **caballos**." Never a whole sentence.
- **Mesh, not linear:** 3–4 radial blobs layered (`radial-gradient` stacks), drifting very slowly (40–60 s loop, transform only; static with reduced motion).
- **Grain on every gradient:** a light noise layer (an SVG `feTurbulence` used as a background image, ~6–8% opacity, `mix-blend-mode: overlay`), so gradients look printed rather than digital. No grain on photos or text.
- Glass bar: bone at 70% with blur; over the dark sections it switches to jungle at 60% with bone text.
- Coral stays for the main buttons; the jump-pole stripes use flamboyán / bone / moss.
- **Never:** navy, purple-to-blue "SaaS" gradients, rainbow, gradients on buttons or cards, gold.
- Check the contrast of text on every gradient (AA 4.5:1); put body text only on the calm parts.

## 3. Type
- **Fix first: Outfit and Inter are never loaded** (`styles.css` names them, but no font file or link exists, so everything falls back to the system font, in the app too). Add `@fontsource-variable/outfit` and `@fontsource-variable/inter` (self-hosted, full weight range), import them in `main.jsx`, `font-display: swap`. This fixes the app as well.
- **Kinetic type:** Outfit is a variable font. Section headlines go from weight 300 to 650 as they scroll into view (scroll-driven, `font-variation-settings`), once.
- Headlines in Outfit, **very large** (`clamp(48px, 9vw, 152px)`), weight 600, tracking −0.04em, line-height 0.92.
- Body in Inter 17–18 px, max ~60 characters per line.
- **Eyebrows:** every section starts with a small label, uppercase Inter 12 px, letter-spaced, with its number: `01 — CLASES`. On desktop the eyebrow **sticks** to the left edge while its section scrolls past (`position: sticky`).

## 4. The sticky bar
- Slim (56 px), frosted glass (`backdrop-filter: blur`), on top of the hero from the start.
- Logo left · section links in the middle with a **sliding underline that follows the section on screen** (scroll-spy) · ES/EN · **"App del club"** pill (coral).
- **Progress line:** a 3 px jump-pole stripe (coral / bone / green bands) along the bottom edge of the bar that fills as you scroll the page.
- Phone: logo + "App del club" + a menu icon that opens a **bottom sheet** with the sections.
- Phone only: after the hero, a sticky bottom button **"Agenda una clase muestra"** (WhatsApp) that hides near the contact section.

## 5. Sections, in order
1. **Hero:** full-screen `horse-blaze.webp` (see section 5b) with a dark scrim at the bottom left. Huge headline "Pasión por los caballos." with the rising letters, one line of sub copy, two buttons (Clase muestra · App del club). A jump-pole stripe **slides in across the bottom of the photo like a rail** once the letters land.
2. **Manifesto:** full-bleed `girl-horse-closeup.webp` (tall, ~120vh, slow zoom on scroll), then one big sentence on bone ("Un club en medio de la selva de Paamul, donde se aprende a montar desde los 2 años hasta competir."). The **words go from faint to full ink as you scroll** (scroll-driven reveal).
3. `01 — QUÉ HACEMOS`: a **bento grid** (asymmetric tiles, no shadows, 20 px radius): Clases (big tile, photo `girl-riding-flamboyan`, plans and prices from the app) · Competencias (photo tile) · Pensión (photo `paddock-herd`) · Estimulación temprana · Campamentos y Pony Friday · Fiestas infantiles · Coaching con caballos. The icon tiles are plain bone with an icon, a title and 1 line. Every tile ends in a "→" that opens WhatsApp with a message for that service. Hover: the photo zooms slightly, the arrow slides.
4. `02 — COMPETENCIAS`: **sticky split.** On desktop `jump-grey.webp` stays pinned on the left while the right side scrolls: show jumping training → events → "Campeón Estatal 2024" with `rosette-campeon.webp` cropped round. Phone: stacked.
5. `03 — EQUINOTERAPIA`: a calm full-width section on deep green. "Próximamente" pill, the careful wording from STEP-31, the 3 steps as large numbers (1 Evaluación · 2 Sesiones semanales · 3 Revisión de progreso), photo `horse-fence.webp`, and the button "Únete a la lista de interés".
6. `04 — PENSIÓN Y CABALLOS`: two side-by-side panels. Pensión (care, feeding, vet, farrier, "ves a tu caballo en la app") and Caballos en venta (from the app if the module is on, otherwise "Pregunta por los disponibles").
7. `05 — COMUNIDAD`: `families-celebrating.webp` full-bleed and tall, with the one real testimonial on top. Pony Friday and the upcoming events from the app as a **horizontal scroll-snap row** of small cards (swipe on phone, scroll with the trackpad on desktop).
8. `06 — LA APP`: **sticky phone.** The CSS phone mockup stays pinned while 3 statements scroll past (Confirma tus clases · Ve tu plan · Paga desde el celular); the phone screen changes with each one (cross-fade between 3 screens of the demo). Behind the phone, `girl-horse-nose.webp` large and softly blurred. Button → `/descargar`.
9. `07 — VISÍTANOS`: map (lazy iframe, grayscale until hover) + address, phone and email, plus a big WhatsApp button. Then the footer, minimal on deep green: logo, social, © and the galloping horse band (kept).

## 5b. Big photos (Ivana's own, high resolution, in `public/img/club/`)
Portrait 3:4 photos, 1600 px plus an `-800` version: use `srcset` (800 for phones, 1600 for desktop).
| File | Use |
|---|---|
| `horse-blaze.webp` | **Hero.** Phone: full portrait. Desktop: full-bleed cover, `object-position` on the eye and the white blaze (~60% 35%) |
| `girl-horse-closeup.webp` | Full-bleed moment before the manifesto, cover, focus on the two faces (~45% 55%) |
| `girl-riding-flamboyan.webp` | Clases big bento tile (the red flamboyán ties in with the coral) |
| `girl-horse-nose.webp` | Blurred backdrop behind the sticky phone (06 — La app) |
- The ~1000 px club photos (`jump-bay`, `jump-grey`, `paddock-herd`, `families-celebrating`…) are used only at medium size (bento tiles, the Competencias split), never full-bleed.
- **Privacy:** alt text describes the scene only ("Una niña abraza a su caballo"); no names anywhere. The Open Graph / share image uses `horse-blaze.webp` (horse only), never a photo with the child. Keep these four photos in one list in `content.js` so they can be swapped in one place.

## 6. Motion
- Use CSS **scroll-driven animations** (`animation-timeline: view()` / `scroll()`) for the reveals, the progress line and the image zooms, with an IntersectionObserver fallback for Safari versions without it.
- The ES ⇄ EN switch uses the **View Transitions API** (a soft cross-fade), falling back to an instant swap.
- Reveals: 12 px rise + fade, once, 400 ms, ease-out. No bounce, no spin, no parallax on text.
- `prefers-reduced-motion`: everything static and visible.

## 7. SEO for one page
- `<title>` and meta description in ES and EN, `hreflang` between `/` and `/en`, one H1 and an H2 per section.
- JSON-LD `SportsActivityLocation` (name, address, geo, phone, email, sameAs Instagram/Facebook, opening hours when known).
- Open Graph image: `jump-bay.webp` cropped 1200×630.

## Check
`/` and `/en` at 360 / 390 px and 1280 / 1440 / 1920 px: the scroll-spy underline follows, the eyebrows stick on desktop, the progress stripe fills, the bento has no empty holes at any width, nothing wider than the screen, the old URLs land on their section, `/descargar` + QR unchanged, Lighthouse mobile performance 90+ and accessibility 95+, reduced motion on → static.
