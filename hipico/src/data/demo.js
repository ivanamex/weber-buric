// Demo mode: sample data kept in this browser (localStorage). Same rules as the live database.
import { createSeed, DEMO_FAMILY_ID } from './seed.js'
import { planPrice, BOARDING_MONTHLY, CAMP, RENTAL_PER_HOUR } from './prices.js'
import { weekdayOf, monthKeyOf, currentMonthKey, hoursUntil, toInstant, todayKey } from '../lib/time.js'
import { byId, isActiveBooking, getPlan, planRemaining, canCancel, boardingStatus, LEVELS } from './queries.js'

const KEY = 'hipico.state.v1'

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
function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode: keep in memory */ }
  return s
}

let state = null
let publish = () => {}
const view = () => ({ ...state, mode: 'demo', status: 'ready' })

function commit(next) {
  state = persist(next)
  publish(view())
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

let storageListener = false
export function activate(setState) {
  publish = setState
  state ||= load() || persist(createSeed())
  if (!storageListener && typeof window !== 'undefined') {
    storageListener = true
    // Keep tabs in sync when the demo is open twice.
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) { const s = load(); if (s) { state = s; publish(view()) } }
    })
  }
  publish(view())
}

function login(role) {
  return mutate((s) => { s.session = { role, familyId: role === 'family' ? DEMO_FAMILY_ID : null } })
}
function logout() {
  return mutate((s) => { s.session = null })
}
function resetDemo() {
  const session = state.session
  commit({ ...createSeed(), session })
  return { ok: true }
}

/**
 * Book a class. Rules: slot exists that weekday, class in the future, open spot,
 * rider level matches, rider not already in it, plan for that month with classes left.
 * Decrements the plan.
 */
