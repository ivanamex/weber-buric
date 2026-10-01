# STEP-31: the club website (replaces Wix), with the app behind it

Same pattern as the Árbol portal: a real club website at `/`, and the app one click away. It's a club, not a school, so it gets more design: big real photos, animated letters and its own icon set. **Nothing in the app changes**, only what sits around it.

## 1. Routes
- `/`: the website (ES). `/en`: the same in English (toggle in the header, kept per visitor).
- Pages: **Inicio** `/` · **Clases** `/clases` · **Pensión** `/pension` · **Competencias** `/competencias` · **Equinoterapia** `/equinoterapia` · **Eventos y campamentos** `/eventos` · **Caballos en venta** `/caballos` · **Contacto** `/contacto`. Each page has its own `<title>` + meta description in ES/EN (SEO: "clases de equitación Playa del Carmen", "pensión de caballos Riviera Maya", "equinoterapia Playa del Carmen", "campamento de verano caballos").
- The current download page (`Landing.jsx`) moves to **`/descargar`**, unchanged. **The QR, the poster, "Compartir la app" and the install links all point to `/descargar`** (printed posters must still work: keep it the target from now on).
- The header has an **"App del club"** coral button: it opens `/app` if the app is installed or the person is signed in on this device, otherwise `/descargar`. A secondary "Entrar" link goes to `/app`.
- `/app/*`, `/demo/*` and `/vista/*` stay as they are.

## 2. Colors: same brand, richer (decided 1 Oct)
The site keeps the app's green + soft coral, so the web and the app look like one club, and adds **navy** from the club's own world (the rosette, the saddle pads, the jump stands).
- `--green #2E5339`, `--forest #1C3324` (dark full-width sections, footer), `--navy #1F2F4A` (second dark tone, competition sections), coral `--accent-strong #E6735A` for buttons (white bold text), cream `#F6F2E9`, card `#FFFDF8`.
- **Jump-pole stripes** as the brand motif: thin diagonal bands of green / cream / coral used as section dividers and on button hover. No gold. Sans-serif only (Outfit + Inter).

## 3. Animation (smooth, never in the way)
- **Hero letters:** the headline rises letter by letter (staggered, ~25 ms per letter, once).
- **Giant outlined word band:** "HÍPICO · RIVIERA MAYA · PAAMUL ·" in huge outlined letters that slide slowly sideways while scrolling, and fill with coral as they pass the middle of the screen.
- **Numbers that count up** when they come into view (años, caballos, hectáreas, jinetes: placeholders "—" until Mara gives real numbers; **no invented figures**).
- Photos: a soft zoom on scroll (scale 1.06 → 1) and a slight reveal mask. Cards lift on hover.
- The galloping horse band from the app landing returns once, above the footer.
- Everything respects `prefers-reduced-motion` (no movement, everything shown at once). No layout shift, nothing wider than the screen at 360 px.

## 4. Icon set (line pictograms, same stroke as the app)
Casco · herradura · silla · roseta · valla de salto · paca de heno · mano con corazón (equinoterapia) · pastel (fiestas) · tienda de campaña (campamentos) · brújula (coaching) · trofeo · mapa / ubicación · WhatsApp. One file, `components/site/Icons.jsx`, used on the service cards and in the footer.

## 5. Photos (real, from the club, in `public/img/club/`)
| File | Use |
|---|---|
| `jump-bay.webp` | Inicio hero (dark gradient on the left for the headline) |
| `families-celebrating.webp` | Inicio "Una familia a caballo" + Eventos |
| `jump-grey.webp` | Competencias hero |
| `rosette-campeon.webp` | Competencias "Campeón Estatal 2024" |
| `rider-buckskin.webp` | Clases |
| `paddock-herd.webp` | Pensión hero |
| `horse-fence.webp` | Equinoterapia + Contacto |
The files are ~1000 px wide: use them at most ~1000 px wide on the screen (no full-bleed 4K stretch). On wide screens use a split layout or a framed photo instead. Add `loading="lazy"` except on the hero, plus width/height attributes. Alt text in ES/EN.

