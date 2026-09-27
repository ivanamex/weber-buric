# Hípico Riviera Maya — project notes for Claude

Web app (installable PWA) for an equestrian club in Paamul, Quintana Roo, Mexico. It covers class bookings, monthly plans, horse boarding (pensión), rentals, events and a management panel. The UI is in Spanish (default) and English.

This folder is one project inside the `ivanamex/weber-buric` repo. The repo root is a separate real estate site; don't touch it when working on Hípico.

## Where things are

| What | Where |
|---|---|
| Live site | https://hipico-riviera-maya.vercel.app (landing `/`, real app `/app`, demo `/demo`) |
| Hosting | Vercel project **hipico** (team "ivanamex's projects"), Root Directory `hipico`, deploys from `main` |
| Database | Supabase project **supabase-cerise-harbor** (ref `ftdiyrayakazsqrrgcbm`), created through the Vercel integration, Free plan, US East |
| Emails | Resend account created; **not yet connected** to Supabase (see "Next steps") |

⚠️ The same Supabase account also has **Weber Buric Realty / ivanamex's Project**, the real estate database. Always check the top bar says *supabase-cerise-harbor* before running SQL for Hípico.

## Stack and rules (from the original brief — keep them)

- React + Vite, plain JavaScript, react-router-dom, vite-plugin-pwa. No UI or i18n libraries.
- **Sans-serif only:** Outfit (headings) + Inter (body), self-hosted via @fontsource. No serif anywhere.
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
- **Live mode at `/app`:**
  - sign-in with a 6-digit code (six boxes, paste and phone autofill, 60 s resend countdown), the email link as fallback; a device stays signed in (session kept and refreshed silently, "Salir" on a family phone keeps the account there with a one-tap "Continuar como…"; "Usar otro correo" or a management "Salir" signs out that device only); an optional password (created in Más) signs in on any phone, with open sign-up and instant access (a short form for unknown emails);
  - an existing email is always linked to its family, never duplicated.
- **Familias (management):**
  - add a family with riders, plan and start date;
  - edit a family, its riders and plans; assigning a plan the club already collected creates no charge;
  - Bloquear / Desbloquear, and Eliminar (soft delete, history kept).
- **Cobros:**
  - transfer receipts go to a private `receipts` bucket, with a review step (approve or reject with a note) and a count badge;
  - bank details are edited in *Datos para transferencia*.
- **Horario:**
  - weekly classes: create, edit, on/off;
  - cancel a single date (bookings return to the plan) or reopen it;
  - instructors and horses, with on/off.
- **Hoy:** Vino / No vino, plus "Todos vinieron".
- **Plans (family):** a "Plan activo" card tops Inicio and Mi plan (horseshoes, "Se renueva el…", Pagado / Por revisar / Pendiente, Reservar clase / Cambiar plan). A chosen plan is the rider's standing plan (`riders.plan_classes`) and renews monthly. `change_plan()`: upgrade applies now and charges only the difference (`payments.meta.kind = 'upgrade'`; the classes are added when it's approved, via `apply_plan_payment()`); downgrade starts at the next renewal. `plan_changes` keeps the history. Mi plan has "Historial de pagos" (12 months, receipt link); Familias shows plan + payment history per family. After an email-link sign-in in Safari on iPhone, a one-time card offers a password.
- **Classes outside the packages:** `book_single_class()` books a Clase muestra (one per rider, ever; no plan), Clase suelta (no plan) or Clase adicional (plan that month) with its own `payments` row (`service = 'class'`, `meta.kind`); `bookings.kind` / `payment_id` link them. Cancelling returns a plan class to the plan and drops a single class's unpaid charge (`release_booking()`). In Reservar, a rider without a plan (or with it used up) sees the plan first (coral) and the single options as small links. Prices `class_trial/single/extra` are edited in Cobros → Precios de clases; Hoy tags each rider; Reportes splits trial and single/extra income.
- **Plans run date to date:** a plan's period is `plans.starts_on` → `ends_on` (15 Sep → 14 Oct), counted from `riders.plan_start` (`period_of()` in SQL, `periodOf()` in `lib/time.js`; 31 Jan → 28 Feb → 31 Mar). `plan_at(rider, date)` finds the plan covering a date; a standing plan's next period (and its charge) is created on the first booking in it. Choosing a plan with none running starts it today. `plans.month` is the month the period starts in (kept unique per rider). A trigger fills the dates for any insert that only gives the month. Pensión stays by calendar month.
- **Owner's panel (management):** tabs are Resumen · Hoy · Horario · Cobros · Familias. *Resumen* (`admin/Summary.jsx`): activos, dinero (today / calendar month / 30 days, expected vs collected, daily chart `IncomeChart.jsx`), quién debe (days late + WhatsApp to the family's phone), por renovar (7 days), ocupación, upcoming salaries; links to Reportes, Rentabilidad, Nómina, Ajustes. *Nómina* (`employees`, `salary_payments`, `pay_salary()`: quincenal = 15th and last day, mensual = same day next month). *Rentabilidad* (`expenses`, `expense_categories`; income by source − payroll − expenses, 6-month trend). *Caballos* (`horses.status`: school / boarded / for_sale / retired / sold; sale price, age, breed, level, description, photos in the public `horse-photos` bucket; `sell_horse()` → `horse_sales`). *Ajustes*: `club_settings.module_payroll / module_profit / module_sales` — off by default in the live app, on in `/demo`. All these tables are management-only by row-level security.
- **Visual:**
  - club logo: white on green (header, hero), green on cream (login, splash); coral accent (no gold);
  - PWA icons and favicon made from the logo;
  - original pictograms (`Icon.jsx`: horseHead, horseshoe, helmet, saddle, receipt, family, balloons…);
  - plan progress as horseshoes (`Horseshoes` in `ui.jsx`);
  - booking celebration (`celebrate.js`, skipped with reduced motion);
  - empty states: a pictogram, one line and one action.
- **Landing:** a phone drawn in CSS shows the real app (`/vista`: the demo in memory, nothing saved, touring Inicio → Reservar → Mi plan); a horse drawn with letters (`components/TextHorse.jsx`) glows sage→coral near the pointer in the hero and gallops across the closing band; WebP photo bands fade in on scroll; hovers are desktop-only and respect reduced motion.
- **Share the app:** Familias → *Compartir la app* (`admin/ShareApp.jsx`): QR made in the browser with `qrcode-generator` (level H, club logo on green in the centre, `components/QrCode.jsx`), Descargar QR (PNG), Imprimir cartel (A4, ES + EN, print CSS), Copiar enlace, WhatsApp. The landing shows a small QR next to the download buttons on computers only. The link is the landing (`/`).
- **Install** (`components/Install.jsx`, `lib/install.js`): "Descargar para iPhone / Android" on the landing and once after the first sign-in; the visitor's phone is highlighted. Android opens the native dialog (`beforeinstallprompt`, captured in `main.jsx`) or shows the ⋮ menu guide; iPhone shows a two-step sheet with an arrow to Safari's Share; in-app browsers (WhatsApp, Instagram…) get "Copiar enlace". Hidden when running installed.

**Database updates so far:** `20260927_family_accounts`, `20260928_transfer_receipts`, `20260929_family_block_delete`, `20260930_schedule`, `20261001_plan_changes`, `20261002_single_classes`, `20261003_owner_panel`.

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
