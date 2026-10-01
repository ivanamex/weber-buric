# STEP-34: new website design on a branch (A + C mix, big video)

**Build this on a new branch `design-34`, not on `main`.** Push it, and give Ivana the Vercel preview URL for the branch. `main` stays as it is until she says "merge".

**Reference:** `steps/drafts/step-34-draft.png` (what it should look like) and `steps/drafts/step-34-draft.html` (the exact tokens and CSS). Match the draft, then extend the same language to the rest of the page.

## Keep from STEP-32
The one-page structure, scroll-spy, the sticky numbered labels on the left on desktop (Ivana likes them), the data wiring (prices, events, horses), ES/EN, `/descargar`, the redirects, SEO.

## 1. Look (decided 1 Oct, replaces coral and lime)
- **Open layout from A:** light page, lots of air, condensed headlines, the dotted show-jumping course line.
- **Colors from C:** mist `#F1F4F0` (base), deep `#10271F` (text and main buttons), jungle `#24503F`, sage `#A9C3AE`, peach `#F6C6A6`, lilac `#C8B9EC`. **No coral, no lime, no navy, no gold** anywhere on the site.
- **Gradients:** soft grainy mesh glows (peach, lilac, sage) as in the draft's hero, used in the hero, the Equinoterapia section and the footer. Grain overlay as in the draft.
- **Type:** Archivo variable (`@fontsource-variable/archivo`): headlines `font-stretch: 66%`, weight 800, uppercase, line-height .86; body Archivo at normal width. (Site only; the app keeps Outfit + Inter for now.)
- Buttons: deep fill + white text (main), deep outline (secondary). Remove the jump-pole candy stripe; the progress line becomes a thin peach → lilac gradient.

## 2. Hero
- Left: **"Un club a caballo, en la selva de Paamul"** (EN: "A riding club in the Paamul jungle"). Under it: "Aprende a montar, disfruta y compite, a 20 minutos de Playa del Carmen. Desde los 2 años." Buttons: Agenda una clase muestra (WhatsApp) · Ver clases y precios.
- Right: **a big video frame** (rounded 32 px, full hero height), playing the 3 scenes in a loop with cross-fades: `public/video/hero-1-jump.mp4`, `hero-2-face.mp4`, `hero-3-kids.mp4`. Until the files exist, use the photos `jump-bay`, `horse-blaze`, `girl-riding-flamboyan` with a slow zoom. Chips at the bottom left (**Saltos · Caballos · Niños**) show which scene is playing; clicking a chip jumps to that scene.
- Video rules: muted, playsinline, poster = the photo, ≤ 2 MB per clip; reduced motion or Save-Data → poster only.
- Phone: the headline first, then the video frame full width (4:5), then the buttons.
- The dotted course line runs from the bottom of the hero, between the text and the video, up and out to the top right, **behind** text and buttons (never crossing them).

## 3. Sections
1. **Aprende a montar:** the 4-step path from the draft (Clase muestra → Tu plan → Pony Friday → Tu primer concurso). The numbers are a real sequence here; the first number has the peach → lilac gradient.
2. Then the STEP-32 sections, restyled in this language: Qué hacemos (bento), Competencias (pinned photo), Equinoterapia (mist gradient panel), Pensión y caballos, Comunidad, La app, Visítanos.
3. **Big imagery at the end, before Visítanos:** a full-screen block, **"Disfruta"** in huge white condensed type at the bottom left. On desktop use a landscape frame: the hero video again, or two portrait photos side by side (`girl-horse-closeup` + `girl-horse-nose`), never one portrait photo stretched to 1440 px wide (it turns into blurry fur). On phones: `girl-horse-closeup`, full screen.

## 4. Fix from the iPhone test
The blurred photo behind the phone in "La app" ends in a hard vertical edge. Make the blurred layer cover the whole section (`inset: -10%`, `overflow: hidden`); under 768 px drop the photo and use only the gradient.

## Check
The branch preview at 1440 / 1920 px and on an iPhone: it matches the draft; no coral, lime or candy stripe anywhere; video or photo scenes cycle and the chips follow; the course line never crosses text; no hard blur edge; reduced motion → static. Send the preview URL.