## 6. Content (from hipicorivieramaya.com, rewritten, Spanish first)
**Inicio**
- Hero: "Pasión por los caballos, excelencia en la equitación." Sub: "Club ecuestre en Paamul, Riviera Maya. Clases, pensión y competencias, rodeados de naturaleza." Buttons: **Agenda una clase muestra** (WhatsApp with a ready message) · **App del club**.
- Service grid (icon + 1 line + link): Clases · Pensión · Competencias de salto · Equinoterapia (tag "Nuevo") · Estimulación temprana · Campamentos · Fiestas infantiles · Coaching con caballos.
- "Una familia a caballo" (the celebrating photo): the club as a community, from 2 years old to competition.
- "La app del club": the CSS phone mockup from the landing + 3 points (confirma tus clases, ve tu plan, paga desde el celular) → `/descargar`.
- Testimonial: only the real one from the current site (Dr. Tamia Perkins). **Never invent testimonials.** Room for more later.
- Location strip: map embed (Google Maps iframe, lazy) + address + "Cómo llegar".

**Clases**: beginner to advanced, by age and level, a clase muestra, the monthly plans (prices read from the app's plans, so they're only typed once; "Consulta precios" if none are set). **Pony Friday**: last Friday of the month, 9:00 to 12:30, from 2 years old (price "por confirmar" until Mara confirms).
**Pensión**: care, feeding, vet and farrier, the paddocks; the owner sees their horse in the app (Mi caballo). CTA: WhatsApp.
**Competencias**: show-jumping training, local and outside events, "Campeón Estatal 2024" with the rosette photo. Results list editable later (placeholder).
**Eventos y campamentos**: summer and holiday camps, birthday parties, Pony Friday. If the Eventos module has upcoming events, list them here (read-only).
**Caballos en venta**: if the horse-sales module is on, the horses marked "en venta" (photo, name, age, discipline, "Preguntar por WhatsApp"); if it's off, one card: "Pregunta por los caballos disponibles".
**Contacto**: Carretera Cancún–Chetumal km 273, int. Rancho San Francisco, 77735 Paamul, Q. Roo · +52 984 143 6457 · WhatsApp wa.me/529841436457 · hipicorivieramaya@gmail.com · Instagram @hipicoriveramaya · Facebook hipicorivieramaya. A simple form that opens WhatsApp with the message filled in (no backend).

## 7. Equinoterapia (new program, a proposal for Mara)
A full page plus a card on Inicio, tagged **"Próximamente"** until Mara approves it. It builds on what the club already offers (estimulación temprana).
- **What it is:** therapeutic activities with horses for children, guided by a certified equine therapist together with a health professional (fisioterapeuta or psicólogo). The horse's movement and contact with the animal support the child's development.
- **Who it's for (careful wording):** children from 3 years old. It can support balance and posture, coordination, attention, communication, confidence and emotional regulation. It works **alongside** medical treatment, never instead of it. **No promises of a cure, no diagnoses listed as "treated".**
- **How it works:** 1) evaluation interview with the family (and the child's doctor's OK), 2) a program of weekly 30–45 min sessions, 3) a calm, chosen therapy horse, a leader and side-walkers, helmet, 4) a progress review every 8 sessions.
- **Proposed formats (prices "por definir"):** Sesión de evaluación · Paquete mensual (4 sesiones) · Grupos pequeños de estimulación temprana.
- CTA: **"Únete a la lista de interés"** → WhatsApp with a ready message. Footer note: "Programa en preparación. Las sesiones serán dirigidas por profesionales certificados."

## 8. Footer
Logo, 1-line mission, the links, contact, social, "App del club" button, small QR on desktop (→ `/descargar`), © Hípico Riviera Maya.

## 9. Tech
- New folder `src/site/` (pages + `SiteLayout` with header/footer); shared tokens with the app, site-only tokens in `src/site/site.css`.
- Header: transparent over the hero, solid cream with shadow after scrolling; on phones a full-screen menu (green) with the links, the language toggle and "App del club".
- Lighthouse on mobile: aim for performance 90+ and accessibility 95+. Fonts already loaded by the app, no new libraries for animation (IntersectionObserver + CSS).

## Check
`/`, every page, `/en`, and `/descargar` on a phone (360 / 390 px) and a laptop (1280 / 1440 px); the poster QR and "Compartir la app" now open `/descargar`; "App del club" goes to `/app` when signed in; reduced motion on → no animation; `/app`, `/demo` and `/vista` unchanged.

## Open (ask Mara, not blocking)
Higher-resolution originals of the photos · OK to show the kids in the group photo on the public site · real numbers for the counters · instructors (names, photos, 1 line each) · Pony Friday and camp prices · approval of the Equinoterapia program and who would run it.
