# STEP-12: login and install for non-technical families

Priority: login is blocking testing.

## Login: code first
- After "Enviarme acceso", go straight to a 6-digit code screen: big numeric input, paste support, OS autofill where available. Keep the email link as a fallback. On iPhone the link opens Safari, not the installed app, so the code is the main path.
- Map Supabase errors to clear ES/EN messages. Show a 60 s countdown on "Reenviar código" so people can't hit the rate limit.

## Install: one link, two buttons (no App Store, decided 26 Sep)
- On the landing page (and once after the first login), show two large buttons: **"Descargar para iPhone"** and **"Descargar para Android"**. Each has an original phone pictogram and the word. **No Apple or Google logos, no store badges.** Highlight the button for the visitor's device.
- **Android:** capture `beforeinstallprompt`, so the button opens the native install dialog (one tap). Fallback: "Menú ⋮ → Instalar app" with one illustration.
- **iPhone:** the button opens a bottom sheet with 2 illustrated steps (the Share icon, then "Añadir a pantalla de inicio"), and an animated arrow pointing at where Safari's Share button is.
- **In-app browsers** (WhatsApp, Gmail, Instagram, Facebook): first show "Abre este enlace en Safari / Chrome" with a "Copiar enlace" button.
- Hide the buttons when the app is already installed (`display-mode: standalone`).
