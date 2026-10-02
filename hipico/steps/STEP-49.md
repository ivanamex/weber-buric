# STEP-49: logic fixes before the presentation (audit of 2 Oct)

A full run through `/demo` (Familia + Dirección, 390 and 1440 px) found the issues below. Fix them in the demo **and** in the SQL functions (new migration), so the demo and live behave the same. Report each as fixed.

## Blockers
1. **Receipts that can't be approved:** Cobros only lists charges due this month, so a receipt for a later charge (e.g. a camp deposit due in July) shows in the badge but nowhere on screen. Add a **"Por revisar"** block at the top of Cobros with every payment whose receipt is waiting (`Payments.jsx` already builds a `pending` list; use it).
2. **Saving a family silently changes its plans:** in Familias → Editar the plan start date defaults to today, so any save (even a phone number) moves every rider's plan start to today and marks the plan paid while its charge stays pending (`Families.jsx`, `demo.js` ~494–519, `live.js` ~291–309, SQL `admin_set_plan`). Pre-fill each rider's own start date; only re-assign a plan when the plan or the date actually changed; `admin_set_plan` never sets `paid` when a charge is pending.
3. **Beginners get advanced horses:** `pickHorse` / `pick_horse` take the first free horse. Prefer horses at the rider's level (then the nearest level), never `for_sale` / `retired` horses, same order in demo and SQL.
4. **Wrong money at the start of a month (seed data):** sample payments are dated after today ("3 oct", "4 oct"), last 30 days doesn't match the chart, September shows −$56,400. Seed: no date after today, past months get plan income, `last30` capped at today.

## Major
5. "Todos vinieron" overwrites a "No vino": only change riders still in `booked`.
6. Closing a weekday (Ajustes → Días cerrados) leaves bookings on those days: cancel future bookings on that weekday and return them to the plans, as closed dates do.
7. "Cerrar estas fechas" defaults to today and acts in one tap: empty dates + a confirmation ("Se cancelarán N clases de M familias").
8. Deleted or blocked families still appear in "Quién debe", count in Planes activos and keep their places: filter them out everywhere (reuse `liveFamily`); deleting cancels their future bookings.
9. An earlier plan start creates a second, overlapping plan: find the plan by the period that covers the date, not by month (demo + `admin_set_plan`).
10. "Sin plan para octubre · Elegir plan" shows for a date after the renewal, contradicting "Se descuenta de tu plan de noviembre": show only the next-period line.
11. Occupancy counts Mon–Sat while the club is closed Monday and open Sunday: count the 7 days and skip closed days.
12. Demo transfer screen says "Por definir": put sample bank details in the demo seed only.
13. A downgrade is allowed while an upgrade is still unpaid: refuse it with the existing `pendingExists` message.
14. A horse can be double-booked (a ride + a class, or overlapping durations): check rentals and real overlap by duration.
15. Bulk "Nueva clase" can create two classes at the same time, and one rider can be booked twice at the same time: warn on instructor/arena clashes; block a rider's second booking at an overlapping time.

## Minor
16. Plurals: "1 días", "1 pagos", "te quedan 1", "1 clases": add singular keys (ES + EN).
17. WhatsApp reminder text: write the concept as a sentence ("el pago del plan de 8 clases de Regina: $3,900").
18. Demo reminders must follow the same rules as `reminders_due()`.
19. Confirmations before "Cancelar" (Próximas clases) and "Bloquear".
20. Clases shows the class's real length, not always "60 min".
21. A family is notified when its class time changes (as with cancellations).
22. Reportes: "Exportar a Excel · Próximamente" → the existing CSV export.
23. Only one toast at a time on sign-in.
24. Seed: salaries on the 15th/last day, the sample holiday not on a Monday, Hoy attendance only for classes that have started.

## Check
Re-run the same flows in `/demo?reset=1` and list each item as fixed, with a screenshot for 1–4.
