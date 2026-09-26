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
- Colors: green `#2E5339`, dark green `#22402B`, gold `#B08648`, cream `#F6F2E9`, ink `#24211C`, sage `#7C9070`, terracotta `#B5502E`, borders `#E4DCCB`. Cards have a 16px radius. Mobile-first.
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

## Status (end of first session)

**Done and live**
- Landing page, PWA icons/manifest, ES/EN.
- Demo with seeded data at `/demo`.
- Supabase live mode at `/app`: email sign-in, Row Level Security, all booking/plan/payment rules in SQL.
- Management tabs: Hoy (attendance), Cobros (mark paid), **Familias** (add families and riders), Reportes.
- `schema.sql` has been run in supabase-cerise-harbor. Management email = the developer's Gmail.
- Supabase Auth URL Configuration set: Site URL is the live domain, Redirect URL includes `/app`.
- Merged PRs: ivanamex/weber-buric#1 (app), #2 (Supabase live mode), #3 (input text color fix).

**In progress**
- End-to-end test with a real test family: family "Weber", contact Ivana, rider Zara (8, intermediate), created in Familias.
- Still to confirm: that family signs in → chooses a plan ("Pagaré en el club") → books → management sees it in Hoy/Cobros and marks it paid.

## Next steps

1. **Connect Resend as Supabase's email sender.** Go to Supabase → Authentication → Emails → SMTP Settings and enter:
   - host `smtp.resend.com`, port `465`, user `resend`, password = Resend API key (the user pastes it; never ask for it);
   - sender name "Hípico Riviera Maya".

   Until a domain is verified, Resend only delivers to the account owner's address. The built-in Supabase email only sends a few per hour.
2. **Verify a domain in Resend** (the club doesn't have one yet; decide whether to buy one). Then set the sender to e.g. `acceso@<domain>`.
3. **Edit the "Magic link or OTP" email template** (possible only after custom SMTP): Spanish text with `{{ .ConfirmationURL }}` and `{{ .Token }}`. The login screen already offers a code box; iPhone installed-app users need the code.
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
