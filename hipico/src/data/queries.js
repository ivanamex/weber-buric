// Pure read-only calculations over the app state. Both the demo and the live (Supabase) data
// produce the same state shape, so every screen works unchanged in either mode.
import { todayKey, addDays, weekdayOf, weekStart, monthKeyOf, currentMonthKey, monthEnd, hoursUntil, toInstant, addMonthsFrom, daysBetween, nextMonthKey, periodOf } from '../lib/time.js'
import { planPrice, BOARDING_MONTHLY } from './prices.js'

export const CANCEL_WINDOW_HOURS = 12
export const LEVELS = ['beginner', 'intermediate', 'advanced']

export const byId = (list, id) => list.find((x) => x.id === id)
export const isActiveBooking = (b) => b.status !== 'cancelled'

// Plans run date to date (15 Sep → 14 Oct). Older rows without dates cover their calendar month.
export const planStart = (p) => p.startsOn || `${p.month}-01`
export const planEnd = (p) => p.endsOn || monthEnd(p.month)
/** The rider's plan that covers a date ('YYYY-MM-DD', default today); a 'YYYY-MM' key finds the period that starts in that month. */
export function getPlan(s, riderId, at = todayKey()) {
  if (at.length === 7) return s.plans.find((p) => p.riderId === riderId && p.month === at) || null
  return s.plans.filter((p) => p.riderId === riderId && planStart(p) <= at && planEnd(p) >= at)
    .sort((a, b) => planStart(b).localeCompare(planStart(a)))[0] || null
}
export const planRemaining = (plan) => (plan ? Math.max(plan.total - plan.used, 0) : 0)
export const planExpiry = (plan) => planEnd(plan)
/** The day the plan renews (the next period starts). */
export const planRenewal = (plan) => addDays(planEnd(plan), 1)

/** Riders of a family. Removed (inactive) riders are hidden unless asked for (management history). */
export function familyRiders(s, familyId, { includeInactive = false } = {}) {
  return s.riders.filter((r) => r.familyId === familyId && (includeInactive || r.active !== false))
}
export const isActiveFamily = (f) => f.active !== false // false = blocked by the club
export const isDeletedFamily = (f) => Boolean(f.deletedAt)

// ── Club calendar: closed days, classes valid for a date range, one-date edits ──
export const DEFAULT_CLOSED_WEEKDAYS = [1] // Monday
export const closedWeekdays = (s) => s.settings?.closedWeekdays ?? DEFAULT_CLOSED_WEEKDAYS
/** The closed date range covering that day, if any. */
export const closedDateOn = (s, date) => (s.closedDates || []).find((c) => c.startsOn <= date && date <= c.endsOn) || null
export const isClosed = (s, date) => closedWeekdays(s).includes(weekdayOf(date)) || Boolean(closedDateOn(s, date))
/** Does this weekly class happen on that date (right weekday, inside its validity)? */
export const slotRuns = (slot, date) =>
  slot.weekday === weekdayOf(date) && (!slot.startsOn || slot.startsOn <= date) && (!slot.endsOn || date <= slot.endsOn)
/** A class for one date only (made by editing "Solo esta clase" or copied for one day). */
export const isOneOff = (slot) => Boolean(slot.startsOn) && slot.startsOn === slot.endsOn
/** The date was edited on its own: the weekly class gives way to its one-off copy. */
export const isReplaced = (s, slotId, date) => (s.cancellations || []).some((c) => c.slotId === slotId && c.date === date && c.replacedBy)
/** Classes that happen on a date, by time. Inactive ones only when asked for (management). */
export function slotsOn(s, date, { includeOff = false } = {}) {
  return s.slots
    .filter((sl) => slotRuns(sl, date) && (includeOff || sl.active !== false) && !isReplaced(s, sl.id, date))
    .sort((a, b) => a.time.localeCompare(b.time))
}

