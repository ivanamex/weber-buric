# Hípico Riviera Maya — project notes for Claude

Web app (installable PWA) for an equestrian club in Paamul, Quintana Roo, Mexico. It covers class bookings, monthly plans, horse boarding (pensión), rentals, events and a management panel. The UI is in Spanish (default) and English.

This folder is one project inside the `ivanamex/weber-buric` repo. The repo root is a separate real estate site; don't touch it when working on Hípico.

## Where things are

| What | Where |
|---|---|
| Live site | https://hipico-riviera-maya.vercel.app (club website `/` and `/en`, download page `/descargar`, real app `/app`, demo `/demo`) |
| Hosting | Vercel project **hipico** (team "ivanamex's projects"), Root Directory `hipico`, deploys from `main` |
| Database | Supabase project **supabase-cerise-harbor** (ref `ftdiyrayakazsqrrgcbm`), created through the Vercel integration, Free plan, US East |
| Emails | Resend account created; **not yet connected** to Supabase (see "Next steps") |

⚠️ The same Supabase account also has **Weber Buric Realty / ivanamex's Project**, the real estate database. Always check the top bar says *supabase-cerise-harbor* before running SQL for Hípico.

## Stack and rules (from the original brief — keep them)

- React + Vite, plain JavaScript, react-router-dom, vite-plugin-pwa. No UI or i18n libraries.
- **Sans-serif only:** Outfit (headings) + Inter (body), self-hosted variable fonts (`@fontsource-variable/outfit` + `/inter`, imported in `main.jsx`; CSS names `'Outfit Variable'`, `'Inter Variable'`). No serif anywhere.
- Colors (CSS variables in `styles.css`): green `#2E5339`, dark green `#22402B`, cream `#F6F2E9`, ink `#24211C`, borders `#E4DCCB`, sage `#7C9070` (success). Primary buttons (`.btn--primary`, `.btn--accent`) are **coral liquid glass**: a light coral tint with green text on cream, brighter with white text on green (`.hero`, `.lheader`, `.closing`, `.card--green`, `.appbar`…). The accent is **soft coral**: `--accent` `#F4876A`, `--accent-strong` `#E6735A` (buttons, bold white text), `--accent-hover` `#D9664E`, `--accent-soft` `#FBE3DA`, `--accent-ink` `#C2553D`. Errors use `--danger` `#C0392B`. **No gold.**
- Every string goes through `src/i18n/es.json` + `en.json`, which must keep the same keys.
- Timezone America/Cancun (UTC-5, no DST), currency MXN.
- No dead buttons: anything not built yet shows a "Próximamente" toast.

## Code map

```
src/data/store.js    the only module screens import; activate('demo'|'live'); async actions → { ok, code }
src/data/queries.js  pure calculations shared by both modes
src/data/demo.js     demo mode: localStorage + seed.js, same rules as the DB
src/data/live.js     Supabase client, email OTP sign-in, calls the RPC functions, reloads state
src/data/prices.js   example prices; live mode overwrites them from the `prices` table
src/app/Backend.jsx  mounts /app (live if keys exist, else demo) and /demo (always demo)
supabase/schema.sql  tables + Row Level Security + SECURITY DEFINER functions (the business rules)
```

- **Keys:** `vite.config.js` reads only the public Supabase URL/anon key (`VITE_*`, `NEXT_PUBLIC_*` or `SUPABASE_URL`/`SUPABASE_ANON_KEY`). It fails the build if given a secret/service_role key.
- **Access:** management = emails in the `admins` table. A family = the email on its `families` row. Anyone else can sign in but gets "Este correo no está registrado".
- **Rules** are enforced in the SQL functions: level match, open spot, a plan for that month with classes left, cancel ≥12 h returns the class, no-show counts as used, a horse can't be double-booked. `demo.js` mirrors them.
- **Error codes** returned by actions map to `errors.*` in the i18n files.

