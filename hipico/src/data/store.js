// Single data-access module. Phase 1: localStorage. Phase 2: swap the internals of
// load/commit + actions for Supabase calls — components only use the exports below.
import { useSyncExternalStore } from 'react'
import { createSeed, DEMO_FAMILY_ID } from './seed.js'
import { planPrice, BOARDING_MONTHLY, CAMP, RENTAL_PER_HOUR } from './prices.js'
import {
  todayKey, addDays, weekdayOf, weekStart, monthKeyOf, currentMonthKey, monthEnd, hoursUntil, toInstant,
} from '../lib/time.js'

const KEY = 'hipico.state.v1'
export const CANCEL_WINDOW_HOURS = 12
export const LEVELS = ['beginner', 'intermediate', 'advanced']

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s?.version === 1) return s
    }
  } catch { /* corrupted or unavailable storage → reseed */ }
  return null
}

let state = load() || persist(createSeed())
const listeners = new Set()

function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode: keep in memory */ }
  return s
}
function commit(next) {
  state = persist(next)
  listeners.forEach((l) => l())
}
/** Run an action against a draft copy; commit only when it succeeds. */
function mutate(fn) {
  const draft = structuredClone(state)
  const result = fn(draft) || { ok: true }
  if (result.ok) commit(draft)
  return result
}
const fail = (code, extra) => ({ ok: false, code, ...extra })
const nextId = (s, prefix) => `${prefix}${s.nextId++}`
const now = () => new Date().toISOString()

export const getState = () => state
export const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
export const useStore = () => useSyncExternalStore(subscribe, getState)

// Keep tabs in sync when the app is open twice.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { const s = load(); if (s) { state = s; listeners.forEach((l) => l()) } }
  })
}

/* ───────────────────────── Queries (pure) ───────────────────────── */

export const byId = (list, id) => list.find((x) => x.id === id)
export const isActiveBooking = (b) => b.status !== 'cancelled'

export function getPlan(s, riderId, month = currentMonthKey()) {
  return s.plans.find((p) => p.riderId === riderId && p.month === month) || null
}
export const planRemaining = (plan) => (plan ? Math.max(plan.total - plan.used, 0) : 0)
export const planExpiry = (plan) => monthEnd(plan.month)

export function familyRiders(s, familyId) {
  return s.riders.filter((r) => r.familyId === familyId)
}

