# STEP-11: visual pass + logo

- **Logo** (already in `public/`): `logo-white.png` goes on the green hero and the app header, and `logo-green.png` on cream screens (login, empty states). Keep `logo-gold.png` for gold accents. Generate the PWA icons, favicon and apple-touch-icon from the logo on a green `#2E5339` background. The PNG is small (171×226), so keep it at 64 px tall or less on screen until the vector file arrives.
- **Pictograms:** original line icons (1.75 px stroke, rounded) in green and gold: horse head, horseshoe, helmet, saddle, calendar, receipt, trophy, family. Use them on the tab bar, cards, buttons and headings. Make them inline SVG components, and don't copy any existing icon set.
- **Plan progress as horseshoes:** e.g. 8 horseshoes with 5 filled in gold, instead of the bar ("5 de 8 clases").
- **Booking celebration:** a light animation under 1 s (horseshoes or confetti in green/gold). Respect `prefers-reduced-motion`.
- **Empty states:** a pictogram, one line and one action (e.g. "Aún no tienes clases reservadas" → "Reservar clase").
- Warm and a little playful, still premium. No extra screens or taps.