## Editing pattern
Every management form uses `components/EditKit.jsx`: `useFormState` (knows when it's dirty), `SaveBar` (one coral `btn--save` Guardar, full width on phones, Cancelar as a link, error shown above it), `useDiscardGuard` / `ConfirmDialog` ("¿Descartar cambios?"), `Sheet` (bottom sheet). `admin/useSave.js` returns `[run, busy, error]`; pass `{ inline: true }` to show errors in the form instead of a toast. No emoji anywhere: the family greeting uses `components/GreetingMark.jsx` (sun rising / half-set / moon and star).

Phone layout rules (iPhone Safari): dates use `components/DateInput.jsx` (shows "27 sep 2026" in the app's language; the native picker sits on top, invisible); every field is 46 px with the same padding and corners; form grids stack one field per row under 480 px. The tab bar is `position: fixed; left: 0; right: 0; bottom: 0` with no transform, and its background continues below it (Safari's translucent toolbar). The header and the demo bar share one sticky block (`.apptop`). `.page` fades with opacity only: a transform would break fixed sheets inside it.

Desktop (≥1024 px, `components/Desk.jsx`): management gets `DeskShell` in `AppShell.jsx` — a sidebar (collapsible to icons, icons-only by default under 1280 px) and a top bar with the page title, a search box (`useDeskSearch`, `/` focuses it) and the page's main action (`useDeskAction`). Sheets become a right-hand side panel (Esc closes). Cobros (`ReceivablesDesk`), Familias, Caballos and Nómina are sortable `DataTable`s with filters, details in the side panel and `exportCsv()` (UTF-8 + BOM, opens in Excel); Resumen is a card grid; Hoy shows classes as columns; the Horario grid lets you drag down empty hours to create a class that long; Rentabilidad's blocks sit side by side; Cobros and Hoy print cleanly (`@media print`). Families on a computer get `FamilyDeskShell`: the green header and demo bar full width, a light sidebar with every section (Inicio, Clases, Mi plan, Mi caballo if they board a horse, Pagos, Eventos, Perfil, Instalar app, Ajustes, Salir; no "Más"), content up to 1200 px in two columns (`.fcols`: Inicio, Mi plan, Mi caballo). Phones keep the bottom tabs with "Más" (`/familia/mas` shows every section; the desktop pages are `/familia/caballo · pagos · eventos · perfil · instalar · ajustes`). The logo always goes to the role's home; breadcrumbs on desktop; detail pages get "← <where it goes>" (lists pass `state.from`, back = `navigate(-1)`), and going back restores the scroll (`useScrollMemory` in `AppShell`). Filters that should survive live in the address (e.g. `?vista=caballos&estado=boarded`). `useDesktop()` decides; phones are unchanged. The website and download-page headers have "Entrar" (→ `/app`).

## Database updates

Database changes ship as files in `supabase/migrations/` (`YYYYMMDD_name.sql`, safe to run twice, no `begin`/`commit`). The production build runs `scripts/migrate.mjs` first, which applies new files automatically via `POSTGRES_URL_NON_POOLING`, with TLS verified against `scripts/supabase-ca.crt`. Don't ask the user to paste SQL.

To check a deploy: `curl https://api.github.com/repos/ivanamex/weber-buric/commits/<sha>/status` shows Vercel's state, and a failed migration makes it `failure`.

## How to verify changes

- `npm run build` must pass.
- **UI:** Playwright with Chromium at `/opt/pw-browsers/chromium`, via the global module `/opt/node22/lib/node_modules/playwright`. Run `npx vite preview` and drive `/demo` at a 390×844 viewport.
- **Live mode without the real DB:** run `schema.sql` on PGlite (`@electric-sql/pglite`) with stubbed `anon`/`authenticated` roles and an `auth.jwt()` that reads `request.jwt.claims`. Put a small mock of the GoTrue/PostgREST endpoints in front of it. Build with `VITE_SUPABASE_URL=http://localhost:54321` and drive `/app`. Keep test code outside the repo (scratchpad).
- The cloud container can't reach `*.vercel.app` or the user's Supabase, so the user checks the live site.
- Shell gotcha: `pkill -f <pattern>` inside a longer command can kill the shell itself (exit 144). Run it on its own.

## Status

**Live** (all on `main`, deployed by Vercel, database updates applied automatically):
- **Landing and app:** landing page, PWA, ES/EN, and the demo at `/demo`, which mirrors every feature.
- **Demo is separate from the real app:** its data is under `hipico.demo.*` keys (state, receipts, rider, once-only cards), and the chosen role is never saved, so `/demo` always opens on the role picker (arriving there leaves any open role). A sticky demo bar under the header has *Familia ⇄ Dirección* (same data) and *Salir de la demo*. `/demo?reset=1` puts the sample data back. The demo never touches the Supabase session.
- **Live mode at `/app`:**
  - sign-in with a 6-digit code (six boxes, paste and phone autofill, 60 s resend countdown), the email link as fallback; a device stays signed in (session kept and refreshed silently, "Salir" on a family phone keeps the account there with a one-tap "Continuar como…"; "Usar otro correo" or a management "Salir" signs out that device only); an optional password (created in Más) signs in on any phone, with open sign-up and instant access (a short form for unknown emails);
  - an existing email is always linked to its family, never duplicated.
- **Familias (management):**
  - add a family with riders, plan and start date;
  - edit a family, its riders and plans; assigning a plan the club already collected creates no charge;
  - Bloquear / Desbloquear, and Eliminar (soft delete, history kept).
- **Cobros:**
  - *Por cobrar* (`admin/Receivables.jsx`) opens the tab: Vencido · Vence hoy · Por vencer (5 días) · Más adelante este mes, with totals, concept filters, each line's due date, reminders sent, Marcar pagado and WhatsApp; *Flujo por mes* shows this month and the next two (esperado / cobrado / por cobrar / vencido). Charges not created yet (next plan periods, pensiones) show as *Esperado* (`projectedCharges()` in `queries.js`);
  - every charge has `payments.due_on` (trigger `payments_fill_due` → `payment_due()`: plan = period start, pensión = `club_settings.boarding_due_day` of its month, class/ride = its day, event = start date; `dueOf()` in `queries.js` mirrors it);
  - **payment reminders:** Vercel cron (`vercel.json`, 13:00 UTC = 8:00 Cancún) calls `api/reminders.js` → `reminders_due()` creates charges that are due or due within 5 days (`materialize_due_charges()`), then picks reminders (5 days before, the day, 3 days after, then weekly; skips receipts under review) and logs them in `payment_reminders`; the function emails each one and records the status. Email via `SMTP_USER` + `SMTP_PASS` (Gmail by default; `SMTP_HOST`/`SMTP_PORT` optional) or `RESEND_API_KEY` + `REMINDER_FROM`, set in Vercel → Settings → Environment Variables (the user pastes them there; never ask for them). Without them reminders only show in the app. Optional `CRON_SECRET`. Families see a *Pagos por vencer* card on Inicio (`familyDueSoon()`), which opens the transfer panel (`/familia/plan?pagar=<id>`). Ajustes → *Recordatorios de pago*: on/off, the pensión's day, a note added to every reminder, and the last run's status;
  - transfer receipts go to a private `receipts` bucket, with a review step (approve or reject with a note) and a count badge;
  - bank details are edited in *Datos para transferencia*.
- **Horario** (`admin/ClassesView.jsx`):
  - *+ Nueva clase* creates many at once: day chips L–D (closed days greyed), several start times, details, *Desde* / *Hasta* or *Sin fecha de fin*, and a live preview ("Se crearán 18 clases por semana: mar–dom a las…"). Each day × time is one `slots` row with `starts_on` / `ends_on`;
  - *Editar* asks *Solo esta clase* / *Esta y las siguientes* / *Toda la serie* (`edit_class()`): one date becomes a one-off slot (`starts_on = ends_on`) and the weekly one gets a hidden `slot_cancellations` row with `replaced_by`; "following" splits the row at that date (same `series_id`, bookings move); "Terminar la serie aquí" ends it and returns later bookings to their plans. Past dates and one-offs edit as a whole;
  - cancel one date or a range (`cancel_class_range()`), copy the week on screen to the next week or a range (`copy_week()`, skips classes already there);
  - phones: week strip + day list; desktop (≥900 px): days × hours grid, an empty cell opens *Nueva clase* on that day and time;
  - *Días cerrados* in Ajustes: `club_settings.closed_weekdays` (Monday by default) and `closed_dates` (adding a range cancels the booked classes in it). `club_closed()` blocks bookings; `slot_runs()` checks weekday + validity. `queries.js`: `slotsOn`, `isClosed`, `closedDateOn`, `slotRuns`;
  - instructors and horses, with on/off.
- **Hoy:** Vino / No vino, plus "Todos vinieron".
- **Plans (family):** a "Plan activo" card tops Inicio and Mi plan (horseshoes, "Se renueva el…", Pagado / Por revisar / Pendiente, Reservar clase / Cambiar plan). A chosen plan is the rider's standing plan (`riders.plan_classes`) and renews monthly. `change_plan()`: upgrade applies now and charges only the difference (`payments.meta.kind = 'upgrade'`; the classes are added when it's approved, via `apply_plan_payment()`); downgrade starts at the next renewal. `plan_changes` keeps the history. Mi plan has "Historial de pagos" (12 months, receipt link); Familias shows plan + payment history per family. After an email-link sign-in in Safari on iPhone, a one-time card offers a password.
- **Confirmed classes stay visible:** Inicio shows the next class big plus a *Próximas clases* list (`family/Upcoming.jsx`: date, time, instructor, horse, Cancelar), and Mi plan shows the same list under the plan card. A date after the plan renews counts against the next period: Clases says so before confirming ("Se descuenta de tu plan de octubre…" + that period's count), the success toast names it, and the plan card shows "Octubre (desde el 1 oct): 1 de 4 clases". Days with a confirmed class get a coral dot. Booking errors are explained in plain words (level, closed day, full) and stay until closed (`toast(msg, 'error', { sticky: true })`).
- **Wording:** a class from the plan is *confirmed* ("Confirmar clase", "Confirmada", "Clase confirmada · te quedan N"; tab "Clases"). Only classes paid on their own (muestra / suelta / adicional) and horse rides say "Reservar".
- **Classes outside the packages:** `book_single_class()` books a Clase muestra (one per rider, ever; no plan), Clase suelta (no plan) or Clase adicional (plan that month) with its own `payments` row (`service = 'class'`, `meta.kind`); `bookings.kind` / `payment_id` link them. Cancelling returns a plan class to the plan and drops a single class's unpaid charge (`release_booking()`). In Reservar, a rider without a plan (or with it used up) sees the plan first (coral) and the single options as small links. Prices `class_trial/single/extra` are edited in Cobros → Precios de clases; Hoy tags each rider; Reportes splits trial and single/extra income.
- **Plans run date to date:** a plan's period is `plans.starts_on` → `ends_on` (15 Sep → 14 Oct), counted from `riders.plan_start` (`period_of()` in SQL, `periodOf()` in `lib/time.js`; 31 Jan → 28 Feb → 31 Mar). `plan_at(rider, date)` finds the plan covering a date; a standing plan's next period (and its charge) is created on the first booking in it. Choosing a plan with none running starts it today. `plans.month` is the month the period starts in (kept unique per rider). A trigger fills the dates for any insert that only gives the month. Pensión stays by calendar month.
- **Owner's panel (management):** tabs are Resumen · Hoy · Horario · Cobros · Familias. *Resumen* (`admin/Summary.jsx`): activos, dinero (today / calendar month / 30 days, expected vs collected, daily chart `IncomeChart.jsx`), quién debe (days late + WhatsApp to the family's phone), por renovar (7 days), ocupación, upcoming salaries; links to Reportes, Rentabilidad, Nómina, Ajustes. *Nómina* (`employees`, `salary_payments`, `pay_salary()`: quincenal = 15th and last day, mensual = same day next month). *Rentabilidad* (`expenses`, `expense_categories`; income by source − payroll − expenses, 6-month trend). *Caballos* (`horses.status`: school / boarded / for_sale / retired / sold; sale price, age, breed, level, description, photos in the public `horse-photos` bucket; `sell_horse()` → `horse_sales`). *Horse profile* (`admin/HorseProfile.jsx`, route `direccion/caballos/:id`, `nuevo` to create): basics on `horses` (birth year → age, sex, breed, coat, height, level incl. Competencia), photos (first = main), *Ración diaria* in `horse_care` (feed lines per ration, rations/day, supplements, notes), health in `horse_health` (vaccine / deworming / farrier / vet with next due). The profile opens as a finished page; each section (Datos, Fotos, Ración diaria) has its own Editar, one open at a time. Salud tiles open a sheet preset to their type (next date suggested: vaccine +6 months, deworming +3, farrier +6 weeks); a history line opens the same sheet to edit (`updateHealth`) or delete. Pensión horses have "Ver como lo ve el dueño" (the shared `MyHorseCard`). Resumen lists what's due in 14 days. A family with a boarded horse sees it read-only in Más → *Mi caballo* (row-level security: `owns_horse()`). *Ajustes*: `club_settings.module_payroll / module_profit / module_sales` — off by default in the live app, on in `/demo`. All these tables are management-only by row-level security.
- **Visual:**
  - club logo: white on green (header, hero), green on cream (login, splash); coral accent (no gold);
  - PWA icons and favicon made from the logo;
  - original pictograms (`Icon.jsx`: horseHead, horseshoe, helmet, saddle, receipt, family, balloons…);
  - plan progress as horseshoes (`Horseshoes` in `ui.jsx`); the horseshoe is one shape, `HORSESHOE_D` in `Icon.jsx` (upright U, 3 nail holes a side), used by the app icons, the counter and the site;
  - booking celebration (`celebrate.js`, skipped with reduced motion);
  - empty states: a pictogram, one line and one action.
