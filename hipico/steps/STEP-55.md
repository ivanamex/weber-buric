# STEP-55: two video guides, made the El Árbol way

**Go right after STEP-71: Ivana says the screens are final (16 Oct).** Every change to the website or the app before that would make the video outdated. When she says go, record from the live state of `main`.

Same method as El Árbol's office video (Arbol-portal STEP-32): the demo is **recorded for real while it runs**, the camera moves in on each action, and a Spanish voice says what to do. Each step lasts exactly as long as its sentence. There are two short videos instead of one long one: one for the club, one for families.

## The video for Mara (now): "La app del club" (about 60 s, 1920×1080)
Ivana (16 Oct): the video shows **the demo, not signing in or creating an account**. It starts on the website, goes into the demo, walks the side panel and says that everything can be adjusted. The family video for WhatsApp ("Clases en el Hípico") waits until after the meeting.
- Recorded at 1280×720 (2×), the El Árbol way (real recording, the camera follows the action, Alejandro Garcia's voice).
- Title card: "La app del club" · "Hípico Riviera Maya".
- Steps:
  1. Website `/`: the hero, then the pointer clicks **App del club**.
  2. Sign-in screen: the demo card on top (STEP-69), then click **Ver la demo**.
  3. Demo role picker, then **Dirección**.
  4. Resumen: the pointer passes over the tiles and clicks Planes activos, its list opens, back.
  5. Side panel, one click each: **Hoy** (Vino / No vino), **Horario** (Semana, block a day "Lluvia"), **Cobros** (Por revisar → Aprobar), **Familias**, **Mensajes**.
  6. Demo bar: switch to **Familia**: Inicio (the plan card), **Clases** (confirm a class, the celebration), **Pagar** (the payment window with its 3 options, closed without paying).
  7. Closing card: "Todo se adapta a como trabaja el club." · "Pruébalo: hipico-riviera-maya.vercel.app → App del club → Ver la demo".

## The look (both videos)
- The real screen fills the frame, with no browser or phone frame. Recorded with Chrome's screencast at 30 fps: the mouse moves and clicks, the text is typed, things open and scroll.
- The only things drawn on top are the pointer and a mustard `#D9A441` ripple where it clicks.
- The camera eases in on the action (up to about 1.8×) and back out when the screen changes.
- A short numbered step label sits at the lower left, for watching without sound. Archivo condensed + Hanken Grotesk. Cards on parchment `#F1EAD8` with the club logo.
- Hide what only the demo has (demo bar, demo notes, toasts that don't belong to the step). Demo data only; no real families.

## The voice
- ElevenLabs, **Alejandro Garcia** (the voice Ivana picked for El Árbol), model Multilingual v2. Chat Claude makes the flow with 4 takes. Ivana downloads the take she likes and uploads it.
- The script splits the take at the pauses between sentences (by each sentence's expected length) and fits each step to its sentence.
- Script (one sentence per step):
  1. Esta es la app del club.
  2. Desde la página, entra a App del club.
  3. Y toca Ver la demo: son datos de ejemplo, puedes probar todo.
  4. Entra como dirección.
  5. En Resumen ves todo de un vistazo; cada número te lleva a su lista.
  6. En el panel tienes el día, el horario, los cobros, las familias y los mensajes.
  7. Y así lo ve una familia: su plan, sus clases y sus pagos, desde el celular.
  8. Todo se adapta a como trabaja el club.
  9. Pruébalo en la página del club.
- Mixed at −16 LUFS, AAC.

## How it's made (Claude Code)
- `hipico/scripts/guides/guide.mjs mara` (keep the `familias` scene list for later): records the steps from `/demo?reset=1` (logging the pointer and the camera's targets as it goes), then renders the clips fitted to each sentence, the camera, the pointer, the cards, the voice and the MP4.
- `--voice <take.mp3>` adds the voice. Without it, the script makes a silent cut timed by estimate, to check the picture.
- Port the recorder and renderer from `ivanamex/Arbol-portal` → `scripts/guides/site-guide.mjs` (add it read-only). Swap in the Hípico style.
- Playwright `executablePath` `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` if the browser isn't found; ffmpeg for the render.
- Output `hipico/guides/out/es/mara.mp4` (not committed). Commit the script only. Deliver the two silent cuts. After that, chat Claude adds the voices and renders the final versions with `--voice`.

## Check
- Every word on screen is readable on a phone (video 1 held sideways).
- The voice and the screen say the same thing at the same time, and no step is cut short.
- Both play on a computer and an iPhone. Video 1 is under 10 MB; video 2 is under 16 MB (WhatsApp's limit).
- Every button in a caption or sentence matches the screen word for word. If STEP-53/54 named a button differently, fix the script line and report it.
