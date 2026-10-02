// Demo mode: sample data kept in this browser (localStorage). Same rules as the live database.
import { createSeed, DEMO_FAMILY_ID } from './seed.js'
import { planPrice, BOARDING_MONTHLY, CAMP, RENTAL_PER_HOUR, CLASS_PRICES, CLASS_KINDS, applyPrices, resetPrices } from './prices.js'
import { monthKeyOf, currentMonthKey, nextMonthKey, hoursUntil, todayKey, periodOf, addDays, daysBetween, weekdayOf } from '../lib/time.js'
import { byId, isActiveBooking, getPlan, planRemaining, canCancel, boardingStatus, LEVELS, planStart, planEnd, planRenewal, HORSE_STATUSES, nextPayAfter, HEALTH_KINDS, slotRuns, isClosed, isOneOff, pickHorse, horseBusy, riderBusy, slotMinutes, closedWeekdays } from './queries.js'

// The demo keeps its data under its own names, apart from the real app. The chosen role is never saved:
// every visit to /demo starts on the role picker.
const KEY = 'hipico.demo.state'
const OLD_KEY = 'hipico.state.v1' // before the demo had its own names

function load() {
  try {
    localStorage.removeItem(OLD_KEY)
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s?.version === 1) return { ...s, session: null }
    }
  } catch { /* corrupted or unavailable storage → reseed */ }
  return null
}
function persist(s) {
  if (memoryOnly) return s
  try { localStorage.setItem(KEY, JSON.stringify({ ...s, session: null })) } catch { /* private mode: keep in memory */ }
  return s
}

let state = null
let memoryOnly = false // the landing's phone preview: fresh sample data, nothing saved in the browser
let publish = () => {}
const view = () => ({ ...state, mode: memoryOnly ? 'preview' : 'demo', status: 'ready' })

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
export function activate(setState, inMemory = false) {
  publish = setState
  if (inMemory !== memoryOnly) { state = null; memoryOnly = inMemory }
  state ||= memoryOnly ? { ...createSeed(), session: { role: 'family', familyId: DEMO_FAMILY_ID } } : load() || persist(createSeed())
  // Demo states saved before the owner's panel: add its sample data once.
  if (!state.employees && !memoryOnly) {
    const seed = createSeed()
    for (const k of ['employees', 'salaryPayments', 'expenseCategories', 'expenses', 'horseSales']) state[k] = seed[k]
    state.settings = { ...seed.settings, ...state.settings, modulePayroll: true, moduleProfit: true, moduleSales: true }
    persist(state)
  }
  // Demo states saved before the horse profile: add the sample care, health and horse details once.
  if (!state.horseCare && !memoryOnly) {
    const seed = createSeed()
    state.horseCare = seed.horseCare
    state.horseHealth = seed.horseHealth
    for (const h of state.horses) Object.assign(h, { ...Object.fromEntries(Object.entries(byId(seed.horses, h.id) || {}).filter(([k]) => h[k] == null)) })
    persist(state)
  }
  // Demo states saved before closed days and bulk classes: start again from the sample data (the club now closes on Mondays).
  if (!state.settings?.closedWeekdays && !memoryOnly) state = persist(createSeed())
  // Demo states from before the sample data was corrected (dates, horses by level, bank details): start again once.
  if ((state.version || 1) < 2 && !memoryOnly) state = persist({ ...createSeed(), session: state.session })
  if (state.classPrices) applyPrices(Object.fromEntries(CLASS_KINDS.map((k) => [`class_${k}`, state.classPrices[k]])))
  if (!memoryOnly && !storageListener && typeof window !== 'undefined') {
    storageListener = true
    // Keep tabs in sync when the demo is open twice.
    window.addEventListener('storage', (e) => {
      if (e.key === KEY && !memoryOnly) { const s = load(); if (s) { state = { ...s, session: state.session }; publish(view()) } }
    })
  }
  publish(view())
}

function login(role) {
  return mutate((s) => {
    const family = byId(s.families, DEMO_FAMILY_ID)
    if (role === 'family' && (family?.active === false || family?.deletedAt)) return fail(family.deletedAt ? 'accountDeleted' : 'accountBlocked')
    s.session = { role, familyId: role === 'family' ? DEMO_FAMILY_ID : null }
  })
}
function logout() {
  return mutate((s) => { s.session = null })
}
function setPassword(password) {
  if (!password || password.length < 8) return fail('shortPassword')
  return mutate((s) => { s.hasPassword = true })
}
const liveOnly = () => ({ ok: true })

/** Back to the sample data. `{ wipe: true }` (from /demo?reset=1) also leaves the role, back to the picker. */
function resetDemo({ wipe = false } = {}) {
  resetPrices()
  receiptFiles.clear()
  try { localStorage.removeItem(FILES_KEY) } catch { /* ignore */ }
  const session = wipe ? null : state.session
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
    if (!rider || rider.active === false || !slot || slot.active === false || !slotRuns(slot, date)) return fail('notFound')
    if (hoursUntil(date, slot.time) <= 0) return fail('past')
    if (isClosed(s, date)) return fail('closed')
    if ((s.cancellations || []).some((c) => c.slotId === slotId && c.date === date)) return fail('classCancelled')
    const active = s.bookings.filter((b) => b.slotId === slotId && b.date === date && isActiveBooking(b))
    if (active.some((b) => b.riderId === riderId)) return fail('already')
    if (riderBusy(s, riderId, date, slot.time, slotMinutes(slot), slotId)) return fail('overlap')
    if (active.length >= slot.capacity) return fail('full')
    if (rider.level !== slot.level) return fail('level')
    const month = monthKeyOf(date)
    let plan = getPlan(s, riderId, date)
    // A standing plan renews on its own date: the new period is created (unpaid) on the first booking in it.
    if (!plan && rider.planClasses && (!rider.planStart || rider.planStart <= date) && planPrice(rider.planClasses)) {
      plan = openPeriod(s, rider, date)
    }
    if (!plan) return fail('noPlan', { month })
    if (plan.used >= plan.total) return fail('planEmpty', { month })

    const horseId = pickHorse(s, rider, slot, date)
    if (!horseId) return fail('noHorse')

    plan.used += 1
    const booking = { id: nextId(s, 'b'), slotId, date, riderId, horseId, status: 'booked', createdAt: now() }
    s.bookings.push(booking)
    return { ok: true, booking, remaining: planRemaining(plan) }
  })
}

