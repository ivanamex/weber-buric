# Hípico Riviera Maya — Phase 1 demo

A web app (PWA) for **Hípico Riviera Maya** (Paamul, Quintana Roo). It covers class bookings, monthly plans, horse boarding (pensión), rentals, events, and a management panel. The UI is bilingual (ES by default, EN available).

Phase 1 runs entirely in the browser. Demo data is saved in `localStorage`, there is no backend, and it needs **zero environment variables**.

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
| `/app` | Demo login ("Entrar como familia" / "Entrar como dirección"). This is also the PWA start URL. |
| `/app/familia` (`/reservar`, `/plan`, `/mas`) | Family app: Inicio, Reservar, Mi plan, Más |
| `/app/direccion` (`/cobros`, `/reportes`) | Admin app: Hoy, Cobros, Reportes |

## Where things live

```
src/
  data/prices.js     ← ALL prices (placeholders, "*precios de ejemplo"). Edit here.
  data/seed.js       ← demo data (instructors, horses, slots, families, riders…)
  data/store.js      ← the ONLY data-access module: queries + actions + business rules
  i18n/es.json, en.json, I18nProvider.jsx   ← dictionaries + tiny t() hook
  lib/time.js        ← America/Cancun date helpers
  pages/Landing.jsx  ← public homepage
  app/…              ← login, shell, family & admin screens
```

### Business rules (enforced in `store.js`)
- A booking needs an open spot, the rider's level must match the class level, and the rider needs a plan for that class's month with classes left. Each booking takes one class off the plan.
- If a family cancels **12 h or more** before the class, the class goes back to their plan. Closer than 12 h, they can't cancel.
- The admin marks each booking "Vino" or "No vino". Both count the class as used.
- Plans are per rider per month and expire on the last day of the month.
- "Pagaré en el club" creates a pending payment. The admin marks it paid (cash or transfer) under **Cobros**.
- "Pagar con tarjeta" only shows a "Disponible próximamente — Mercado Pago" message.

### Reset
Use **Más → Reiniciar demo** (family side) or **Reportes → Reiniciar demo** (admin side) to restore the seed data.

## Phase 2 notes
- **Supabase:** replace the internals of `src/data/store.js` (`load`/`commit` and each action) with Supabase queries. Keep the exported function names so the screens don't change. The actions already return `{ ok, code }`, which maps cleanly onto async results.
- **Mercado Pago:** hook it into the `payCard` handlers in `app/family/Plan.jsx` (Checkout Pro preference → redirect). Then mark payments paid from a webhook.
