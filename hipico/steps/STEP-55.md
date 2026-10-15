# STEP-55: instruction video for Mara (about 2 minutes)

Run after STEP-54. **Claude Code records the screen; chat Claude adds the Spanish voice-over and assembles the final video.**

## Recording (Claude Code)
- Playwright video recording of `/demo?reset=1` on the live site at **1440 × 900** (plus the phone scenes at **390 × 844**), smooth slow mouse moves, no typing mistakes, each scene a separate file `hipico/video-guide/scene-XX.mp4` (H.264, no sound), 6–15 s each, with a 1 s still at the start and end of each scene.
- Scenes (same order as the voice-over):
  1. **Website** `/`: the hero, scroll to Qué hacemos, open Clases, choose "8 clases al mes" (stop before paying).
  2. **Phone, Familia:** Inicio (plan card), tap Clases → Semana view → confirm a class → the celebration.
  3. **Phone, Familia:** Pagos → Pagar por transferencia → upload a receipt.
  4. **Desktop, Dirección:** Resumen (click Planes activos → its list), back.
  5. **Dirección → Horario:** Semana view, block a day ("Lluvia"), the family sees the cancellation.
  6. **Dirección → Cobros:** Por revisar → open the receipt → Aprobar; Por cobrar → WhatsApp reminder.
  7. **Dirección → Mensajes:** a contact message from the website.
  8. **End card:** the club logo on parchment + `hipico-riviera-maya.vercel.app`.
- Commit the scenes and a `scenes.json` with each file's length.

## Voice-over and assembly (chat Claude)
Script in Spanish, warm and simple, one or two sentences per scene; voice from ElevenLabs; final `guia-hipico.mp4` (1080p, subtitles burned in ES) delivered to Ivana.