/** Create the period of a standing plan that covers `date` (unpaid, with its pending payment). */
function openPeriod(s, rider, date) {
  const { startsOn, endsOn } = periodOf(rider.planStart || `${monthKeyOf(date)}-01`, date)
  const month = monthKeyOf(startsOn)
  if (s.plans.some((p) => p.riderId === rider.id && p.month === month)) return null
  const plan = { id: nextId(s, 'pl'), riderId: rider.id, month, startsOn, endsOn, total: rider.planClasses, used: 0, paid: false }
  s.plans.push(plan)
  s.payments.push({
    id: nextId(s, 'pay'), familyId: rider.familyId, service: 'plan', amount: planPrice(rider.planClasses),
    status: 'pending', method: null, createdAt: now(), paidAt: null, meta: { riderId: rider.id, month, start: startsOn, classes: rider.planClasses },
  })
  return plan
}

/** Same rules as book_single_class(): trial (one per rider, no plan), single (no plan), extra (plan that month). */
function bookSingleClass({ riderId, slotId, date, kind }) {
  return mutate((s) => {
    const rider = byId(s.riders, riderId)
    const slot = byId(s.slots, slotId)
    if (!CLASS_KINDS.includes(kind) || !rider || rider.active === false || !slot || slot.active === false || !slotRuns(slot, date)) return fail('notFound')
    if (hoursUntil(date, slot.time) <= 0) return fail('past')
    if (isClosed(s, date)) return fail('closed')
    if ((s.cancellations || []).some((c) => c.slotId === slotId && c.date === date)) return fail('classCancelled')
    const hasPlan = Boolean(getPlan(s, riderId, date))
    if (kind === 'extra' && !hasPlan) return fail('noPlan')
    if (kind !== 'extra' && hasPlan) return fail('hasPlan')
    if (kind === 'trial' && s.bookings.some((b) => b.riderId === riderId && b.kind === 'trial' && isActiveBooking(b))) return fail('trialUsed')
    const active = s.bookings.filter((b) => b.slotId === slotId && b.date === date && isActiveBooking(b))
    if (active.some((b) => b.riderId === riderId)) return fail('already')
    if (riderBusy(s, riderId, date, slot.time, slotMinutes(slot), slotId)) return fail('overlap')
    if (active.length >= slot.capacity) return fail('full')
    if (rider.level !== slot.level) return fail('level')
    const horseId = pickHorse(s, rider, slot, date)
    if (!horseId) return fail('noHorse')
    const booking = { id: nextId(s, 'b'), slotId, date, riderId, horseId, status: 'booked', kind, createdAt: now() }
    const payment = {
      id: nextId(s, 'pay'), familyId: rider.familyId, service: 'class', amount: CLASS_PRICES[kind],
      status: 'pending', method: null, createdAt: now(), paidAt: null, meta: { riderId, kind, date, slotId, bookingId: booking.id },
    }
    booking.paymentId = payment.id
    s.bookings.push(booking)
    s.payments.push(payment)
    return { ok: true, booking, payment, amount: payment.amount }
  })
}

/** A plan class returns to the plan; a class paid on its own drops its unpaid charge. */
function releaseBooking(s, b) {
  if ((b.kind || 'plan') === 'plan') {
    const plan = getPlan(s, b.riderId, b.date)
    if (plan) plan.used = Math.max(plan.used - 1, 0)
  } else if (b.paymentId) {
    s.payments = s.payments.filter((p) => !(p.id === b.paymentId && p.status === 'pending' && p.receiptStatus !== 'review'))
  }
}