/** Slot occurrences for a given date, enriched with counts and state for a rider. Nothing on closed days unless asked for. */
export function occurrencesFor(s, date, riderId = null, { includeClosed = false } = {}) {
  const rider = riderId ? byId(s.riders, riderId) : null
  if (!includeClosed && isClosed(s, date)) return []
  return slotsOn(s, date)
    .map((slot) => {
      const bookings = s.bookings.filter((b) => b.slotId === slot.id && b.date === date && isActiveBooking(b))
      // Live mode: families only see their own bookings, so seat counts come from the server.
      const taken = Math.max(bookings.length, s.slotCounts?.[`${slot.id}|${date}`] ?? 0)
      const spotsLeft = Math.max(slot.capacity - taken, 0)
      const past = hoursUntil(date, slot.time) <= 0
      const mine = rider ? bookings.find((b) => b.riderId === rider.id) : null
      const levelOk = rider ? rider.level === slot.level : true
      const cancellation = (s.cancellations || []).find((c) => c.slotId === slot.id && c.date === date && !c.replacedBy) || null
      return { slot, date, bookings, taken, spotsLeft, past, cancellation, mine, levelOk, instructor: byId(s.instructors, slot.instructorId) }
    })
}

export function upcomingBookings(s, riderIds) {
  return s.bookings
    .filter((b) => riderIds.includes(b.riderId) && b.status === 'booked')
    .map((b) => ({ ...b, slot: byId(s.slots, b.slotId) }))
    .filter((b) => hoursUntil(b.date, b.slot.time) > 0)
    .sort((a, b) => toInstant(a.date, a.slot.time) - toInstant(b.date, b.slot.time))
}

export const canCancel = (booking, slot) =>
  booking.status === 'booked' && hoursUntil(booking.date, slot.time) >= CANCEL_WINDOW_HOURS

export function boardingStatus(s, familyId, month = currentMonthKey()) {
  const horses = s.horses.filter((h) => h.type === 'boarded' && h.ownerFamilyId === familyId)
  return horses.map((horse) => {
    const pay = s.payments.find((p) => p.service === 'boarding' && p.meta?.horseId === horse.id && p.meta?.month === month)
    return { horse, month, payment: pay || null, status: pay ? pay.status : 'due' }
  })
}