/** Slot occurrences for a given date, enriched with counts and state for a rider. */
export function occurrencesFor(s, date, riderId = null) {
  const rider = riderId ? byId(s.riders, riderId) : null
  return s.slots
    .filter((sl) => sl.weekday === weekdayOf(date))
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((slot) => {
      const bookings = s.bookings.filter((b) => b.slotId === slot.id && b.date === date && isActiveBooking(b))
      const spotsLeft = Math.max(slot.capacity - bookings.length, 0)
      const past = hoursUntil(date, slot.time) <= 0
      const mine = rider ? bookings.find((b) => b.riderId === rider.id) : null
      const levelOk = rider ? rider.level === slot.level : true
      return { slot, date, bookings, spotsLeft, past, mine, levelOk, instructor: byId(s.instructors, slot.instructorId) }
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

export const SERVICES = ['plan', 'boarding', 'camp', 'rental', 'events']
export function incomeByService(s) {
  const totals = Object.fromEntries(SERVICES.map((k) => [k, 0]))
  for (const p of paidThisMonth(s)) totals[p.service] = (totals[p.service] || 0) + p.amount
  return totals
}
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
      taken += o.bookings.length
      byLevel[o.slot.level].seats += o.slot.capacity
      byLevel[o.slot.level].taken += o.bookings.length
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

/* ───────────────────────── Actions ───────────────────────── */

export function login(role) {
  return mutate((s) => { s.session = { role, familyId: role === 'family' ? DEMO_FAMILY_ID : null } })
}
export function logout() {
  return mutate((s) => { s.session = null })
}
export function resetDemo() {
  const session = state.session
  commit({ ...createSeed(), session })
  return { ok: true }
}

/**
 * Book a class. Rules: slot exists that weekday, class in the future, open spot,
 * rider level matches, rider not already in it, plan for that month with classes left.
 * Decrements the plan.
 */
export function bookClass({ riderId, slotId, date }) {
  return mutate((s) => {
    const rider = byId(s.riders, riderId)
    const slot = byId(s.slots, slotId)
    if (!rider || !slot || slot.weekday !== weekdayOf(date)) return fail('notFound')
    if (hoursUntil(date, slot.time) <= 0) return fail('past')
    const active = s.bookings.filter((b) => b.slotId === slotId && b.date === date && isActiveBooking(b))
    if (active.some((b) => b.riderId === riderId)) return fail('already')
    if (active.length >= slot.capacity) return fail('full')
    if (rider.level !== slot.level) return fail('level')
    const month = monthKeyOf(date)
    const plan = getPlan(s, riderId, month)
    if (!plan) return fail('noPlan', { month })
    if (plan.used >= plan.total) return fail('planEmpty', { month })

    // Horse: rider's own boarded horse if free, else first free school horse at that time.
    const busy = new Set(
      s.bookings
        .filter((b) => b.date === date && isActiveBooking(b) && byId(s.slots, b.slotId)?.time === slot.time)
        .map((b) => b.horseId),
    )
    let horseId = rider.horseId && !busy.has(rider.horseId) ? rider.horseId : null
    horseId ||= s.horses.find((h) => h.type === 'school' && !busy.has(h.id))?.id
    if (!horseId) return fail('noHorse')

    plan.used += 1
    const booking = { id: nextId(s, 'b'), slotId, date, riderId, horseId, status: 'booked', createdAt: now() }
    s.bookings.push(booking)
    return { ok: true, booking, remaining: planRemaining(plan) }
  })
}

/** Cancel ≥12 h before start → class returns to the plan. */
export function cancelBooking(bookingId) {
  return mutate((s) => {
    const b = byId(s.bookings, bookingId)
    if (!b) return fail('notFound')
    const slot = byId(s.slots, b.slotId)
    if (!canCancel(b, slot)) return fail('tooLate')
    b.status = 'cancelled'
    b.cancelledAt = now()
    const plan = getPlan(s, b.riderId, monthKeyOf(b.date))
    if (plan) plan.used = Math.max(plan.used - 1, 0)
    return { ok: true }
  })
}

/** Admin attendance. Both "attended" and "noshow" keep the class counted as used. */
export function markAttendance(bookingId, status) {
  return mutate((s) => {
    const b = byId(s.bookings, bookingId)
    if (!b || b.status === 'cancelled') return fail('notFound')
    b.status = b.status === status ? 'booked' : status
    return { ok: true, status: b.status }
  })
}

/** Choose / renew a monthly package, to be paid at the club. Creates a pending payment. */
export function choosePlan({ riderId, classes, month }) {
  return mutate((s) => {
    const rider = byId(s.riders, riderId)
    if (!rider) return fail('notFound')
    const pendingSame = s.payments.find((p) => p.service === 'plan' && p.status === 'pending' && p.meta?.riderId === riderId && p.meta?.month === month)
    if (pendingSame) return fail('pendingExists')
    let plan = getPlan(s, riderId, month)
    if (plan) {
      if (plan.total === classes) return fail('samePlan')
      if (classes < plan.used) return fail('belowUsed')
      plan.total = classes
      plan.paid = false
    } else {
      plan = { id: nextId(s, 'pl'), riderId, month, total: classes, used: 0, paid: false }
      s.plans.push(plan)
    }
    const payment = {
      id: nextId(s, 'pay'), familyId: rider.familyId, service: 'plan', amount: planPrice(classes),
      status: 'pending', method: null, createdAt: now(), paidAt: null, meta: { riderId, month, classes },
    }
    s.payments.push(payment)
    return { ok: true, payment }
  })
}

export function requestBoardingPayment(familyId, month = currentMonthKey()) {
  return mutate((s) => {
    const horses = s.horses.filter((h) => h.type === 'boarded' && h.ownerFamilyId === familyId)
    if (!horses.length) return fail('noHorse')
    let created = 0
    for (const horse of horses) {
      const existing = s.payments.find((p) => p.service === 'boarding' && p.meta?.horseId === horse.id && p.meta?.month === month)
      if (existing) continue
      s.payments.push({
        id: nextId(s, 'pay'), familyId, service: 'boarding', amount: BOARDING_MONTHLY, status: 'pending',
        method: null, createdAt: now(), paidAt: null, meta: { horseId: horse.id, month },
      })
      created++
    }
    if (!created) {
      const allPaid = boardingStatus(s, familyId, month).every((b) => b.status === 'paid')
      return fail(allPaid ? 'alreadyPaid' : 'pendingExists')
    }
    return { ok: true }
  })
}

/** Admin marks a payment as collected (cash / transfer) and applies side effects. */
export function markPaid(paymentId, method) {
  return mutate((s) => {
    const p = byId(s.payments, paymentId)
    if (!p || p.status !== 'pending') return fail('notFound')
    p.status = 'paid'
    p.method = method
    p.paidAt = now()
    if (p.service === 'plan') {
      const plan = getPlan(s, p.meta.riderId, p.meta.month)
      if (plan) plan.paid = true
    }
    return { ok: true, payment: p }
  })
}

export function registerCamp({ eventId, riderId }) {
  return mutate((s) => {
    const ev = byId(s.events, eventId)
    const rider = byId(s.riders, riderId)
    if (!ev || !rider) return fail('notFound')
    const regs = s.campRegistrations.filter((r) => r.eventId === eventId)
    if (regs.some((r) => r.riderId === riderId)) return fail('already')
    if (regs.length >= ev.capacity) return fail('full')
    const payment = {
      id: nextId(s, 'pay'), familyId: rider.familyId, service: 'camp', amount: ev.deposit ?? CAMP.deposit,
      status: 'pending', method: null, createdAt: now(), paidAt: null, meta: { riderId, eventId },
    }
    s.payments.push(payment)
    s.campRegistrations.push({ id: nextId(s, 'cr'), eventId, riderId, paymentId: payment.id, createdAt: now() })
    return { ok: true, payment }
  })
}

/** Horse rental (trail ride). Horse must be free at that date/time; pay at the club. */
export function bookRental({ familyId, date, time, hours, horseId }) {
  return mutate((s) => {
    if (!date || !time || !horseId) return fail('missing')
    if (hoursUntil(date, time) <= 0) return fail('past')
    const start = toInstant(date, time).getTime()
    const end = start + hours * 36e5
    const overlaps = (aStart, aEnd) => aStart < end && start < aEnd
    const rentalClash = s.rentals.some((r) => r.horseId === horseId && r.status !== 'cancelled' &&
      overlaps(toInstant(r.date, r.time).getTime(), toInstant(r.date, r.time).getTime() + r.hours * 36e5))
    const classClash = s.bookings.some((b) => {
      if (b.horseId !== horseId || b.date !== date || !isActiveBooking(b)) return false
      const t = toInstant(b.date, byId(s.slots, b.slotId).time).getTime()
      return overlaps(t, t + 36e5)
    })
    if (rentalClash || classClash) return fail('horseBusy')
    const rental = { id: nextId(s, 'rt'), familyId, date, time, hours, horseId, createdAt: now() }
    s.rentals.push(rental)
    s.payments.push({
      id: nextId(s, 'pay'), familyId, service: 'rental', amount: RENTAL_PER_HOUR * hours, status: 'pending',
      method: null, createdAt: now(), paidAt: null, meta: { rentalId: rental.id },
    })
    return { ok: true, rental }
  })
}