function saveClassPrices(prices) {
  const clean = {}
  for (const k of CLASS_KINDS) {
    const n = Number(prices[k])
    if (!Number.isFinite(n) || n < 0) return fail('missing')
    clean[k] = Math.round(n)
  }
  const res = mutate((s) => { s.classPrices = clean })
  applyPrices(Object.fromEntries(CLASS_KINDS.map((k) => [`class_${k}`, clean[k]])))
  return res
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
    releaseBooking(s, b)
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

/** Choose a plan: with none running today it starts today and renews on that day each month. Payment pending. */
function choosePlan({ riderId, classes }) {
  return mutate((s) => {
    const rider = byId(s.riders, riderId)
    if (!rider || !planPrice(classes)) return fail('notFound')
    const today = todayKey()
    let plan = getPlan(s, riderId, today)
    let from = null
    if (plan) {
      if (s.payments.some((p) => p.service === 'plan' && p.status === 'pending' && p.meta?.riderId === riderId && p.meta?.month === plan.month)) return fail('pendingExists')
      if (plan.total === classes) return fail('samePlan')
      if (classes < plan.used) return fail('belowUsed')
      from = plan.total
      plan.total = classes
      plan.paid = false
    } else {
      rider.planStart = today
      const { startsOn, endsOn } = periodOf(today, today)
      s.plans = s.plans.filter((p) => !(p.riderId === riderId && p.month === monthKeyOf(startsOn) && !p.used && !p.paid))
      plan = { id: nextId(s, 'pl'), riderId, month: monthKeyOf(startsOn), startsOn, endsOn, total: classes, used: 0, paid: false }
      s.plans.push(plan)
    }
    const payment = {
      id: nextId(s, 'pay'), familyId: rider.familyId, service: 'plan', amount: planPrice(classes),
      status: 'pending', method: null, createdAt: now(), paidAt: null, meta: { riderId, month: plan.month, start: planStart(plan), classes },
    }
    s.payments.push(payment)
    rider.planClasses = classes
    rider.planStart ||= planStart(plan)
    logChange(s, rider, { from, to: classes, kind: 'new', month: plan.month, on: planStart(plan), paymentId: payment.id })
    return { ok: true, payment }
  })
}

function logChange(s, rider, { from, to, kind, month, on = null, paymentId = null }) {
  s.planChanges ||= []
  s.planChanges.unshift({ id: nextId(s, 'pc'), riderId: rider.id, familyId: rider.familyId, fromClasses: from ?? null, toClasses: to, kind, effectiveMonth: month, effectiveOn: on, paymentId, createdAt: now() })
}

/** Same rules as change_plan() in the database: upgrade now (pay the difference), downgrade from the next renewal. */
function changePlan({ riderId, classes }) {
  return mutate((s) => {
    const rider = byId(s.riders, riderId)
    if (!rider || rider.active === false) return fail('notFound')
    if (!planPrice(classes)) return fail('badPlan')
    const today = todayKey()
    const plan = getPlan(s, riderId, today)
    if (!plan) return fail('noPlan')
    const month = plan.month
    if (classes === plan.total && (rider.planClasses ?? plan.total) === classes) return fail('samePlan')
    const planPayments = (m) => s.payments.filter((p) => p.service === 'plan' && p.status === 'pending' && p.meta?.riderId === riderId && p.meta?.month === m)
    const before = plan.total
    if (classes > plan.total) {
      if (planPayments(month).some((p) => p.meta?.kind === 'upgrade')) return fail('pendingExists')
      let payment
      if (!plan.paid) {
        payment = planPayments(month)[0]
        if (payment?.receiptStatus === 'review') return fail('pendingExists')
        plan.total = classes
        if (payment) Object.assign(payment, { amount: planPrice(classes), meta: { ...payment.meta, classes } })
      } else {
        payment = {
          id: nextId(s, 'pay'), familyId: rider.familyId, service: 'plan', amount: Math.max(planPrice(classes) - planPrice(plan.total), 0),
          status: 'pending', method: null, createdAt: now(), paidAt: null, meta: { riderId, month, start: planStart(plan), classes, fromClasses: plan.total, kind: 'upgrade' },
        }
      }
      if (!payment) {
        payment = { id: nextId(s, 'pay'), familyId: rider.familyId, service: 'plan', amount: planPrice(classes), status: 'pending', method: null, createdAt: now(), paidAt: null, meta: { riderId, month, start: planStart(plan), classes } }
      }
      if (!s.payments.includes(payment)) s.payments.push(payment)
      logChange(s, rider, { from: before, to: classes, kind: 'upgrade', month, on: today, paymentId: payment.id })
      rider.planClasses = classes
      rider.planStart ||= planStart(plan)
      return { ok: true, kind: 'upgrade', payment, effective: today }
    }
    // Downgrade: from the next renewal date, never while an upgrade is still unpaid.
    if (planPayments(month).some((p) => p.meta?.kind === 'upgrade')) return fail('pendingExists')
    const effective = planRenewal(plan)
    rider.planClasses = classes
    rider.planStart ||= planStart(plan)
    const nextPlan = getPlan(s, riderId, effective)
    if (nextPlan && !nextPlan.paid && nextPlan.used <= classes) {
      nextPlan.total = classes
      for (const p of planPayments(nextPlan.month)) if (p.receiptStatus !== 'review') Object.assign(p, { amount: planPrice(classes), meta: { ...p.meta, classes } })
    }
    logChange(s, rider, { from: before, to: classes, kind: 'downgrade', month: monthKeyOf(effective), on: effective })
    return { ok: true, kind: 'downgrade', effective }
  })
}

/** A regular plan payment marks the month paid; an upgrade difference adds the classes. */
function applyPlanPayment(s, p) {
  if (p.service !== 'plan') return
  const plan = getPlan(s, p.meta.riderId, p.meta.month)
  if (!plan) return
  if (p.meta.kind === 'upgrade') plan.total = Math.max(plan.total, p.meta.classes)
  else plan.paid = true
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
    if (p.receiptStatus) { p.receiptStatus = 'approved'; p.reviewedAt = now() }
    applyPlanPayment(s, p)
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
    if (horseBusy(s, horseId, date, time, hours * 60)) return fail('horseBusy')
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
  const today = todayKey()
  const period = periodOf(start, start > today ? start : today)
  const month = monthKeyOf(period.startsOn)
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
    if (plans[i]) s.plans.push({ id: nextId(s, 'pl'), riderId: rider.id, month, ...period, total: plans[i], used: 0, paid: true })
  })
  return { ok: true, family }
}

function createFamily(p) {
  return mutate((s) => createFamilyIn(s, p))
}

/** Same as admin_set_plan(): the period runs date to date from the start date. It updates the plan that period
 *  overlaps (never a second one) and only counts as paid when no charge for it is pending. */
