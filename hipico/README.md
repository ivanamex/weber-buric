# Hípico Riviera Maya — Phase 1 demo

A web app (PWA) for **Hípico Riviera Maya** (Paamul, Quintana Roo). It covers class bookings, monthly plans, horse boarding (pensión), rentals, events, and a management panel. The UI is bilingual (ES by default, EN available).

Without any settings it runs as a demo: sample data is kept in the browser and it needs **zero environment variables**. With Supabase connected, `/app` becomes the real app (see **Live mode** below).

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the build (service worker active)
```

Requires Node 18+.

## Deploy to Vercel

This project lives in the `hipico/` folder of the repository.

1. Push the repo to GitHub.
2. In Vercel, go to **Add New → Project** and import the repo.
3. Set **Root Directory** to `hipico`. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
4. Click **Deploy**. You don't need any env vars. `vercel.json` already includes the SPA rewrites and service-worker headers.

To deploy from the CLI instead: `cd hipico && npx vercel --prod`.

## Routes

| Route | What it is |
|---|---|
| `/` | Public landing page. Send this link to the owner and families. |
| `/app` | Sign-in. Demo buttons until Supabase is set up, then email sign-in. This is also the PWA start URL. |
| `/demo` | Always the demo with sample data |
| `/app/familia` (`/reservar`, `/plan`, `/mas`) | Family app: Inicio, Reservar, Mi plan, Más |
| `/app/direccion` (`/cobros`, `/familias`, `/reportes`) | Admin app: Hoy, Cobros, Familias, Reportes |

## Where things live

```
src/
  data/prices.js     ← ALL prices (placeholders, "*precios de ejemplo"). Edit here.
  data/seed.js       ← demo data (instructors, horses, slots, families, riders…)
  data/store.js      ← the ONLY module screens import: picks demo or live, exposes queries + actions
  data/queries.js    ← read-only calculations (spots left, plan progress, reports…)
  data/demo.js       ← demo mode: sample data in localStorage, same rules as the database
  data/live.js       ← live mode: Supabase client, sign-in, calls the database functions
supabase/schema.sql  ← tables, security rules and booking/payment functions (run once in Supabase)
  i18n/es.json, en.json, I18nProvider.jsx   ← dictionaries + tiny t() hook
  lib/time.js        ← America/Cancun date helpers
  pages/Landing.jsx  ← public homepage
  app/…              ← login, shell, family & admin screens
```

### Business rules (enforced in `demo.js` and in the database functions)
- A booking needs an open spot, the rider's level must match the class level, and the rider needs a plan for that class's month with classes left. Each booking takes one class off the plan.
- If a family cancels **12 h or more** before the class, the class goes back to their plan. Closer than 12 h, they can't cancel.
- The admin marks each booking "Vino" or "No vino". Both count the class as used.
- Plans are per rider per month and expire on the last day of the month.
- "Pagaré en el club" creates a pending payment. The admin marks it paid (cash or transfer) under **Cobros**.
- "Pagar con tarjeta" only shows a "Disponible próximamente — Mercado Pago" message.

### Reset
Use **Más → Reiniciar demo** (family side) or **Reportes → Reiniciar demo** (admin side) to restore the seed data.

## Live mode (Supabase)

The app runs in one of two modes:

| Route | Supabase keys set? | What it shows |
|---|---|---|
| `/app` | no | the demo (sample data in the browser) |
| `/app` | yes | the real app: email sign-in and shared data |
| `/demo` | either | always the demo, so the club can keep showing it |

### Set up Supabase (one time)

1. **Create the database.** In Vercel, open the project → **Storage** → **Supabase** → create one on the **Free** plan and connect it to this project. Vercel adds `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` automatically. If you set the keys by hand instead, use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never add the `service_role`/secret key; the build refuses to bundle it.
2. **Create the tables.** Open the Supabase dashboard → **SQL Editor**. Paste all of [`supabase/schema.sql`](supabase/schema.sql). **Change the email on its last line** to the management email, then click **Run**. Later database updates are applied automatically: see **Database updates** below.
3. **Allow the login links.** Go to Supabase → **Authentication → URL Configuration**. Set **Site URL** to `https://hipico-riviera-maya.vercel.app` and add `https://hipico-riviera-maya.vercel.app/app` under **Redirect URLs**.
4. **Show the login code in the email.** Go to Supabase → **Authentication → Emails → Magic Link** and add a line such as `Tu código: {{ .Token }}`. On iPhone the installed app can't receive the link (it opens in Safari), so families type the code instead.
5. **Redeploy** in Vercel (Deployments → ⋯ → Redeploy). `/app` now uses Supabase.

Create the tables before redeploying. Otherwise `/app` switches to live mode before its tables exist and shows an error.

**Email sending:** Supabase's built-in email is meant for testing and only sends a few emails per hour. Before inviting families, set up your own email sender (for example Resend or Brevo) under **Authentication → Emails → SMTP Settings**.

### Database updates (automatic)
Every production deploy runs `scripts/migrate.mjs` before building. It connects with the `POSTGRES_URL_NON_POOLING` address that the Vercel ↔ Supabase connection provides, verifying TLS against Supabase's root certificate (`scripts/supabase-ca.crt`). It then applies each new file in [`supabase/migrations/`](supabase/migrations) once, in name order, each in its own transaction, and records it in the `app_migrations` table.

- **Failures:** if an update fails, the deploy fails and the site keeps the previous version.
- **Previews:** preview deploys never touch the database.
- **Writing a new update:** add a file named `YYYYMMDD_description.sql`, safe to run twice (`if not exists`, `create or replace`), without its own `begin`/`commit`.
- **Running by hand:** `POSTGRES_URL_NON_POOLING=… npm run migrate`.

### Day to day
- **Families and riders:** management adds them in the **Familias** tab (one by one, or a CSV list with a preview), with each rider's plan and its start date. A preloaded family signs in with that email and finds its plan already active. A new email gets a short sign-up form instead, and an existing email is always linked, never duplicated. Families can be edited or deactivated; history is kept.
- **Standing plans:** a rider's package renews automatically on the first booking of each month, as a payment pending at the club.
- **More management accounts:** add a row to the `admins` table (Supabase → Table Editor). Emails must be lowercase.
- **Prices:** edit the `prices` table. **Class schedule:** edit the `slots` table (`weekday` 1 = Monday … 6 = Saturday). **Boarded horses:** in the `horses` table, set `type = boarded` and `owner_family_id` to the family.
- **Rules:** booking, cancelling, plans and payments are enforced by the database functions in `schema.sql`, so they hold whatever the browser sends. Each family can only read its own data (Row Level Security).

## Still to come
- **Mercado Pago:** "Pagar con tarjeta" still shows "Disponible próximamente". Card payments need a small server function (Supabase Edge Function) that creates the checkout and marks the payment paid from Mercado Pago's webhook.
