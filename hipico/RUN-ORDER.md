# Hípico: run order (one at a time)

Live: https://hipico-riviera-maya.vercel.app · Specs: `hipico/steps/`, so type **"do STEP-XX"**.

## Now

1. **STEP-13**: landing: subtle hovers, faded horse photos, running text-horse

Check in the browser after each step, then "ok".

## Next

- **In the Supabase dashboard, not a build step:** Gmail as SMTP, raise the email limit (fixes "Demasiados intentos")
- STEP-06: the club's real data (after the 27 Sep meeting)
- STEP-04/05: Resend + the club's domain (waits for DNS access to hipicorivieramaya.com)
- STEP-07: Mercado Pago

## Meeting 27 Sep: ask the owner (Mara Wills)

Prices · schedule · instructors · horses · plan rules · her email for management · bank details (bank, holder, 18-digit CLABE → Cobros → Datos para transferencia) · Mercado Pago account (verified, club or owner) + access for credentials, and what is charged by card · who manages the domain (Wix / Martín Vilavedra) · the logo as an original file · barter terms in writing

## Done

Landing + app live · Supabase login + database rules · management panel (Hoy, Cobros, Familias, Reportes) · STEP-08 families added by management · STEP-09 transfer receipts (bank details still "Por definir") · logos in `public/` · STEP-08B open sign-up, assign existing plans, block / delete (CSV import removed) · STEP-10 Horario: edit classes, cancel a date, instructors and horses, "Todos vinieron" · STEP-11 logo, pictograms, horseshoe counter, booking celebration, empty states · STEP-14 soft coral accent (gold removed) · STEP-12 6-digit code login with resend countdown, "Descargar para iPhone / Android" with install guides

## Rules

- Everything on `main`, pushed after every step
- Supabase: Hípico is in the **"ivanamex's projects"** organization (via Vercel), not "Weber Buric Realty"
- No traces · sans-serif only · Spanish first · no gold, the accent is soft coral (decided 26 Sep)
- No App Store · families sign up themselves with no approval; the club can block or delete (decided 26 Sep)

## Later

app.hipicorivieramaya.com · reminders · Mercado Pago subscriptions · a short video for the hero