function setPlanIn(s, riderId, classes, start) {
  const rider = byId(s.riders, riderId)
  if (!rider) return fail('notFound')
  if (classes && !planPrice(classes)) return fail('badPlan')
  if (!classes) {
    rider.planClasses = null
    rider.planStart = null
    return { ok: true }
  }
  const today = todayKey()
  const anchor = start || rider.planStart || today
  const { startsOn, endsOn } = periodOf(anchor, anchor > today ? anchor : today)
  const month = monthKeyOf(startsOn)
  const overlapping = s.plans.filter((p) => p.riderId === riderId && planStart(p) <= endsOn && planEnd(p) >= startsOn)
    .sort((a, b) => (planStart(b) <= today && planEnd(b) >= today) - (planStart(a) <= today && planEnd(a) >= today) || planStart(b).localeCompare(planStart(a)))
  const plan = overlapping[0] || null
  if (plan && classes < plan.used) return fail('belowUsed')
  const charges = (m) => s.payments.filter((p) => p.service === 'plan' && p.status === 'pending' && p.meta?.riderId === riderId && p.meta?.month === m && p.meta?.kind !== 'upgrade')
  const pending = [...charges(month), ...(plan ? charges(plan.month) : [])]
  rider.planClasses = classes
  rider.planStart = anchor
  // Other unused, unpaid periods inside the new one go away; an earlier one now ends the day before.
  s.plans = s.plans.filter((p) => p === plan || !(overlapping.includes(p) && !p.used && !p.paid))
  for (const p of s.plans) {
    if (p !== plan && overlapping.includes(p) && planStart(p) < startsOn) Object.assign(p, { startsOn: planStart(p), endsOn: addDays(startsOn, -1) })
  }
  const free = !s.plans.some((p) => p !== plan && p.riderId === riderId && p.month === month)
  if (plan) Object.assign(plan, { total: classes, paid: plan.paid || !pending.length, startsOn, endsOn, month: free ? month : plan.month })
  else s.plans.push({ id: nextId(s, 'pl'), riderId, month, startsOn, endsOn, total: classes, used: 0, paid: !pending.length })
  // A pending charge follows the new plan (not while its receipt is being reviewed).
  for (const p of pending) if (p.receiptStatus !== 'review') Object.assign(p, { amount: planPrice(classes), meta: { ...p.meta, classes, month: plan && !free ? plan.month : month, start: startsOn } })
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
      // Only a plan or a start date that actually changed is assigned again.
      const classes = Number(r.planClasses) || null
      const planChanged = classes !== (rider.planClasses || null)
      const startChanged = Boolean(classes && r.planStart && r.planStart !== rider.planStart)
      if (planChanged || startChanged) {
        const res = setPlanIn(s, rider.id, classes, r.planStart || null)
        if (!res.ok) return res
      }
    }
    return { ok: true }
  })
}

function deleteFamily(familyId) {
  return mutate((s) => {
    const family = byId(s.families, familyId)
    if (!family) return fail('notFound')
    family.deletedAt = now()
    const riderIds = new Set(s.riders.filter((r) => r.familyId === familyId).map((r) => r.id))
    for (const b of s.bookings.filter((x) => riderIds.has(x.riderId) && x.status === 'booked' && x.date >= todayKey())) {
      const slot = byId(s.slots, b.slotId)
      if (slot && hoursUntil(b.date, slot.time) <= 0) continue
      Object.assign(b, { status: 'cancelled', cancelledAt: now() })
      releaseBooking(s, b)
    }
    return { ok: true }
  })
}

/** Block (paused: no sign-in, no bookings) or unblock. */
function setFamilyActive(familyId, active) {
  return mutate((s) => {
    const family = byId(s.families, familyId)
    if (!family) return fail('notFound')
    family.active = active
    family.deactivatedAt = active ? null : now()
    return { ok: true }
  })
}

/* ───────── Transfer receipts ───────── */
// The demo has no file storage: small receipts are kept in this browser, larger ones only for this visit.
const FILES_KEY = 'hipico.demo.receipts'
const receiptFiles = new Map(Object.entries((() => { try { return JSON.parse(localStorage.getItem(FILES_KEY)) || {} } catch { return {} } })()))
const keepFile = (id, file) => {
  receiptFiles.set(id, { url: URL.createObjectURL(file), type: file.type })
  if (file.size > 1.5 * 1024 * 1024) return
  const reader = new FileReader()
  reader.onload = () => {
    receiptFiles.set(id, { url: reader.result, type: file.type })
    try { localStorage.setItem(FILES_KEY, JSON.stringify(Object.fromEntries([...receiptFiles].filter(([, f]) => f.url.startsWith('data:'))))) } catch { /* full: keep for this visit */ }
  }
  reader.readAsDataURL(file)
}
const SAMPLE_RECEIPT = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
<rect width="360" height="520" rx="18" fill="#fff"/><rect width="360" height="84" rx="18" fill="#2E5339"/><rect y="60" width="360" height="24" fill="#2E5339"/>
<text x="24" y="50" font-family="Inter, sans-serif" font-size="20" font-weight="600" fill="#fff">Transferencia SPEI</text>
<g font-family="Inter, sans-serif" fill="#24211C"><text x="24" y="130" font-size="13" fill="#6E675C">Importe</text><text x="24" y="160" font-size="28" font-weight="700">$3,000.00 MXN</text>
<text x="24" y="210" font-size="13" fill="#6E675C">Concepto</text><text x="24" y="232" font-size="16">Anticipo campamento · Ximena</text>
<text x="24" y="280" font-size="13" fill="#6E675C">Beneficiario</text><text x="24" y="302" font-size="16">Hípico Riviera Maya</text>
<text x="24" y="350" font-size="13" fill="#6E675C">Estado</text><text x="24" y="372" font-size="16" fill="#7C9070" font-weight="600">Liquidada</text></g>
<text x="180" y="480" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4E7A5A">Comprobante de ejemplo · demo</text></svg>`)}`

export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf']
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024