- **Club website** (`src/site/`, replaces the Wix site): **one page**, `/` in Spanish and `/en` in English (`OnePage.jsx` inside `SiteLayout.jsx`). Order (every section at most one screen on desktop; same 96/64 px padding, same title size, 24 px card radius; no pinned scroll): hero (the 3 `HERO_SCENES` clips full-bleed at 0.75×, 1 s cross-fades, chips bottom-right; white text bottom-left over a dark scrim; only the first clip loads, the next one once it plays) → `01 Qué hacemos` (bento with the app's prices + "Aprende a montar": 4 step tiles on a sand band where embossed hoofprints walk across, `Hoofprints.jsx`, anchor `#aprende`) → `02 Competencias` (`jump-sunset` still + stories + Campeón Estatal 2024) → `03 Equinoterapia` (glow panel: `grooming` clip 16:9 beside the text, 3 step tiles, CTA) → `04 Pensión y caballos` (`paddock-herd` still 4:5 left; Pensión and Caballos en venta as plain blocks with a divider; horses for sale from the app when the module is on) → `05 La app` (on mist, static phone showing Inicio via `/vista?control`, 3 statements, Descargar) → `06 Comunidad` (families photo + line, then the event cards) → `07 Disfruta` (one slow row of stills, 260/180 px: every image in `public/img/gallery/` via `virtual:gallery` = `scripts/gallery-plugin.mjs`, repeated so the loop never shows a gap) → `08 Visítanos` → footer. Only two videos on the page: the hero and Equinoterapia. Hoofprints: a height map of one print (hoof wall U open at the heel, sole, frog V) lit in a WebGL fragment shader from the top left (2D pre-lit sprite if WebGL can't start), a trail walking diagonally once the band is on screen (250 ms per print), fresh prints along the mouse path on computers, fading after 6 s, paused off screen; reduced motion: 6 still prints. The Equinoterapia clip uses `Clip` in `OnePage.jsx` (`CLIPS` in `content.js`; stills in `STILLS`): muted, loop, `preload="metadata"`, poster, play only while on screen; reduced motion or Save-Data → posters only. Steps: every number in deep; the line above fills left to right when the row comes into view. Apricot only in the buttons, step tile 4, the glows and the progress line (never text or icons). Section ids in `routes.js` (`SECTIONS`, per language); the old pages (`/clases`, `/en/lessons`…) redirect to `/#section`. Bar (64 px): transparent with white text over the hero video, mist glass after it; scroll-spy underline, thin sage → apricot progress line; phones get a bottom-sheet menu and a sticky "Agenda una clase muestra" after the hero that hides near Visítanos. ES ⇄ EN keeps the section (View Transitions). An English visitor coming back to `/` goes to `/en`. Look (`site.css`): mint mist `#EEF3EE` base, deep `#10271F` text, jungle `#24503F`, moss `#4E7A5A`, sage `#A9C3AE`, sand `#E9DCC6`, apricot `#F2B48C`, ember `#D9783F` (tiny accents only). No lilac/purple, coral, lime, navy or gold. Type: headlines condensed uppercase Archivo (`font-stretch: 66%`, 800; one size for section titles, `--card-title` for every card title); nav, buttons, chips and labels Archivo at 80% width, 600; body Hanken Grotesk (`@fontsource-variable/hanken-grotesk`); site only, the app keeps Outfit + Inter. Main buttons are frosted sage → apricot glass (`.sbtn--deep` + `.sbtn__in`, blur, white border, inner highlight; white glass with white text on the hero video; hover: tint slides, small fence draws in, label hops); secondary = deep outline (white on the video). Steps sit on their own tiles: 1 sage · 2 mint · 3 sand · 4 apricot. Glows: sage + apricot in Equinoterapia and the footer; progress line sage → apricot. No text boxes float on video or photos (solid scrims only); clips in 16:9 frames. Events: up to 3 whole cards + "Ver todos" on a computer, a snap row (next card peeks 24 px) with dots on phones. Motion (`motion.jsx`): `Letters`, `Kinetic` (headline weight 500 → 800 once), reveals 12 px/400 ms once, CSS scroll-driven photo zoom; all off with reduced motion. Head: title, description, canonical, hreflang, Open Graph `og-horse-blaze.jpg` (horse only) and JSON-LD `SportsActivityLocation` (no geo until the exact coordinates are known). `content.js` holds the four big photos (`BIG`, one place to swap them; alt text describes the scene, never names), the club photos, contact, counter figures (block hidden until real numbers) and testimonials (hidden until a real one is typed). Prices, events and horses for sale come from `public_site()` (`siteData.js`). "App del club" opens `/app` when signed in or installed, otherwise `/descargar`. The website is code-split from the app.
- **Download page** `/descargar` (`pages/Landing.jsx`, formerly at `/`): a phone drawn in CSS shows the real app (`/vista`: the demo in memory, nothing saved, touring Inicio → Reservar → Mi plan); one horse drawn with letters (`components/TextHorse.jsx`) gallops across the closing band (the hero has none; it ends after "Sin descargas…"); WebP photo bands fade in on scroll; hovers are desktop-only and respect reduced motion.
- **Share the app:** Familias → *Compartir la app* (`admin/ShareApp.jsx`): QR made in the browser with `qrcode-generator` (level H, club logo on green in the centre, `components/QrCode.jsx`), Descargar QR (PNG), Imprimir cartel (A4, ES + EN, print CSS), Copiar enlace, WhatsApp. The landing shows a small QR next to the download buttons on computers only. The link is the download page (`/descargar`, also in the install guide's "Copiar enlace"); printed posters depend on it, so keep that address.
- **Install** (`components/Install.jsx`, `lib/install.js`): "Descargar para iPhone / Android" on the landing and once after the first sign-in; the visitor's phone is highlighted. Android opens the native dialog (`beforeinstallprompt`, captured in `main.jsx`) or shows the ⋮ menu guide; iPhone shows a two-step sheet with an arrow to Safari's Share; in-app browsers (WhatsApp, Instagram…) get "Copiar enlace". Hidden when running installed.

**Database updates so far:** `20260927_family_accounts`, `20260928_transfer_receipts`, `20260929_family_block_delete`, `20260930_schedule`, `20261001_plan_changes`, `20261002_single_classes`, `20261003_owner_panel`, `20261004_horse_profile`, `20261005_schedule_bulk`, `20261006_collections`, `20261007_public_site`.

⚠️ Every migration ends with `revoke execute on all functions … from public, anon`, so it must also re-run `grant execute on function public_site() to anon;` (the website reads it without signing in).

**Waiting on the club:** bank details (bank, holder, 18-digit CLABE), real prices, schedule, instructors and horses, the owner's email for management, and the logo as a vector file (the PNG is 171×226, so keep it at 64 px tall or less).

## Next steps

1. **Connect Resend as Supabase's email sender.** Go to Supabase → Authentication → Emails → SMTP Settings and enter:
   - host `smtp.resend.com`, port `465`, user `resend`, password = Resend API key (the user pastes it; never ask for it);
   - sender name "Hípico Riviera Maya".

   Until a domain is verified, Resend only delivers to the account owner's address. The built-in Supabase email only sends a few per hour.
2. **Verify a domain in Resend** (the club doesn't have one yet; decide whether to buy one). Then set the sender to e.g. `acceso@<domain>`.
3. **Edit the "Magic link or OTP" email template** (possible only after custom SMTP): Spanish text with `{{ .ConfirmationURL }}` and `{{ .Token }}`. The login screen is code-first (6 digits), so the template must show `{{ .Token }}` prominently.
4. **Replace example data with real club data:** prices (`prices` table), weekly schedule (`slots`), instructors, horses. Add boarded horses (`horses.type='boarded'`, `owner_family_id`). Add the owner's email to `admins` when ready.
5. **Mercado Pago card payments:** "Pagar con tarjeta" still shows "Próximamente". Needs a Supabase Edge Function for the Checkout Pro preference and a webhook that marks the payment paid.
6. **Nice to have:** edit/remove families and riders in the app (today only via Supabase Table Editor); a custom domain for the app; push/WhatsApp reminders.

## Working with this user

- They're not a developer. Give short, numbered, click-by-click steps. They reply with screenshots.
- Work on branch `claude/modest-turing-inrxo9`. When it's been merged, restart it from `main`. The user has approved opening and merging a PR for each finished change.

## Run order and steps

- `hipico/RUN-ORDER.md` is the source of truth for what comes next. Keep it short, and update it when a step is done.
- Step specs are in `hipico/steps/STEP-XX.md`. When the user says "do STEP-XX", read that file plus `steps/README.md` (the rules for every step), build it, push it, and wait for "ok".
- Supabase organizations: Hípico is in **"ivanamex's projects"** (created through Vercel; open it via Vercel → Integrations → Supabase → Open in Supabase). "Weber Buric Realty" is a different organization, so don't touch it.