export function pendingPayments(s) {
  return s.payments.filter((p) => p.status === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
const paidThisMonth = (s) => {
  const m = currentMonthKey()
  return s.payments.filter((p) => p.status === 'paid' && p.paidAt && monthKeyOf(dateKeyFromIso(p.paidAt)) === m)
}
const dateKeyFromIso = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun' }).format(new Date(iso))

// Income types in Reportes: plans, trial classes and single/extra classes apart, then the other services.
export const SERVICES = ['plan', 'trial', 'classes', 'boarding', 'camp', 'rental', 'events']
const incomeType = (p) => (p.service === 'class' ? (p.meta?.kind === 'trial' ? 'trial' : 'classes') : p.service)
export function incomeByService(s) {
  const totals = Object.fromEntries(SERVICES.map((k) => [k, 0]))
  for (const p of paidThisMonth(s)) totals[incomeType(p)] = (totals[incomeType(p)] || 0) + p.amount
  return totals
}
/** The rider already had (or has booked) their trial class. */
/** The trial class already happened (for the gentle "¿Te gustó? Elige tu plan"). */
export const trialDone = (s, riderId) => s.bookings.some((b) => b.riderId === riderId && b.kind === 'trial' &&
  (b.status === 'attended' || (b.status === 'booked' && b.date < todayKey())))
export const hadTrial = (s, riderId) => s.bookings.some((b) => b.riderId === riderId && b.kind === 'trial' && b.status !== 'cancelled')
export const monthCollected = (s) => paidThisMonth(s).reduce((sum, p) => sum + p.amount, 0)
export const recentPaid = (s, limit = 5) =>
  paidThisMonth(s).sort((a, b) => b.paidAt.localeCompare(a.paidAt)).slice(0, limit)

/** Occupancy for the current Mon–Sat week. */
export function weekOccupancy(s, anchor = todayKey()) {
  const start = weekStart(anchor)
  let seats = 0, taken = 0
  const byLevel = Object.fromEntries(LEVELS.map((l) => [l, { seats: 0, taken: 0 }]))
  for (let i = 0; i < 6; i++) {
    for (const o of occurrencesFor(s, addDays(start, i))) {
      seats += o.slot.capacity
      taken += o.taken
      byLevel[o.slot.level].seats += o.slot.capacity
      byLevel[o.slot.level].taken += o.taken
    }
  }
  const pct = (t, c) => (c ? Math.round((t / c) * 100) : 0)
  return {
    start, seats, taken, pct: pct(taken, seats),
    byLevel: Object.fromEntries(LEVELS.map((l) => [l, pct(byLevel[l].taken, byLevel[l].seats)])),
  }
}
export const activePlansCount = (s) => {
  const today = todayKey()
  return s.plans.filter((p) => planStart(p) <= today && planEnd(p) >= today).length
}


/** Registrations for an event (live families only see their own rows, so use the server count). */
export const campTaken = (s, eventId) =>
  Math.max(s.campRegistrations.filter((r) => r.eventId === eventId).length, s.campCounts?.[eventId] ?? 0)

/** Club-cancelled bookings from today on (the family sees "Clase cancelada"). */
export function clubCancelledBookings(s, riderIds) {
  const today = todayKey()
  return s.bookings
    .filter((b) => riderIds.includes(b.riderId) && b.cancelledByClub && b.date >= today)
    .map((b) => ({ ...b, slot: byId(s.slots, b.slotId) }))
    .filter((b) => b.slot)
    .sort((a, b) => (a.date + a.slot.time).localeCompare(b.date + b.slot.time))
}

// ── Plans: status, pending changes, history ──
const planPaymentsFor = (s, riderId, month) =>
  s.payments.filter((p) => p.service === 'plan' && p.status === 'pending' && p.meta?.riderId === riderId && p.meta?.month === month)
/** 'paid' | 'review' (transfer receipt waiting) | 'pending'. */
export function planStatus(s, plan) {
  if (!plan) return null
  if (plan.paid) return 'paid'
  return planPaymentsFor(s, plan.riderId, plan.month).some((p) => p.meta?.kind !== 'upgrade' && p.receiptStatus === 'review') ? 'review' : 'pending'
}
/** An upgrade whose difference is not paid yet (the extra classes arrive on approval). */
export const pendingUpgrade = (s, riderId) => {
  const plan = getPlan(s, riderId)
  return plan ? planPaymentsFor(s, riderId, plan.month).find((p) => p.meta?.kind === 'upgrade') || null : null
}
export const planChangesFor = (s, familyId) =>
  (s.planChanges || []).filter((c) => c.familyId === familyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
/** A family's payments of the last 12 months, newest first. */
export function paymentHistory(s, familyId) {
  const since = Date.now() - 365 * 864e5
  const when = (p) => p.paidAt || p.createdAt
  return s.payments
    .filter((p) => p.familyId === familyId && new Date(when(p)).getTime() >= since)
    .sort((a, b) => when(b).localeCompare(when(a)))
}

// ── Owner's panel ──
export const HORSE_STATUSES = ['school', 'boarded', 'for_sale', 'retired']
export const horseStatus = (h) => h.status || (h.type === 'boarded' ? 'boarded' : h.active === false ? 'retired' : 'school')
export const EMPLOYEE_ROLES = ['instructor', 'groom', 'office', 'other']
export const moduleOn = (s, key) => Boolean(s.settings?.[key])

/** Next pay date after d: quincenal = the 15th and the month's last day; mensual = same day next month. Same as next_pay_after(). */
export function nextPayAfter(d, frequency) {
  if (frequency === 'mensual') return addMonthsFrom(d, 1)
  const day = Number(d.slice(8, 10))
  const end = monthEnd(d.slice(0, 7))
  if (day < 15) return `${d.slice(0, 8)}15`
  if (d < end) return end
  return `${nextMonthKeyOf(d)}-15`
}
const nextMonthKeyOf = (d) => monthKeyOf(addDays(monthEnd(d.slice(0, 7)), 1))

/** Salaries due in the next `days` days (and overdue ones). */
export const upcomingSalaries = (s, days = 15) => {
  const until = addDays(todayKey(), days)
  return (s.employees || []).filter((e) => e.active !== false && e.nextPayDate <= until).sort((a, b) => a.nextPayDate.localeCompare(b.nextPayDate))
}

/** Income of a calendar month by source, for Rentabilidad. */
export const INCOME_SOURCES = ['plan', 'boarding', 'classes', 'events', 'rental', 'horses']
const sourceOf = (p) => (p.service === 'class' ? 'classes' : p.service === 'camp' ? 'events' : p.service)
export function monthResult(s, month) {
  const income = Object.fromEntries(INCOME_SOURCES.map((k) => [k, 0]))
  for (const p of s.payments) {
    if (p.status === 'paid' && p.paidAt && monthKeyOf(dateKeyFromIso(p.paidAt)) === month) income[sourceOf(p)] = (income[sourceOf(p)] || 0) + p.amount
  }
  for (const h of s.horseSales || []) if (monthKeyOf(h.soldOn) === month) income.horses += h.price
  const payroll = (s.salaryPayments || []).filter((x) => monthKeyOf(x.paidOn) === month).reduce((sum, x) => sum + x.amount, 0)
  const byCategory = {}
  for (const x of s.expenses || []) if (monthKeyOf(x.spentOn) === month) byCategory[x.categoryId || 'none'] = (byCategory[x.categoryId || 'none'] || 0) + x.amount
  const expenses = Object.values(byCategory).reduce((a, b) => a + b, 0)
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0)
  return { income, totalIncome, payroll, byCategory, expenses, result: totalIncome - payroll - expenses }
}

/** Money for the Resumen: today, this calendar month, the last 30 days, and a daily series. */
export function moneySummary(s) {
  const today = todayKey()
  const from30 = addDays(today, -29)
  const paid = s.payments.filter((p) => p.status === 'paid' && p.paidAt).map((p) => ({ ...p, day: dateKeyFromIso(p.paidAt) }))
  const sales = (s.horseSales || []).map((h) => ({ amount: h.price, day: h.soldOn }))
  const all = [...paid, ...sales]
  const sum = (list) => list.reduce((t, p) => t + p.amount, 0)
  const month = currentMonthKey()
  const daily = Array.from({ length: 30 }, (_, i) => {
    const day = addDays(from30, i)
    return { day, amount: sum(all.filter((p) => p.day === day)) }
  })
  // Expected this month: every charge created this month (paid or not) vs what's been collected of it.
  const monthCharges = s.payments.filter((p) => monthKeyOf(dateKeyFromIso(p.createdAt)) === month)
  return {
    today: sum(all.filter((p) => p.day === today)),
    month: sum(all.filter((p) => monthKeyOf(p.day) === month)),
    last30: sum(all.filter((p) => p.day >= from30)),
    expected: sum(monthCharges),
    expectedPaid: sum(monthCharges.filter((p) => p.status === 'paid')),
    daily,
  }
}

/** Plans and pensiones not paid after their date, oldest first. */
export function overdue(s) {
  const today = todayKey()
  return s.payments
    .filter((p) => p.status === 'pending' && (p.service === 'plan' || p.service === 'boarding'))
    .map((p) => ({ payment: p, due: dueOf(s, p) }))
    .filter((x) => x.due < today)
    .map((x) => ({ ...x, days: daysBetween(x.due, today), family: s.families.find((f) => f.id === x.payment.familyId) }))
    .sort((a, b) => b.days - a.days)
}

/** Standing plans that renew in the next `days` days. */
export function renewingSoon(s, days = 7) {
  const today = todayKey()
  const until = addDays(today, days)
  return s.riders
    .filter((r) => r.active !== false && r.planClasses)
    .map((r) => ({ rider: r, plan: getPlan(s, r.id, today) }))
    .filter((x) => x.plan && planEnd(x.plan) >= today && planEnd(x.plan) < until)
    .map((x) => ({ ...x, renews: addDays(planEnd(x.plan), 1), family: s.families.find((f) => f.id === x.rider.familyId) }))
    .sort((a, b) => a.renews.localeCompare(b.renews))
}

/** Active families, riders, plans by size and boarded horses. */
export function activeCounts(s) {
  const today = todayKey()
  const families = s.families.filter((f) => f.active !== false && !f.deletedAt)
  const famIds = new Set(families.map((f) => f.id))
  const riders = s.riders.filter((r) => r.active !== false && famIds.has(r.familyId))
  const plans = s.plans.filter((p) => planStart(p) <= today && planEnd(p) >= today)
  const byType = {}
  for (const p of plans) byType[p.total] = (byType[p.total] || 0) + 1
  return {
    families: families.length, riders: riders.length, plans: plans.length, byType,
    boarded: s.horses.filter((h) => horseStatus(h) === 'boarded').length,
  }
}

// ── Horse profile ──
export const HORSE_LEVELS = ['beginner', 'intermediate', 'advanced', 'competition']
export const HORSE_SEXES = ['mare', 'gelding', 'stallion']
export const HEALTH_KINDS = ['vaccine', 'deworming', 'farrier', 'vet']
/** Age from the birth year when known, else the age typed in. */
export const horseAge = (h) => (h.birthYear ? Number(todayKey().slice(0, 4)) - h.birthYear : h.age ?? null)
export const careOf = (s, horseId) => (s.horseCare || []).find((c) => c.horseId === horseId) || null
export const healthOf = (s, horseId) =>
  (s.horseHealth || []).filter((x) => x.horseId === horseId).sort((a, b) => b.doneOn.localeCompare(a.doneOn))
/** Latest record of each kind for a horse, with its next due date. */
export function lastByKind(s, horseId) {
  const out = {}
  for (const x of healthOf(s, horseId)) if (!out[x.kind]) out[x.kind] = x
  return out
}
/** Vaccines, deworming and farrier due in the next `days` days (or overdue), for horses still at the club. */
export function healthDueSoon(s, days = 14) {
  const until = addDays(todayKey(), days)
  const out = []
  for (const h of s.horses) {
    if (['sold', 'retired'].includes(horseStatus(h))) continue
    const last = lastByKind(s, h.id)
    for (const kind of ['vaccine', 'deworming', 'farrier']) {
      const x = last[kind]
      if (x?.nextDue && x.nextDue <= until) out.push({ horse: h, kind, due: x.nextDue })
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due))
}

// ── Por cobrar: due dates, what's owed and what's coming ──
export const DUE_SOON_DAYS = 5
export const boardingDueDay = (s) => Math.min(Math.max(Number(s.settings?.boardingDueDay) || 1, 1), 28)

/** When a charge falls due (same rule as payment_due() in the database). */
export function dueOf(s, p) {
  if (p.dueOn) return String(p.dueOn).slice(0, 10)
  const m = p.meta || {}
  let due = null
  if (p.service === 'plan' && m.kind !== 'upgrade') {
    due = m.start || s.plans.find((pl) => pl.riderId === m.riderId && pl.month === m.month)?.startsOn || (m.month ? `${m.month}-01` : null)
  } else if (p.service === 'boarding' && m.month) due = `${m.month}-${String(boardingDueDay(s)).padStart(2, '0')}`
  else if (p.service === 'class') due = m.date
  else if (p.service === 'rental') due = (s.rentals || []).find((r) => r.id === m.rentalId)?.date
  else if (p.service === 'camp' || p.service === 'events') due = (s.events || []).find((e) => e.id === m.eventId)?.startDate
  return due || dateKeyFromIso(p.createdAt)
}

/** overdue · today · soon (next 5 days) · later */
export function dueState(due, today = todayKey()) {
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  if (due <= addDays(today, DUE_SOON_DAYS)) return 'soon'
  return 'later'
}

const liveFamily = (s, id) => { const f = byId(s.families, id); return f && f.active !== false && !f.deletedAt ? f : null }

/**
 * Charges that don't exist yet but will: the next periods of standing plans that continue, and each month's pensión.
 * They become real charges 5 days before they fall due.
 */
export function projectedCharges(s, from, to) {
  const out = []
  const today = todayKey()
  for (const r of s.riders) {
    if (r.active === false || !r.planClasses || !liveFamily(s, r.familyId) || !planPrice(r.planClasses)) continue
    const current = getPlan(s, r.id, today)
    if (!current) continue
    const anchor = r.planStart || planStart(current)
    let start = planRenewal(current)
    for (let guard = 0; start <= to && guard < 24; guard++) {
      const exists = s.plans.some((pl) => pl.riderId === r.id && planStart(pl) === start) ||
        s.payments.some((p) => p.service === 'plan' && p.meta?.riderId === r.id && p.meta?.start === start)
      if (start >= from && !exists) {
        out.push({ id: `exp-plan-${r.id}-${start}`, projected: true, service: 'plan', familyId: r.familyId, amount: planPrice(r.planClasses),
          due: start, meta: { riderId: r.id, classes: r.planClasses, start } })
      }
      start = addDays(periodOf(anchor, start).endsOn, 1)
    }
  }
  const day = String(boardingDueDay(s)).padStart(2, '0')
  for (const h of s.horses) {
    if (horseStatus(h) !== 'boarded' || !liveFamily(s, h.ownerFamilyId) || !BOARDING_MONTHLY) continue
    for (let m = monthKeyOf(from); m <= monthKeyOf(to); m = nextMonthKey(m)) {
      const due = `${m}-${day}`
      if (due < from || due > to) continue
      if (s.payments.some((p) => p.service === 'boarding' && p.meta?.horseId === h.id && p.meta?.month === m)) continue
      out.push({ id: `exp-board-${h.id}-${m}`, projected: true, service: 'boarding', familyId: h.ownerFamilyId, amount: BOARDING_MONTHLY,
        due, meta: { horseId: h.id, month: m } })
    }
  }
  return out
}

/** Everything unpaid up to the end of the month, in four groups: overdue, due today, next 5 days, later this month. */
export function receivables(s, { today = todayKey() } = {}) {
  const until = monthEnd(monthKeyOf(today)) > addDays(today, DUE_SOON_DAYS) ? monthEnd(monthKeyOf(today)) : addDays(today, DUE_SOON_DAYS)
  const real = s.payments
    .filter((p) => p.status === 'pending' && liveFamily(s, p.familyId))
    .map((p) => ({ ...p, due: dueOf(s, p) }))
    .filter((p) => p.due <= until)
  // Projected from the 1st: a pensión of this month that was never charged shows as overdue too.
  const items = [...real, ...projectedCharges(s, `${monthKeyOf(today)}-01`, until)].map((x) => ({ ...x, state: dueState(x.due, today) }))
    .sort((a, b) => a.due.localeCompare(b.due))
  const groups = Object.fromEntries(['overdue', 'today', 'soon', 'later'].map((k) => [k, items.filter((x) => x.state === k)]))
  const total = (list) => list.reduce((sum, x) => sum + x.amount, 0)
  return { groups, totals: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, total(v)])), until }
}