function uploadReceipt(paymentId, file) {
  if (!file || file.size > RECEIPT_MAX_BYTES) return fail('fileTooBig')
  return mutate((s) => {
    const p = byId(s.payments, paymentId)
    if (!p || p.status !== 'pending' || p.familyId !== s.session?.familyId) return fail('notFound')
    keepFile(paymentId, file)
    Object.assign(p, { receiptPath: `demo/${paymentId}/${file.name}`, receiptStatus: 'review', receiptNote: null, receiptUploadedAt: now(), reviewedAt: null })
    return { ok: true }
  })
}

function reviewReceipt(paymentId, approve, note) {
  return mutate((s) => {
    const p = byId(s.payments, paymentId)
    if (!p || p.status !== 'pending' || p.receiptStatus !== 'review') return fail('notFound')
    if (approve) {
      Object.assign(p, { status: 'paid', method: 'transfer', paidAt: now(), receiptStatus: 'approved', receiptNote: null, reviewedAt: now() })
      applyPlanPayment(s, p)
    } else {
      if (!note?.trim()) return fail('noteRequired')
      Object.assign(p, { receiptStatus: 'rejected', receiptNote: note.trim().slice(0, 280), reviewedAt: now() })
    }
    return { ok: true }
  })
}

const NO_PREVIEW = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect width="360" height="240" rx="18" fill="#F6F2E9"/><text x="180" y="112" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" fill="#2E5339">Comprobante recibido</text><text x="180" y="138" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" fill="#6E675C">Vista previa no disponible en la demo</text></svg>')}`

function receiptUrl(payment) {
  if (payment.receiptPath === 'sample') return { ok: true, url: SAMPLE_RECEIPT, type: 'image/svg+xml' }
  const f = receiptFiles.get(payment.id)
  return { ok: true, url: f?.url || NO_PREVIEW, type: f?.type || 'image/svg+xml' }
}

function saveSettings(fields) {
  return mutate((s) => {
    const clabe = (fields.clabe || '').replace(/\s/g, '')
    if (clabe && !/^\d{18}$/.test(clabe)) return fail('badClabe')
    s.settings = { ...s.settings, bankName: fields.bankName?.trim() || null, accountHolder: fields.accountHolder?.trim() || null, clabe: clabe || null }
    return { ok: true }
  })
}

/* ───────── Schedule (management) ───────── */
const DISCIPLINES = ['basics', 'dressage', 'jumping', 'ponies']
const ARENAS = ['main', 'covered', 'jumping']

function saveSlot(slot) {
  return mutate((s) => {
    const row = {
      weekday: Number(slot.weekday), time: slot.time, duration: Number(slot.duration) || 60, discipline: slot.discipline,
      level: slot.level, instructorId: slot.instructorId, arena: slot.arena, capacity: Number(slot.capacity), active: slot.active !== false,
    }
    if (!(row.weekday >= 0 && row.weekday <= 6) || !/^[0-2]\d:[0-5]\d$/.test(row.time || '') || !DISCIPLINES.includes(row.discipline) ||
      !LEVELS.includes(row.level) || !byId(s.instructors, row.instructorId) || !ARENAS.includes(row.arena) || !(row.capacity > 0)) return fail('missing')
    const existing = slot.id && byId(s.slots, slot.id)
    if (existing) Object.assign(existing, row)
    else s.slots.push({ id: nextId(s, 's'), ...row })
    return { ok: true }
  })
}

function saveInstructor(i) {
  return mutate((s) => {
    if (!i.name?.trim()) return fail('missing')
    const existing = i.id && byId(s.instructors, i.id)
    const row = { name: i.name.trim(), specialty: i.specialty || null, active: i.active !== false }
    if (existing) Object.assign(existing, row)
    else s.instructors.push({ id: nextId(s, 'i'), ...row })
    return { ok: true }
  })
}

function saveHorse(h) {
  return mutate((s) => {
    const status = h.status || (h.type === 'boarded' ? 'boarded' : 'school')
    if (!h.name?.trim() || !HORSE_STATUSES.includes(status)) return fail('missing')
    const existing = h.id && byId(s.horses, h.id)
    const row = {
      name: h.name.trim(), status, type: status === 'boarded' ? 'boarded' : 'school',
      active: status === 'retired' ? false : h.active !== false,
      ownerFamilyId: status === 'boarded' ? h.ownerFamilyId || null : null,
      salePrice: h.salePrice === '' || h.salePrice == null ? null : Number(h.salePrice),
      age: h.age === '' || h.age == null ? null : Number(h.age),
      breed: h.breed?.trim() || null, level: h.level || null, description: h.description?.trim() || null,
      birthYear: h.birthYear === '' || h.birthYear == null ? null : Number(h.birthYear),
      sex: h.sex || null, coat: h.coat?.trim() || null,
      heightCm: h.heightCm === '' || h.heightCm == null ? null : Number(h.heightCm),
      photos: existing?.photos || [], // photos change only through upload / remove
    }
    if (existing) { Object.assign(existing, row); return { ok: true, id: existing.id } }
    const id = nextId(s, 'h')
    s.horses.push({ id, ...row })
    return { ok: true, id }
  })
}

