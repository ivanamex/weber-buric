# Hípico Riviera Maya: project status (27 Sep 2026)

## What it is
An installable web app (PWA) for an equestrian club in Paamul, Quintana Roo, Mexico. It covers class bookings, monthly plans, horse boarding (pensión), rentals, events, payments and a management panel. It's in Spanish by default, with English as the second language.

- **Live:** https://hipico-riviera-maya.vercel.app. The landing page is `/`, the real app is `/app`, and the demo is `/demo`.
- **Code:** repo `ivanamex/weber-buric`, folder `hipico/`. Vercel project **hipico** deploys from `main`.
- **Database:** Supabase project **supabase-cerise-harbor**, in the "ivanamex's projects" organization. The other organization, "Weber Buric Realty", must never be touched.
- **Stack:** React + Vite in plain JavaScript, with Supabase for sign-in, database and file storage.
- **Database changes:** they're files in `supabase/migrations/` and apply automatically on every production deploy. Nobody pastes SQL by hand.

## How we work
- Each change is a spec in `hipico/steps/STEP-XX.md`, and `hipico/RUN-ORDER.md` says what's next.
- The owner says "do STEP-XX". The assistant builds it, tests it in the demo and against a local copy of the database, pushes to `main`, checks the Vercel deploy, and waits for "ok".
- **Rules for every step:**
  - families only see their own data; management sees everything;
  - every text exists in both Spanish and English;
  - colours are green `#2E5339`, coral `#F4876A` (buttons `#E6735A`) and cream `#F6F2E9`, with Outfit + Inter fonts; no gold, no emoji;
  - nothing that ships mentions tools, models or step numbers;
  - every feature is mirrored in `/demo`;
  - no flow gets more taps than it has now.
- `hipico/CLAUDE.md` has the full technical notes.

## Recently finished
- **STEP-24, clear view and edit:**
  - every management form has one coral **Guardar** button with Cancelar as a link, and asks "¿Descartar cambios?" before losing edits;
  - the horse profile opens as a finished page, with a separate Editar for each section;
  - the health tiles (vaccines, deworming, farrier, vet) open a quick form with the next date suggested;
  - boarded horses have "Ver como lo ve el dueño";
  - the greeting uses a small time-of-day drawing instead of the 👋 emoji.
- **STEP-25, Horario in bulk:**
  - create many classes at once (several days × several times, a start date and an end date or "no end", with a preview);
  - edit "only this class", "this and the following" or "the whole series";
  - cancel a date range, and copy a week;
  - a week grid on computers;
  - closed days: Mondays by default, plus specific dates, which also cancel booked classes.
- **STEP-26, iPhone layout:**
  - the tab bar is pinned to the bottom;
  - dates show in the app's language, with one field per row on phones;
  - the demo bar sits under the header;
  - every screen was checked at 360 and 390px. The owner confirmed it's fine.
- **STEP-27, Por cobrar:**
  - every charge has a due date: a plan on its start date, pensión on a set day of the month, a class or ride on its day, an event on its first day;
  - Cobros opens with **Vencido · Vence hoy · Por vencer (5 días) · Más adelante este mes**, with totals, filters, and WhatsApp and "Marcar pagado" on each line;
  - **Flujo por mes** shows this month and the next two: expected, collected, still to collect and overdue;
  - charges that don't exist yet show as "Esperado";
  - a daily job at 8:00 (Cancún time) creates the charges that are due and sends reminders: 5 days before, on the day, 3 days after, then weekly until paid;
  - families see a "Pagos por vencer" card on the app's home screen;
  - Ajustes has reminders on/off, the pensión's day of the month, a note added to every reminder, and the last run's status.

## Pending setup (owner action)
- **Reminder emails:** in Vercel → hipico → Settings → Environment Variables, add `SMTP_USER` (the Gmail address) and `SMTP_PASS` (a Gmail app password), then redeploy. Until then, reminders only show inside the app.
- **Heads-up for the first morning run:** it will create this month's pensión charge for every boarded horse that doesn't have one. Anything already paid outside the app should be marked "Pagado" in Cobros.
- **Monday closed by default:** the live sample schedule has Monday classes, which families can no longer book. Bookings already made for a Monday weren't cancelled. If the club opens on Mondays, untick L in Ajustes → Días cerrados.

## Next in the run order
1. Reminder emails (the setup above).
2. A device test on a real iPhone and Android (`TEST-INSTALL.md`) before inviting families.
3. STEP-06: load the club's real data (prices, schedule, instructors, horses, the owner's management email, bank details, logo file).
4. STEP-04/05: Resend plus the club's own domain (waiting on DNS access to hipicorivieramaya.com).
5. STEP-07: Mercado Pago card payments ("Pagar con tarjeta" still shows "Próximamente").

## Waiting on the club
Bank details (bank, account holder, 18-digit CLABE), real prices, schedule, instructors and horses, the owner's email for management, and the logo as a vector file.