/** Month by month (this one and the next two): expected, collected, still pending and overdue, by due date. */
export function cashflow(s, months = 3, today = todayKey()) {
  const out = []
  for (let m = monthKeyOf(today), i = 0; i < months; m = nextMonthKey(m), i++) {
    const from = `${m}-01`
    const to = monthEnd(m)
    const charges = s.payments.filter((p) => liveFamily(s, p.familyId) || p.status === 'paid')
      .map((p) => ({ ...p, due: dueOf(s, p) })).filter((p) => p.due >= from && p.due <= to)
    const projected = projectedCharges(s, from, to)
    const sum = (list) => list.reduce((t, x) => t + x.amount, 0)
    const paid = charges.filter((p) => p.status === 'paid')
    const pending = charges.filter((p) => p.status === 'pending')
    out.push({
      month: m,
      expected: sum(charges) + sum(projected),
      collected: sum(paid),
      pending: sum(pending) + sum(projected),
      overdue: sum(pending.filter((p) => p.due < today)) + sum(projected.filter((p) => p.due < today)),
      lines: [...charges, ...projected].sort((a, b) => a.due.localeCompare(b.due)),
    })
  }
  return out
}

/** A family's unpaid charges due within 5 days or already overdue (not while a receipt is being reviewed). */
export function familyDueSoon(s, familyId, today = todayKey()) {
  return s.payments
    .filter((p) => p.familyId === familyId && p.status === 'pending' && p.receiptStatus !== 'review')
    .map((p) => ({ ...p, due: dueOf(s, p) }))
    .map((p) => ({ ...p, state: dueState(p.due, today) }))
    .filter((p) => p.state !== 'later')
    .sort((a, b) => a.due.localeCompare(b.due))
}

/** Reminders sent for a charge. Live: the daily job's log. Demo: the same schedule worked out from the dates. */
export function remindersFor(s, p, today = todayKey()) {
  if (s.mode !== 'demo') return (s.paymentReminders || []).filter((r) => r.paymentId === p.id).sort((a, b) => a.sentOn.localeCompare(b.sentOn))
  const due = p.due || dueOf(s, p)
  const created = dateKeyFromIso(p.createdAt)
  // Same rules as the daily job: nothing before the charge existed, nor on the day a family books something.
  const first = ['plan', 'boarding'].includes(p.service) && p.meta?.kind !== 'upgrade' ? created : addDays(created, 1)
  const out = []
  const push = (kind, day) => { if (day <= today) out.push({ kind, sentOn: day < first ? first : day, emailStatus: 'sent' }) }
  if (first > today) return out
  push('before', addDays(due, -DUE_SOON_DAYS))
  push('due', due)
  push('after', addDays(due, 3))
  for (let d = addDays(due, 10); d <= today; d = addDays(d, 7)) push('weekly', d)
  return out
}
