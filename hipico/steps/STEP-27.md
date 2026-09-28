# STEP-27: Por cobrar (what's owed, what's coming) + payment reminders

The owner needs one place to see the club's cash flow: what is overdue, what is due today, what is about to fall due, and what to expect each month. Families get reminders before and after each due date.

## 1. Every charge has a due date
- **Plan:** due on the day the period starts (its renewal date, e.g. 15 Oct).
- **Pensión:** due on the 1st of each month (the day can be changed in Ajustes).
- **Clase muestra / suelta / adicional, horse rental:** due on the day of the class or ride.
- **Events / camp:** due on the event's start date.
- Charges that don't exist yet are **projected** so the month can be planned: standing plans renew on their date, boarded horses pay every month. They show as "Esperado", and turn into real charges when they come due.

## 2. "Por cobrar" (management)
One screen, reached from the Cobros tab (no extra taps: it becomes the first thing Cobros shows):
- Four groups with totals, in this order: **Vencido** (with days late) · **Vence hoy** · **Por vencer** (next 5 days) · **Más adelante este mes**.
- Each line: family, concept (plan / pensión / clase / renta / evento), amount, due date, and the actions that exist today (Marcar pagado, WhatsApp to the family).
- **Flujo por mes:** this month and the next two: expected, collected, still pending, overdue. Tap a month to see its lines.
- Filters by concept: Todos · Planes · Pensión · Clases · Rentas · Eventos.

## 3. Reminders to families
For every unpaid charge, the family is reminded:
- **5 days before** the due date: "Tu pensión de Relámpago vence el 1 nov ($9,500)."
- **On the due date:** "Hoy vence…"
- **3 days after**, if still unpaid: "Tu pago está vencido…" (then once a week until paid).
- Each reminder shows as a card on the family's Inicio with **Pagar por transferencia**, and is also sent by the channel chosen below.
- Management sees in each line which reminders went out and when.
- The owner can turn reminders on/off in Ajustes, set the pensión's day of the month, and add a note to every reminder.

## 4. Channel
- In the app (always) plus **email**, sent every morning at 8:00 by a scheduled job. WhatsApp stays as a one-tap button on each line for the owner.

Mirror it in `/demo`.
