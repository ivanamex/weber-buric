# STEP-19: the owner's panel — overview, date-to-date billing, payroll, profitability, horses

## 1. Billing is date to date, not calendar months
- A plan runs from its **start date to the same day next month** (e.g. 15 Sep → 14 Oct), then renews on that day. Check the current logic and fix it if it assumes calendar months.
- Everything below uses these real periods: renewals, overdue, income.

## 2. "Resumen" — the first screen for management
- **Activos:** families, riders, active plans (by type: 4/8/12), boarded horses.
- **Dinero:** collected today, collected this month (by calendar month for accounting) and the last 30 days; expected vs collected.
- **Quién debe:** overdue plans and pensiones, with days late and amount. One tap to WhatsApp the family a friendly reminder.
- **Por renovar:** plans renewing in the next 7 days.
- **Ocupación:** this week's classes, filled vs capacity.
- A simple chart of daily income over the last 30 days.

## 3. Nómina (payroll)
- Employees: name, role (instructor, groom, office…), salary, pay frequency (**quincenal** or **mensual**), next pay date, active/inactive. Optional: working days.
- "Pagar" marks a salary paid (date, amount, method), with a payment history per employee.
- The panel shows upcoming salaries for the next 15 days.
- Only management can see this module.

## 4. Rentabilidad (profitability)
- **Gastos:** simple expense entries (date, category: feed, vet, farrier, rent, services, other, amount, note), with categories editable.
- Monthly view: income by source (plans, pensión, single classes, events, horse sales) − payroll − expenses = **resultado del mes**, plus a 6-month trend.

## 5. Caballos: status per horse
- Each horse has a status: **Escuela · Pensión · En venta · Retirado**. Boarded horses have an owner family.
- **En venta:** price, age, breed, level, photos, and a short description. Later, the new website shows these in a sales section.

## 6. Modules on/off
- In settings, management can turn **Nómina**, **Rentabilidad** and **Caballos en venta** on or off. All on in `/demo`, and off by default in the live app until Mara decides.