function bookClass({ riderId, slotId, date }) {
  return mutate((s) => {
    const rider = byId(s.riders, riderId)
    const slot = byId(s.slots, slotId)
    if (!rider || rider.active === false || !slot || slot.weekday !== weekdayOf(date)) return fail('notFound')
    if (hoursUntil(date, slot.time) <= 0) return fail('past')
    const active = s.bookings.filter((b) => b.slotId === slotId && b.date === date && isActiveBooking(b))
    if (active.some((b) => b.riderId === riderId)) return fail('already')
    if (active.length >= slot.capacity) return fail('full')
    if (rider.level !== slot.level) return fail('level')
    const month = monthKeyOf(date)
    let plan = getPlan(s, riderId, month)
    // Standing plans renew on the first booking of a month (payment pending at the club).
    if (!plan && rider.planClasses && (!rider.planStart || monthKeyOf(rider.planStart) <= month) && planPrice(rider.planClasses)) {
      plan = { id: nextId(s, 'pl'), riderId, month, total: rider.planClasses, used: 0, paid: false }
      s.plans.push(plan)
      s.payments.push({
        id: nextId(s, 'pay'), familyId: rider.familyId, service: 'plan', amount: planPrice(rider.planClasses),
        status: 'pending', method: null, createdAt: now(), paidAt: null, meta: { riderId, month, classes: rider.planClasses },
      })
    }
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
function cancelBooking(bookingId) {
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
function markAttendance(bookingId, status) {
  return mutate((s) => {
    const b = byId(s.bookings, bookingId)
    if (!b || b.status === 'cancelled') return fail('notFound')
    b.status = b.status === status ? 'booked' : status
    return { ok: true, status: b.status }
  })
}

/** Choose / renew a monthly package, to be paid at the club. Creates a pending payment. */
function choosePlan({ riderId, classes, month }) {
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

function requestBoardingPayment(familyId, month = currentMonthKey()) {
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
function markPaid(paymentId, method) {
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

function registerCamp({ eventId, riderId }) {
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
function bookRental({ familyId, date, time, hours, horseId }) {
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

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const familyNameFor = (contact) => `Familia ${contact.trim().split(/\s+/).pop()}`

/** Same rules as the database: unique email, at least one rider, valid levels and plans. */
function createFamilyIn(s, p, preloaded = true) {
  const email = (p.email || '').trim().toLowerCase()
  const contact = (p.contact || '').trim()
  if (!EMAIL_RE.test(email) || !contact) return fail('missing')
  if (s.families.some((f) => f.email?.toLowerCase() === email)) return fail('emailExists')
  const riders = (p.riders || []).filter((r) => r.name?.trim())
  if (!riders.length) return fail('noRiders')
  if (riders.some((r) => !LEVELS.includes(r.level))) return fail('missing')
  const start = p.start || todayKey()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return fail('missing')
  const month = [monthKeyOf(start), currentMonthKey()].sort().pop()
  const plans = riders.map((r) => (preloaded ? Number(r.plan || p.plan) || null : null))
  if (plans.some((n) => n && !planPrice(n))) return fail('badPlan')
  const family = {
    id: nextId(s, 'f'), name: p.name?.trim() || familyNameFor(contact), contact, email,
    phone: p.phone?.trim() || '', active: true, selfSignup: !preloaded,
  }
  s.families.push(family)
  riders.forEach((r, i) => {
    const rider = {
      id: nextId(s, 'r'), familyId: family.id, name: r.name.trim(), age: Number(r.age) || null, level: r.level,
      active: true, planClasses: plans[i], planStart: plans[i] ? start : null,
    }
    s.riders.push(rider)
    if (plans[i]) s.plans.push({ id: nextId(s, 'pl'), riderId: rider.id, month, total: plans[i], used: 0, paid: true })
  })
  return { ok: true, family }
}

function createFamily(p) {
  return mutate((s) => createFamilyIn(s, p))
}

function importFamilies(list) {
  return mutate((s) => {
    let created = 0; let skipped = 0; let failed = 0
    for (const p of list) {
      const res = createFamilyIn(s, p)
      if (res.ok) created++
      else if (res.code === 'emailExists') skipped++
      else failed++
    }
    return { ok: true, created, skipped, failed }
  })
}

function setPlanIn(s, riderId, classes) {
  const rider = byId(s.riders, riderId)
  if (!rider) return fail('notFound')
  if (classes && !planPrice(classes)) return fail('badPlan')
  const plan = getPlan(s, riderId)
  if (classes && plan && classes < plan.used) return fail('belowUsed')
  rider.planClasses = classes || null
  rider.planStart = classes ? rider.planStart || todayKey() : null
  if (classes) {
    if (plan) plan.total = classes
    else s.plans.push({ id: nextId(s, 'pl'), riderId, month: currentMonthKey(), total: classes, used: 0, paid: true })
  }
  return { ok: true }
}

/** Save management edits: family fields, rider changes (new riders have no id) and plan changes. */
function saveFamily({ familyId, fields, riders = [] }) {
  return mutate((s) => {
    const family = byId(s.families, familyId)
    if (!family) return fail('notFound')
    const email = (fields.email ?? family.email).trim().toLowerCase()
    if (!EMAIL_RE.test(email) || !(fields.contact ?? family.contact).trim()) return fail('missing')
    if (s.families.some((f) => f.id !== familyId && f.email?.toLowerCase() === email)) return fail('emailExists')
    Object.assign(family, {
      name: (fields.name ?? family.name).trim() || family.name,
      contact: (fields.contact ?? family.contact).trim(),
      email,
      phone: (fields.phone ?? family.phone ?? '').trim(),
    })
    for (const r of riders) {
      if (!r.name?.trim() || !LEVELS.includes(r.level)) return fail('missing')
      let rider = r.id && byId(s.riders, r.id)
      if (!rider) {
        rider = { id: nextId(s, 'r'), familyId, name: r.name.trim(), age: Number(r.age) || null, level: r.level, active: true, planClasses: null, planStart: null }
        s.riders.push(rider)
      } else {
        Object.assign(rider, { name: r.name.trim(), level: r.level, age: Number(r.age) || null, active: r.active !== false })
      }
      if ((Number(r.planClasses) || null) !== (rider.planClasses || null)) {
        const res = setPlanIn(s, rider.id, Number(r.planClasses) || null)
        if (!res.ok) return res
      }
    }
    return { ok: true }
  })
}

function setFamilyActive(familyId, active) {
  return mutate((s) => {
    const family = byId(s.families, familyId)
    if (!family) return fail('notFound')
    family.active = active
    family.deactivatedAt = active ? null : now()
    return { ok: true }
  })
}

export const actions = {
  login, logout, resetDemo, bookClass, cancelBooking, markAttendance, choosePlan,
  requestBoardingPayment, markPaid, registerCamp, bookRental,
  createFamily, importFamilies, saveFamily, setFamilyActive,
  selfSignup: () => fail('notFound'),
}
