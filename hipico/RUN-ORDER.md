# Hípico: run order (one at a time)

Live: https://hipico-riviera-maya.vercel.app · Specs: `hipico/steps/`, so type **"do STEP-XX"**.

## Now

Nothing queued. Add the next step here.

Check in the browser after each step, then "ok".

## Next

- **Device test:** `hipico/TEST-INSTALL.md` on a real iPhone and a real Android, before inviting families
- STEP-06: the club's real data (after the 27 Sep meeting)
- STEP-04/05: Resend + the club's domain (waits for DNS access to hipicorivieramaya.com)
- STEP-07: Mercado Pago

## Meeting 27 Sep: ask the owner (Mara Wills)

Prices · schedule · instructors · horses · plan rules · her email for management · bank details (bank, holder, 18-digit CLABE → Cobros → Datos para transferencia) · Mercado Pago account (verified, club or owner) + access for credentials, and what is charged by card · who manages the domain (Wix / Martín Vilavedra) · the logo as an original file · barter terms in writing · payroll: does she want it, quincenal or mensual, does she track working days

## Done

STEP-26 iPhone layout: tab bar pinned to the very bottom, dates in the app's language with one field per row on phones, demo bar with its own space under the header, every form checked at 360 / 390 px · STEP-25 Horario in bulk: many days and times in one form with a preview, Desde / Hasta or no end; closed days (Mondays + dates) in Ajustes; edit one / following / all; cancel a range; copy a week; week grid on desktop · STEP-24 clear view ⇄ edit: one coral Guardar + Cancelar per form, "¿Descartar cambios?" before losing edits, toasts; horse profile as a finished page with per-section Editar, Salud tiles open a sheet (suggested next date), "Ver como lo ve el dueño"; greeting pictogram instead of the emoji · STEP-23 "Confirmar clase" for plan classes (tab "Clases"; "Reservar" only for paid single / trial / extra classes) · Gmail SMTP + 100 emails/hour + Spanish login emails with the 6-digit code (Magic Link and Confirm signup), done 27 Sep · STEP-22 hero without the letter-horse, tighter (the galloping horse at the end stays) · STEP-21 demo never gets stuck (always opens on the picker, Familia ⇄ Dirección bar, own storage, /demo?reset=1) · STEP-20 horse profile (basics, photos, ración diaria, health with due dates; owners see their own horse in Más → Mi caballo) · STEP-19 owner panel: plans billed date to date, Resumen first screen (who owes + WhatsApp, renewals, income chart), Nómina, Rentabilidad, horse status + sales, modules on/off (off in live until Mara decides) · STEP-18 QR to share the app (Familias → Compartir la app: PNG, printable poster ES/EN, copy, WhatsApp; small QR on the desktop landing) · STEP-17 clase muestra / suelta / adicional (quiet option under the plans; prices in Cobros → Precios de clases; tags in Hoy; split in Reportes) · STEP-16 plan activo, change plan, payment history, password nudge · Landing + app live · Supabase login + database rules · management panel (Hoy, Cobros, Familias, Reportes) · STEP-08 families added by management · STEP-09 transfer receipts (bank details still "Por definir") · logos in `public/` · STEP-08B open sign-up, assign existing plans, block / delete (CSV import removed) · STEP-10 Horario: edit classes, cancel a date, instructors and horses, "Todos vinieron" · STEP-11 logo, pictograms, horseshoe counter, booking celebration, empty states · STEP-14 soft coral accent (gold removed) · STEP-12 6-digit code login with resend countdown, "Descargar para iPhone / Android" with install guides, stay signed in per device · STEP-13 landing: phone with the live app, letter-horse (hero glow, galloping band), faded photos, subtle hovers · one-tap "Continuar como…" after Salir, optional password · STEP-15 coral glass buttons, nothing wider than the screen on phones

## Rules

- Everything on `main`, pushed after every step
- Supabase: Hípico is in the **"ivanamex's projects"** organization (via Vercel), not "Weber Buric Realty"
- No traces · sans-serif only · Spanish first · no gold, the accent is soft coral (decided 26 Sep)
- No App Store · families sign up themselves with no approval; the club can block or delete (decided 26 Sep)

## Later

app.hipicorivieramaya.com · reminders · Mercado Pago subscriptions · a short video for the hero