/* ───────── Horse profile: daily ration and health ───────── */
function saveHorseCare({ horseId, feed = [], rationsPerDay, supplements, notes }) {
  return mutate((s) => {
    if (!byId(s.horses, horseId)) return fail('notFound')
    const lines = feed.filter((f) => f.type?.trim()).map((f) => ({ type: f.type.trim(), kg: Number(f.kg) || 0 }))
    s.horseCare ||= []
    const row = { horseId, feed: lines, rationsPerDay: Number(rationsPerDay) || null, supplements: supplements?.trim() || null, notes: notes?.trim() || null }
    const existing = s.horseCare.find((c) => c.horseId === horseId)
    if (existing) Object.assign(existing, row)
    else s.horseCare.push(row)
  })
}
function addHealth({ horseId, kind, doneOn, nextDue, note }) {
  return mutate((s) => {
    if (!byId(s.horses, horseId) || !HEALTH_KINDS.includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(doneOn || '')) return fail('missing')
    s.horseHealth ||= []
    s.horseHealth.push({ id: nextId(s, 'hh'), horseId, kind, doneOn, nextDue: nextDue || null, note: note?.trim() || null })
  })
}
function updateHealth({ id, doneOn, nextDue, note }) {
  return mutate((s) => {
    const row = (s.horseHealth || []).find((x) => x.id === id)
    if (!row) return fail('notFound')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doneOn || '')) return fail('missing')
    Object.assign(row, { doneOn, nextDue: nextDue || null, note: note?.trim() || null })
  })
}
function deleteHealth(id) {
  return mutate((s) => { s.horseHealth = (s.horseHealth || []).filter((x) => x.id !== id) })
}

/* ───────── Owner's panel: horses sold, payroll, expenses, modules ───────── */
function sellHorse({ horseId, price, buyer, date }) {
  return mutate((s) => {
    const horse = byId(s.horses, horseId)
    if (!horse) return fail('notFound')
    if (!(Number(price) >= 0) || price === '') return fail('missing')
    s.horseSales ||= []
    s.horseSales.push({ id: nextId(s, 'hs'), horseId, soldOn: date || todayKey(), price: Math.round(Number(price)), buyer: buyer?.trim() || null })
    Object.assign(horse, { status: 'sold', active: false })
    return { ok: true }
  })
}
// Demo photos stay in this browser as small data URLs.
async function uploadHorsePhoto(horseId, file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return fail('fileType')
  if (file.size > 8 * 1024 * 1024) return fail('fileTooBig')
  const url = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file) })
  return mutate((s) => {
    const horse = byId(s.horses, horseId)
    if (!horse) return fail('notFound')
    horse.photos = [...(horse.photos || []), url].slice(0, 6)
  })
}
function removeHorsePhoto(horseId, path) {
  return mutate((s) => {
    const horse = byId(s.horses, horseId)
    if (!horse) return fail('notFound')
    horse.photos = (horse.photos || []).filter((p) => p !== path)
  })
}
const horsePhotoUrl = (path) => path

