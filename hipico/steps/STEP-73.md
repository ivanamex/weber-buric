# STEP-73: phones always get the new version

Ivana: after a deploy, phones (above all the installed app on iPhone) keep showing the old version.

## Why it happens (today)
- `vite-plugin-pwa` with `registerType: 'autoUpdate'` and the injected `registerSW.js`: the new service worker installs and takes over, but **the open page keeps running the old code** until it's fully reloaded. The app only checks for a new version when it's opened from scratch.
- An installed app on iPhone almost never opens "from scratch". It resumes from the background, so it can stay on the old build for days.
- When the new worker takes over, it deletes the old files. The old page then asks for a lazy chunk that no longer exists (e.g. `/tienda`), and that screen breaks or comes up blank.
- `vercel.json` sends `no-cache` only for `/sw.js`. `index.html`, `registerSW.js` and `manifest.webmanifest` can be cached by the browser.

## What to build
1. **Register it ourselves:** `injectRegister: false` and `registerType: 'prompt'` in `vite.config.js`. `registerSW()` from `virtual:pwa-register` in `main.jsx` (`src/lib/update.js`). Keep `clientsClaim` and `cleanupOutdatedCaches`.
2. **Check often:** `registration.update()` at start, every 30 min while open, and every time the app comes back to the screen (`visibilitychange` → visible, `pageshow`, `focus`). At most one check per minute.
3. **Apply it at a safe moment:**
   - When a new version is waiting and the app was in the background (hidden → visible), **reload silently** (`updateSW(true)`). Do this only if nothing is in progress: no open sheet, `PayDialog` or lightbox, no dirty form (`useFormState` registers dirty forms in `update.js`), no upload or payment running, no checkout open.
   - Otherwise show a small sticky bar at the bottom (above the tab bar, `--pad-m`, olivewood glass): "Hay una versión nueva de la app." + **Actualizar** (mustard text button, level 1), which reloads. It hides itself and reloads on its own the next time the app comes back from the background while idle.
   - Website (`/`, `/tienda`, `/descargar`): no bar. Reload silently on the next route change, or when the tab comes back while no lightbox, cart or checkout is open.
4. **Never a blank screen from an old chunk:** listen for `vite:preloadError` and failed dynamic imports (the lazy routes): reload once (a `sessionStorage` guard `hipico.reloadedFor=<build>` stops a loop). If it still fails, show the error card "No pudimos cargar esta pantalla" + **Recargar**.
5. **Headers** (`vercel.json`): `Cache-Control: no-cache` for `/`, `/index.html`, `/registerSW.js` (if it still exists), `/manifest.webmanifest`, and every HTML route (the rewrite target). `/assets/*` stays immutable.
6. **See which version a phone has:** the build time is injected (`define: __BUILD__`, e.g. "17 oct · 10:40", Cancún time).
   - Shown in small bark text at the bottom of Ajustes (management) and Más / Ajustes (families): "Versión 17 oct · 10:40".
   - Under it, **Buscar actualizaciones** (text link): checks now. Then "Ya tienes la última versión" or it updates.
   - The same line in the demo bar's menu is not needed.
7. Demo and `/vista` (the phone on the website): same logic, no bar inside `/vista`.

## Phones already stuck on an old version
They get this fix with their next real update. For Ivana's and Mara's phones: close the app completely (swipe it away), open it, wait 5 seconds, close it and open it again. After that, every later update arrives by itself. Put this in the report as 3 short lines Ivana can forward.

## Check
- Build A, open `/app` and `/demo` in Playwright (390×844, service worker on), go to the background (`visibilitychange`). Deploy build B on the same preview: coming back reloads into B with no bar. Do it again with a sheet open: the bar shows and nothing reloads until Actualizar.
- With build A open, delete A's chunks (as the new worker does) and navigate to `/tienda`: it reloads into B once, no blank screen, no loop.
- `curl -I` on `/`, `/app`, `/manifest.webmanifest`: `no-cache`.
- The version line shows the build time in Ajustes and Más, and "Buscar actualizaciones" works.
- `npm run build` and `npm run check:hover` pass.
