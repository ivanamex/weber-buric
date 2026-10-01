# STEP-32: the club website as one page, 2026 style

STEP-31 works but reads like 2015: 8 separate pages, too many colors, galleries, collapsing blocks, outlined word band. Rebuild it as **one page** with a sticky bar and sections. **Keep:** the data wiring (`content.js`, `siteData.js`: prices, events, horses for sale), the photos, the icons, the rising headline letters, ES/EN, `/descargar`. **Keep and push further:** the jump-pole stripes and the movement (Ivana likes them).

## Direction: editorial sport
Few colors, huge type, real photos doing the work, motion tied to scrolling. It should feel like a sports brand, not a brochure.

## 1. Remove
- The separate pages (`/clases`, `/pension`, `/competencias`, `/equinoterapia`, `/eventos`, `/caballos`, `/contacto`): each **redirects to `/#section`** (same in `/en`).
- Galleries and lightboxes, accordions and anything that collapses, the outlined word band, card drop shadows, the navy.
- The counters, unless there are real numbers. Hide the block; don't show "—".

## 2. Palette (fewer colors)
- Base: bone `#F4F1EA`. Text: ink `#141A15`. Dark sections: deep green `#1E3A2A`.
- Coral `#E6735A` **only** for the main button and the jump-pole stripes. Nothing else is coral.
- White text on photos. No gradients except a dark scrim under text on photos.

## 3. Type
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
1. **Hero:** full-screen `jump-bay.webp` with a dark scrim at the bottom left. Huge headline "Pasión por los caballos." with the rising letters, one line of sub copy, two buttons (Clase muestra · App del club). A jump-pole stripe **slides in across the bottom of the photo like a rail** once the letters land.
2. **Manifesto:** one big sentence on bone ("Un club en medio de la selva de Paamul, donde se aprende a montar desde los 2 años hasta competir."). The **words go from faint to full ink as you scroll** (scroll-driven reveal).
3. `01 — QUÉ HACEMOS`: a **bento grid** (asymmetric tiles, no shadows, 20 px radius): Clases (big tile, photo `rider-buckskin`, plans and prices from the app) · Competencias (photo tile) · Pensión (photo `paddock-herd`) · Estimulación temprana · Campamentos y Pony Friday · Fiestas infantiles · Coaching con caballos. The icon tiles are plain bone with an icon, a title and 1 line. Every tile ends in a "→" that opens WhatsApp with a message for that service. Hover: the photo zooms slightly, the arrow slides.
4. `02 — COMPETENCIAS`: **sticky split.** On desktop `jump-grey.webp` stays pinned on the left while the right side scrolls: show jumping training → events → "Campeón Estatal 2024" with `rosette-campeon.webp` cropped round. Phone: stacked.
5. `03 — EQUINOTERAPIA`: a calm full-width section on deep green. "Próximamente" pill, the careful wording from STEP-31, the 3 steps as large numbers (1 Evaluación · 2 Sesiones semanales · 3 Revisión de progreso), photo `horse-fence.webp`, and the button "Únete a la lista de interés".
6. `04 — PENSIÓN Y CABALLOS`: two side-by-side panels. Pensión (care, feeding, vet, farrier, "ves a tu caballo en la app") and Caballos en venta (from the app if the module is on, otherwise "Pregunta por los disponibles").
7. `05 — COMUNIDAD`: `families-celebrating.webp` full-bleed and tall, with the one real testimonial on top. Pony Friday and the upcoming events from the app as a **horizontal scroll-snap row** of small cards (swipe on phone, scroll with the trackpad on desktop).
8. `06 — LA APP`: **sticky phone.** The CSS phone mockup stays pinned while 3 statements scroll past (Confirma tus clases · Ve tu plan · Paga desde el celular); the phone screen changes with each one (cross-fade between 3 screens of the demo). Button → `/descargar`.
9. `07 — VISÍTANOS`: map (lazy iframe, grayscale until hover) + address, phone and email, plus a big WhatsApp button. Then the footer, minimal on deep green: logo, social, © and the galloping horse band (kept).

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