function saveEmployee(e) {
  return mutate((s) => {
    if (!e.name?.trim() || !(Number(e.salary) >= 0) || !['quincenal', 'mensual'].includes(e.frequency) || !/^\d{4}-\d{2}-\d{2}$/.test(e.nextPayDate || '')) return fail('missing')
    s.employees ||= []
    const existing = e.id && byId(s.employees, e.id)
    const row = { name: e.name.trim(), role: e.role || 'other', salary: Math.round(Number(e.salary)), frequency: e.frequency, nextPayDate: e.nextPayDate, workingDays: e.workingDays?.trim() || null, active: e.active !== false }
    if (existing) Object.assign(existing, row)
    else s.employees.push({ id: nextId(s, 'e'), ...row })
  })
}
function paySalary({ employeeId, amount, method, date }) {
  return mutate((s) => {
    const emp = byId(s.employees || [], employeeId)
    if (!emp) return fail('notFound')
    if (!(Number(amount) >= 0) || !['cash', 'transfer', 'card'].includes(method)) return fail('missing')
    s.salaryPayments ||= []
    s.salaryPayments.push({ id: nextId(s, 'sp'), employeeId, paidOn: date || todayKey(), amount: Math.round(Number(amount)), method, periodDate: emp.nextPayDate })
    emp.nextPayDate = nextPayAfter(emp.nextPayDate, emp.frequency)
  })
}
function saveExpense(x) {
  return mutate((s) => {
    if (!(Number(x.amount) > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(x.spentOn || '')) return fail('missing')
    s.expenses ||= []
    const row = { spentOn: x.spentOn, categoryId: x.categoryId || null, amount: Math.round(Number(x.amount)), note: x.note?.trim() || null }
    const existing = x.id && byId(s.expenses, x.id)
    if (existing) Object.assign(existing, row)
    else s.expenses.push({ id: nextId(s, 'x'), ...row })
  })
}
function deleteExpense(id) {
  return mutate((s) => { s.expenses = (s.expenses || []).filter((x) => x.id !== id) })
}
function saveCategory(c) {
  return mutate((s) => {
    const name = c.name?.trim()
    if (!name) return fail('missing')
    s.expenseCategories ||= []
    if (s.expenseCategories.some((x) => x.id !== c.id && x.name.toLowerCase() === name.toLowerCase())) return fail('duplicate')
    const existing = c.id && byId(s.expenseCategories, c.id)
    if (existing) Object.assign(existing, { name, active: c.active !== false })
    else s.expenseCategories.push({ id: nextId(s, 'ec'), name, active: true })
  })
}
function saveModules(mods) {
  return mutate((s) => {
    s.settings = { ...s.settings, modulePayroll: Boolean(mods.modulePayroll), moduleProfit: Boolean(mods.moduleProfit), moduleSales: Boolean(mods.moduleSales) }
  })
}

function cancelClassDate(slotId, date, reason) {
  return mutate((s) => {
    const slot = byId(s.slots, slotId)
    if (!slot || !slotRuns(slot, date)) return fail('notFound')
    if (date < todayKey()) return fail('past')
    s.cancellations ||= []
    const existing = s.cancellations.find((c) => c.slotId === slotId && c.date === date)
    if (existing) { if (!existing.replacedBy) existing.reason = reason || null }
    else s.cancellations.push({ id: nextId(s, 'sc'), slotId, date, reason: reason || null, createdAt: now() })
    let cancelled = 0
    for (const b of s.bookings.filter((x) => x.slotId === slotId && x.date === date && x.status === 'booked')) {
      Object.assign(b, { status: 'cancelled', cancelledByClub: true, cancelledAt: now() })
      releaseBooking(s, b)
      cancelled++
    }
    return { ok: true, cancelled }
  })
}

function reopenClassDate(slotId, date) {
  return mutate((s) => {
    s.cancellations = (s.cancellations || []).filter((c) => !(c.slotId === slotId && c.date === date && !c.replacedBy))
    return { ok: true }
  })
}

/* ───────── Schedule in bulk: many classes at once, series edits, ranges, closed days ───────── */
const TIME_RE = /^[0-2]\d:[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SLOT_FIELDS = ['time', 'duration', 'discipline', 'level', 'instructorId', 'arena', 'capacity', 'active']
function slotWith(slot, fields) {
  const out = { ...slot }
  for (const k of SLOT_FIELDS) if (fields[k] !== undefined && fields[k] !== null && fields[k] !== '') out[k] = ['duration', 'capacity'].includes(k) ? Number(fields[k]) : fields[k]
  return out
}
const seriesRows = (s, slot) => {
  const series = slot.seriesId || slot.id
  return s.slots.filter((x) => x.id === slot.id || x.id === series || x.seriesId === series)
}
const moveBookings = (s, fromId, toId, test) => s.bookings.forEach((b) => { if (b.slotId === fromId && test(b.date)) b.slotId = toId })

function createClasses({ weekdays = [], times = [], duration, discipline, level, instructorId, arena, capacity, startsOn, endsOn }) {
  return mutate((s) => {
    const days = [...new Set(weekdays.map(Number))].filter((d) => d >= 0 && d <= 6 && !(s.settings?.closedWeekdays ?? [1]).includes(d))
    const hours = [...new Set(times)].filter((x) => TIME_RE.test(x || ''))
    if (!days.length || !hours.length || !DISCIPLINES.includes(discipline) || !LEVELS.includes(level) || !byId(s.instructors, instructorId) ||
      !ARENAS.includes(arena) || !(Number(capacity) > 0) || !DATE_RE.test(startsOn || '') || (endsOn && (!DATE_RE.test(endsOn) || endsOn < startsOn))) return fail('missing')
    let count = 0
    for (const weekday of days) {
      for (const time of hours) {
        s.slots.push({ id: nextId(s, 's'), weekday, time, duration: Number(duration) || 60, discipline, level, instructorId, arena,
          capacity: Number(capacity), active: true, startsOn, endsOn: endsOn || null, seriesId: null })
        count++
      }
    }
    return { ok: true, count }
  })
}

function editClass({ slotId, date, scope, fields = {} }) {
  return mutate((s) => {
    const v = byId(s.slots, slotId)
    if (!v || !['one', 'following', 'all'].includes(scope)) return fail('notFound')
    if (scope !== 'all') {
      if (!date || !slotRuns(v, date)) return fail('notFound')
      if (date < todayKey()) return fail('past')
    }
    if (isOneOff(v) && scope === 'one') scope = 'all'
    const series = v.seriesId || v.id
    const today = todayKey()
    // Families booked from today on see "Cambio de horario" when the time changes.
    const markMoved = (fromTime, slotIdNow, test) => {
      for (const b of s.bookings) {
        if (b.slotId === slotIdNow && b.status === 'booked' && b.date >= today && test(b.date)) b.movedFrom ||= fromTime
      }
    }
    const apply = (row, test = () => true) => {
      const before = row.time
      Object.assign(row, slotWith(row, fields))
      if (row.time !== before) markMoved(before, row.id, test)
    }
    if (scope === 'all') { seriesRows(s, v).forEach((row) => apply(row)); return { ok: true, id: v.id } }
    s.cancellations ||= []
    if (scope === 'one') {
      if (s.cancellations.some((c) => c.slotId === v.id && c.date === date)) return fail('classCancelled')
      const n = { ...slotWith(v, fields), id: nextId(s, 's'), startsOn: date, endsOn: date, seriesId: null }
      s.slots.push(n)
      s.cancellations.push({ id: nextId(s, 'sc'), slotId: v.id, date, reason: null, replacedBy: n.id, createdAt: now() })
      moveBookings(s, v.id, n.id, (d) => d === date)
      if (n.time !== v.time) markMoved(v.time, n.id, (d) => d === date)
      return { ok: true, id: n.id }
    }
    if (fields.end) {
      let cancelled = 0
      for (const seg of seriesRows(s, v).filter((x) => !x.endsOn || x.endsOn >= date)) {
        for (const b of s.bookings.filter((x) => x.slotId === seg.id && x.date >= date && x.status === 'booked')) {
          Object.assign(b, { status: 'cancelled', cancelledByClub: true, cancelledAt: now() })
          releaseBooking(s, b)
          cancelled++
        }
        seg.endsOn = addDays(date, -1)
      }
      return { ok: true, cancelled }
    }
    seriesRows(s, v).filter((x) => x.id !== v.id && x.startsOn && x.startsOn > date).forEach((row) => apply(row))
    if (v.startsOn && v.startsOn >= date) { apply(v); return { ok: true, id: v.id } }
    const n = { ...slotWith(v, fields), id: nextId(s, 's'), startsOn: date, endsOn: v.endsOn || null, seriesId: series }
    s.slots.push(n)
    Object.assign(v, { endsOn: addDays(date, -1), seriesId: series })
    moveBookings(s, v.id, n.id, (d) => d >= date)
    if (n.time !== v.time) markMoved(v.time, n.id, (d) => d >= date)
    s.cancellations.forEach((c) => { if (c.slotId === v.id && c.date >= date) c.slotId = n.id })
    return { ok: true, id: n.id }
  })
}

const eachDay = (from, to, fn) => { for (let d = from; d <= to; d = addDays(d, 1)) fn(d) }

function cancelRangeIn(s, from, to, reason) {
  let classes = 0
  let bookings = 0
  s.cancellations ||= []
  eachDay(from, to, (d) => {
    for (const slot of s.slots.filter((x) => x.active !== false && slotRuns(x, d) && !s.cancellations.some((c) => c.slotId === x.id && c.date === d))) {
      s.cancellations.push({ id: nextId(s, 'sc'), slotId: slot.id, date: d, reason: reason?.trim() || null, createdAt: now() })
      for (const b of s.bookings.filter((x) => x.slotId === slot.id && x.date === d && x.status === 'booked')) {
        Object.assign(b, { status: 'cancelled', cancelledByClub: true, cancelledAt: now() })
        releaseBooking(s, b)
        bookings++
      }
      classes++
    }
  })
  return { classes, bookings }
}

function cancelClassRange({ from, to, reason }) {
  return mutate((s) => {
    if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '') || to < from || daysBetween(from, to) > 366) return fail('missing')
    if (from < todayKey()) return fail('past')
    return { ok: true, ...cancelRangeIn(s, from, to, reason) }
  })
}

