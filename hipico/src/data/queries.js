// Pure read-only calculations over the app state. Both the demo and the live (Supabase) data
// produce the same state shape, so every screen works unchanged in either mode.
import { todayKey, addDays, weekdayOf, weekStart, monthKeyOf, currentMonthKey, monthEnd, hoursUntil, toInstant } from '../lib/time.js'

export const CANCEL_WINDOW_HOURS = 12
export const LEVELS = ['beginner', 'intermediate', 'advanced']

export const byId = (list, id) => list.find((x) => x.id === id)
export const isActiveBooking = (b) => b.status !== 'cancelled'

export function getPlan(s, riderId, month = currentMonthKey()) {
  return s.plans.find((p) => p.riderId === riderId && p.month === month) || null
}
export const planRemaining = (plan) => (plan ? Math.max(plan.total - plan.used, 0) : 0)
export const planExpiry = (plan) => monthEnd(plan.month)

/** Riders of a family. Removed (inactive) riders are hidden unless asked for (management history). */
export function familyRiders(s, familyId, { includeInactive = false } = {}) {
  return s.riders.filter((r) => r.familyId === familyId && (includeInactive || r.active !== false))
}
export const isActiveFamily = (f) => f.active !== false // false = blocked by the club
export const isDeletedFamily = (f) => Boolean(f.deletedAt)

/** Slot occurrences for a given date, enriched with counts and state for a rider. */
export function occurrencesFor(s, date, riderId = null) {
  const rider = riderId ? byId(s.riders, riderId) : null
  return s.slots
    .filter((sl) => sl.weekday === weekdayOf(date) && sl.active !== false)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((slot) => {
      const bookings = s.bookings.filter((b) => b.slotId === slot.id && b.date === date && isActiveBooking(b))
      // Live mode: families only see their own bookings, so seat counts come from the server.
      const taken = Math.max(bookings.length, s.slotCounts?.[`${slot.id}|${date}`] ?? 0)
      const spotsLeft = Math.max(slot.capacity - taken, 0)
      const past = hoursUntil(date, slot.time) <= 0
      const mine = rider ? bookings.find((b) => b.riderId === rider.id) : null
      const levelOk = rider ? rider.level === slot.level : true
      const cancellation = (s.cancellations || []).find((c) => c.slotId === slot.id && c.date === date) || null
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
export const activePlansCount = (s) =>
  s.plans.filter((p) => p.month === currentMonthKey()).length


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
export const pendingUpgrade = (s, riderId, month = currentMonthKey()) =>
  planPaymentsFor(s, riderId, month).find((p) => p.meta?.kind === 'upgrade') || null
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
