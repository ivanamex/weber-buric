# STEP-55: two video guides, made the El Árbol way

**On hold: no recording until Ivana says the screens are final (more notes are coming after STEP-64/65).** Every change to the website or the app before that would make the video outdated. When she says go, record from the live state of `main`.

Same method as El Árbol's office video (Arbol-portal STEP-32): the demo is **recorded for real while it runs**, the camera moves in on each action, and a Spanish voice says what to do. Each step lasts exactly as long as its sentence. There are two short videos instead of one long one: one for the club, one for families.

## Video 1: "El club desde la app" (for Mara and the office)
- 1920×1080, about 40 s. Recorded at 1280×720 and kept sharp at 2× (`deviceScaleFactor: 2`). Dirección, desktop.
- Title card: "El club desde la app" · "Horarios, cobros y mensajes en un solo lugar".
- Steps:
  1. Resumen: tap Planes activos, its list opens, go back.
  2. Horario: Semana view, block a day with the reason "Lluvia".
  3. Cobros → Por revisar: open the receipt, Aprobar.
  4. Por cobrar: the WhatsApp reminder.
  5. Mensajes: a message from the website's form.
- Closing card: "Pruébalo en la demo: hipico-riviera-maya.vercel.app/demo".

## Video 2: "Clases en el Hípico" (for families, sent by WhatsApp)
- Vertical 1080×1920, about 40 s. Recorded at 390×844 (2×). Starts on the website, then Familia in the app.
- Title card: "Clases en el Hípico" · "Elige, paga y confirma desde tu celular".
- Steps:
  1. Website: Qué hacemos → Clases → choose "8 clases al mes".
  2. Fill in the form; the pointer rests on Pagar (no real payment).
  3. App, Inicio: the plan card (classes left, renewal date).
  4. Clases → Semana: confirm a class, then the celebration.
  5. Pagos → Pagar por transferencia: upload the sample receipt (marked "EJEMPLO").
- Closing card: "¿Dudas? Escríbenos por WhatsApp" + the demo's address.

## The look (both videos)
- The real screen fills the frame, with no browser or phone frame. Recorded with Chrome's screencast at 30 fps: the mouse moves and clicks, the text is typed, things open and scroll.
- The only things drawn on top are the pointer and a mustard `#D9A441` ripple where it clicks.
- The camera eases in on the action (up to about 1.8×) and back out when the screen changes.
- A short numbered step label sits at the lower left, for watching without sound. Archivo condensed + Hanken Grotesk. Cards on parchment `#F1EAD8` with the club logo.
- Hide what only the demo has (demo bar, demo notes, toasts that don't belong to the step). Demo data only; no real families.

## The voice
- ElevenLabs, **Alejandro Garcia** (the voice Ivana picked for El Árbol), model Multilingual v2. Chat Claude makes one flow per video with 4 takes each. Ivana downloads the take she likes and uploads it.
- The script splits the take at the pauses between sentences (by each sentence's expected length) and fits each step to its sentence.
- Script, video 1:
  1. Así de fácil es llevar el club desde la app.
  2. En Resumen ves todo de un vistazo; toca un número y te muestra de dónde sale.
  3. En Horario, bloquea un día, por ejemplo por lluvia, y las familias lo ven en su app.
  4. En Cobros, abre el comprobante y apruébalo.
  5. Si alguien tiene un pago pendiente, mándale un recordatorio por WhatsApp.
  6. Y los mensajes de la página llegan aquí, en un solo lugar.
  7. Pruébalo en la demo.
- Script, video 2:
  1. Tomar clases en el Hípico es así de fácil.
  2. En la página del club, abre Clases y elige tu plan.
  3. Llena tus datos y paga; te llega la invitación a la app.
  4. En la app ves tu plan y cuántas clases te quedan.
  5. En Clases, elige el día y confirma tu lugar.
  6. Si pagas por transferencia, sube tu comprobante y el club lo revisa.
  7. ¿Dudas? Escríbenos por WhatsApp.
- Mixed at −16 LUFS, AAC.

## How it's made (Claude Code)
- `hipico/scripts/guides/guide.mjs <club|familias>`: records the steps from `/demo?reset=1` (logging the pointer and the camera's targets as it goes), then renders the clips fitted to each sentence, the camera, the pointer, the cards, the voice and the MP4.
- `--voice <take.mp3>` adds the voice. Without it, the script makes a silent cut timed by estimate, to check the picture.
- Port the recorder and renderer from `ivanamex/Arbol-portal` → `scripts/guides/site-guide.mjs` (add it read-only). Swap in the Hípico style.
- Playwright `executablePath` `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` if the browser isn't found; ffmpeg for the render.
- Output `hipico/guides/out/es/club.mp4` and `familias.mp4` (not committed). Commit the script only. Deliver the two silent cuts. After that, chat Claude adds the voices and renders the final versions with `--voice`.

## Check
- Every word on screen is readable on a phone (video 1 held sideways).
- The voice and the screen say the same thing at the same time, and no step is cut short.
- Both play on a computer and an iPhone. Video 1 is under 10 MB; video 2 is under 16 MB (WhatsApp's limit).
- Every button in a caption or sentence matches the screen word for word. If STEP-53/54 named a button differently, fix the script line and report it.