function copyWeek({ week, from, to }) {
  return mutate((s) => {
    if (!DATE_RE.test(week || '') || !DATE_RE.test(from || '') || !DATE_RE.test(to || '') || to < from) return fail('missing')
    let created = 0
    let skipped = 0
    const source = []
    eachDay(week, addDays(week, 6), (d) => {
      source.push(...s.slots.filter((x) => x.active !== false && slotRuns(x, d) &&
        !(s.cancellations || []).some((c) => c.slotId === x.id && c.date === d && c.replacedBy)))
    })
    for (const sl of source.sort((a, b) => a.time.localeCompare(b.time))) {
      const taken = s.slots.some((x) => x.active !== false && x.weekday === sl.weekday && x.time === sl.time && x.arena === sl.arena &&
        (x.startsOn || '0000-00-00') <= to && (x.endsOn || '9999-12-31') >= from)
      if (taken) { skipped++; continue }
      s.slots.push({ ...sl, id: nextId(s, 's'), startsOn: from, endsOn: to, seriesId: null })
      created++
    }
    return { ok: true, created, skipped }
  })
}

function saveReminderSettings({ remindersOn, boardingDueDay, reminderNote }) {
  return mutate((s) => {
    const day = Math.round(Number(boardingDueDay))
    if (!(day >= 1 && day <= 28)) return fail('missing')
    s.settings = { ...s.settings, remindersOn: Boolean(remindersOn), boardingDueDay: day, reminderNote: reminderNote?.trim() || null }
  })
}
function saveClosedWeekdays(weekdays) {
  return mutate((s) => {
    s.settings = { ...s.settings, closedWeekdays: [...new Set(weekdays.map(Number))].filter((d) => d >= 0 && d <= 6).sort() }
    return { ok: true, ...cancelClosedWeekdays(s) }
  })
}
/** Same as set_closed_weekdays(): booked classes from now on, on a closed weekday, are cancelled by the club. */
function cancelClosedWeekdays(s) {
  const closed = closedWeekdays(s)
  const today = todayKey()
  let bookings = 0
  const classes = new Set()
  for (const b of s.bookings.filter((x) => x.status === 'booked' && x.date >= today && closed.includes(weekdayOf(x.date)))) {
    const slot = byId(s.slots, b.slotId)
    if (!slot || hoursUntil(b.date, slot.time) <= 0) continue
    Object.assign(b, { status: 'cancelled', cancelledByClub: true, cancelledAt: now() })
    releaseBooking(s, b)
    classes.add(`${b.slotId}|${b.date}`)
    bookings++
  }
  return { classes: classes.size, bookings }
}
function addClosedDates({ from, to, note }) {
  return mutate((s) => {
    if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '') || to < from || daysBetween(from, to) > 366) return fail('missing')
    const today = todayKey()
    const res = to >= today ? cancelRangeIn(s, from < today ? today : from, to, note) : { classes: 0, bookings: 0 }
    s.closedDates ||= []
    const id = nextId(s, 'cd')
    s.closedDates.push({ id, startsOn: from, endsOn: to, note: note?.trim() || null })
    return { ok: true, id, ...res }
  })
}
function deleteClosedDate(id) {
  return mutate((s) => { s.closedDates = (s.closedDates || []).filter((c) => c.id !== id) })
}

function markClassAttended(slotId, date) {
  return mutate((s) => {
    let marked = 0
    for (const b of s.bookings.filter((x) => x.slotId === slotId && x.date === date && x.status === 'booked')) {
      b.status = 'attended'
      marked++
    }
    return { ok: true, marked }
  })
}

export const actions = {
  login, logout, resetDemo, bookClass, cancelBooking, markAttendance, choosePlan, changePlan,
  requestBoardingPayment, markPaid, registerCamp, bookRental,
  createFamily, saveFamily, setFamilyActive, deleteFamily,
  selfSignup: () => fail('notFound'),
  setPassword, resume: liveOnly, signInPassword: liveOnly,
  uploadReceipt, reviewReceipt, receiptUrl, saveSettings, bookSingleClass, saveClassPrices,
  saveHorseCare, addHealth, updateHealth, deleteHealth,
  sellHorse, uploadHorsePhoto, removeHorsePhoto, horsePhotoUrl, saveEmployee, paySalary, saveExpense, deleteExpense, saveCategory, saveModules,
  saveSlot, saveInstructor, saveHorse, cancelClassDate, reopenClassDate, markClassAttended,
  createClasses, editClass, cancelClassRange, copyWeek, saveClosedWeekdays, saveReminderSettings, addClosedDates, deleteClosedDate,
}
