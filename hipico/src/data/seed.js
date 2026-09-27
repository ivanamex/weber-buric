// Realistic demo data, generated relative to "today" so the demo always looks alive.
import { planPrice, BOARDING_MONTHLY, CAMP, RENTAL_PER_HOUR } from './prices.js'
import {
  todayKey, addDays, weekdayOf, monthKeyOf, monthEnd, nextMonthKey, hoursUntil, toInstant,
} from '../lib/time.js'

export const DEMO_FAMILY_ID = 'f1'

const instructors = [
  { id: 'i1', name: 'Mariana López', specialty: 'dressage' },
  { id: 'i2', name: 'Diego Ramírez', specialty: 'jumping' },
  { id: 'i3', name: 'Sofía Castillo', specialty: 'basics' },
]

const horses = [
  { id: 'h1', name: 'Canela', type: 'school' },
  { id: 'h2', name: 'Lucero', type: 'school' },
  { id: 'h3', name: 'Tornado', type: 'school' },
  { id: 'h4', name: 'Brisa', type: 'school' },
  { id: 'h5', name: 'Cacao', type: 'school', status: 'for_sale', salePrice: 165000, age: 9, breed: 'Cuarto de milla', level: 'intermediate', description: 'Noble y tranquilo, ideal para salto bajo y paseos.', photos: [] },
  { id: 'h6', name: 'Relámpago', type: 'boarded', ownerFamilyId: 'f1' },
  { id: 'h7', name: 'Zafiro', type: 'boarded', ownerFamilyId: 'f2' },
  { id: 'h8', name: 'Maya', type: 'boarded', ownerFamilyId: 'f3' },
]

const families = [
  { id: 'f1', email: 'paola.hernandez@ejemplo.com', name: 'Familia Hernández', contact: 'Paola Hernández', phone: '+52 984 111 2233' },
  { id: 'f2', email: 'jorge.martinez@ejemplo.com', name: 'Familia Martínez', contact: 'Jorge Martínez', phone: '+52 984 222 3344' },
  { id: 'f3', email: 'andrea.ortega@ejemplo.com', name: 'Familia Ortega', contact: 'Andrea Ortega', phone: '+52 984 333 4455' },
  { id: 'f4', email: 'luis.gonzalez@ejemplo.com', name: 'Familia González', contact: 'Luis González', phone: '+52 984 444 5566' },
  { id: 'f5', email: 'carmen.ruiz@ejemplo.com', name: 'Familia Ruiz', contact: 'Carmen Ruiz', phone: '+52 984 555 6677' },
  { id: 'f6', email: 'ricardo.navarro@ejemplo.com', name: 'Familia Navarro', contact: 'Ricardo Navarro', phone: '+52 984 666 7788' },
]

// level: beginner | intermediate | advanced. horseId = own boarded horse (optional)
const riders = [
  { id: 'r1', familyId: 'f1', name: 'Valentina', age: 11, level: 'intermediate', horseId: 'h6', plan: 8 },
  { id: 'r2', familyId: 'f1', name: 'Mateo', age: 8, level: 'beginner', plan: 4 },
  { id: 'r3', familyId: 'f2', name: 'Camila', age: 14, level: 'advanced', horseId: 'h7', plan: 12 },
  { id: 'r4', familyId: 'f3', name: 'Santiago', age: 10, level: 'beginner', plan: 4 },
  { id: 'r5', familyId: 'f3', name: 'Regina', age: 13, level: 'intermediate', horseId: 'h8', plan: 8 },
  { id: 'r6', familyId: 'f4', name: 'Emilia', age: 9, level: 'beginner', plan: 8 },
  { id: 'r7', familyId: 'f5', name: 'Leonardo', age: 15, level: 'advanced', plan: 8 },
  { id: 'r8', familyId: 'f5', name: 'Lucía', age: 16, level: 'advanced', plan: 12 },
  { id: 'r9', familyId: 'f6', name: 'Ximena', age: 12, level: 'intermediate', plan: 8 },
  { id: 'r10', familyId: 'f6', name: 'Andrés', age: 7, level: 'beginner', plan: 4 },
]

// Weekly template. weekday: 1 = Monday … 6 = Saturday.
// arena: main | covered | jumping · discipline: basics | dressage | jumping | ponies
const S = (id, weekday, time, discipline, level, instructorId, arena, capacity) =>
  ({ id, weekday, time, duration: 60, discipline, level, instructorId, arena, capacity })
const CAP = { beginner: 3, intermediate: 4, advanced: 3 }
const slots = [
  S('s1', 1, '16:00', 'basics', 'beginner', 'i3', 'covered', CAP.beginner),
  S('s2', 1, '17:00', 'dressage', 'intermediate', 'i1', 'main', CAP.intermediate),
  S('s3', 1, '18:00', 'jumping', 'advanced', 'i2', 'jumping', CAP.advanced),
  S('s4', 2, '16:00', 'basics', 'beginner', 'i3', 'covered', CAP.beginner),
  S('s5', 2, '17:00', 'jumping', 'intermediate', 'i2', 'jumping', CAP.intermediate),
  S('s6', 2, '18:00', 'dressage', 'advanced', 'i1', 'main', CAP.advanced),
  S('s7', 3, '16:00', 'basics', 'beginner', 'i3', 'covered', CAP.beginner),
  S('s8', 3, '17:00', 'dressage', 'intermediate', 'i1', 'main', CAP.intermediate),
  S('s9', 3, '18:00', 'jumping', 'advanced', 'i2', 'jumping', CAP.advanced),
  S('s10', 4, '16:00', 'basics', 'beginner', 'i3', 'covered', CAP.beginner),
  S('s11', 4, '17:00', 'jumping', 'intermediate', 'i2', 'jumping', CAP.intermediate),
  S('s12', 4, '18:00', 'dressage', 'advanced', 'i1', 'main', CAP.advanced),
  S('s13', 5, '16:00', 'basics', 'beginner', 'i3', 'covered', CAP.beginner),
  S('s14', 5, '17:00', 'dressage', 'intermediate', 'i1', 'main', CAP.intermediate),
  S('s15', 5, '18:00', 'jumping', 'advanced', 'i2', 'jumping', CAP.advanced),
  S('s16', 6, '09:00', 'ponies', 'beginner', 'i3', 'covered', CAP.beginner),
  S('s17', 6, '10:00', 'jumping', 'intermediate', 'i2', 'jumping', CAP.intermediate),
  S('s18', 6, '10:00', 'basics', 'beginner', 'i3', 'main', CAP.beginner),
  S('s19', 6, '11:00', 'dressage', 'advanced', 'i1', 'main', CAP.advanced),
  S('s20', 6, '12:00', 'jumping', 'advanced', 'i2', 'jumping', CAP.advanced),
]

// Deterministic PRNG so every reset produces the same-feeling demo.
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Owner's panel sample: staff, a few expenses, one horse for sale. */
function ownerSample(today) {
  const d = (n) => addDays(today, n)
  return {
    employees: [
      { id: 'e1', name: 'Mariana López', role: 'instructor', salary: 9000, frequency: 'quincenal', nextPayDate: d(3), active: true, workingDays: 'L–V' },
      { id: 'e2', name: 'Diego Ramírez', role: 'instructor', salary: 8500, frequency: 'quincenal', nextPayDate: d(3), active: true, workingDays: 'Ma–S' },
      { id: 'e3', name: 'Pedro Canul', role: 'groom', salary: 7200, frequency: 'mensual', nextPayDate: d(9), active: true, workingDays: 'L–S' },
      { id: 'e4', name: 'Rosa Pech', role: 'office', salary: 6800, frequency: 'mensual', nextPayDate: d(20), active: true, workingDays: 'L–V' },
    ],
    salaryPayments: [
      { id: 'sp1', employeeId: 'e1', paidOn: d(-12), amount: 9000, method: 'transfer' },
      { id: 'sp2', employeeId: 'e2', paidOn: d(-12), amount: 8500, method: 'transfer' },
      { id: 'sp3', employeeId: 'e3', paidOn: d(-21), amount: 7200, method: 'cash' },
    ],
    expenseCategories: ['Alimento', 'Veterinario', 'Herrero', 'Renta', 'Servicios', 'Otros'].map((name, i) => ({ id: `ec${i + 1}`, name, active: true })),
    expenses: [
      { id: 'x1', spentOn: d(-2), categoryId: 'ec1', amount: 14800, note: 'Pacas de alfalfa' },
      { id: 'x2', spentOn: d(-9), categoryId: 'ec3', amount: 3600, note: '6 caballos' },
      { id: 'x3', spentOn: d(-15), categoryId: 'ec4', amount: 18000, note: '' },
      { id: 'x4', spentOn: d(-33), categoryId: 'ec1', amount: 13900, note: '' },
      { id: 'x5', spentOn: d(-40), categoryId: 'ec2', amount: 2400, note: 'Vacunas' },
    ],
    horseSales: [],
  }
}

export function createSeed() {
  const rand = rng(20240611)
  const today = todayKey()
  const month = monthKeyOf(today)
  const nextMonth = nextMonthKey(month)
  const nearMonthEnd = monthEnd(month) <= addDays(today, 7)
  const monthStart = `${month}-01`
  const stamp = (key, time = '10:00') => toInstant(key, time).toISOString()
  let n = 0
  const id = (p) => `${p}${++n}`

  // Plans: every rider has a plan for the current month (and next month when it's close).
  const plans = []
  const payments = []
  for (const r of riders) {
    // Demo family renews next month themselves (shows the "pay at the club" flow).
    const months = nearMonthEnd && r.familyId !== DEMO_FAMILY_ID ? [month, nextMonth] : [month]
    for (const m of months) {
      const pending = r.id === 'r5' && m === month // Regina: renewal pending
      plans.push({ id: id('pl'), riderId: r.id, month: m, total: r.plan, used: 0, paid: !pending })
      payments.push({
        id: id('pay'), familyId: r.familyId, service: 'plan', amount: planPrice(r.plan),
        status: pending ? 'pending' : 'paid', method: pending ? null : (rand() < 0.5 ? 'cash' : 'transfer'),
        createdAt: stamp(m === month ? monthStart : today), paidAt: pending ? null : stamp(m === month ? addDays(monthStart, 1) : today),
        meta: { riderId: r.id, month: m, classes: r.plan },
      })
    }
  }
  const planFor = (riderId, m) => plans.find((p) => p.riderId === riderId && p.month === m)

  // Bookings across a window of -14 … +8 days.
  const bookings = []
  const occupied = {} // `${date}|${time}` -> Set(horseId)
  const book = (rider, slot, date, status) => {
    const plan = planFor(rider.id, monthKeyOf(date))
    if (!plan || plan.used >= plan.total) return false
    const clash = bookings.some((b) => b.riderId === rider.id && b.date === date && b.slotId === slot.id)
    const count = bookings.filter((b) => b.slotId === slot.id && b.date === date && b.status !== 'cancelled').length
    if (clash || count >= slot.capacity) return false
    const k = `${date}|${slot.time}`
    occupied[k] ||= new Set()
    let horseId = rider.horseId
    if (!horseId || occupied[k].has(horseId)) {
      horseId = horses.find((h) => h.type === 'school' && !occupied[k].has(h.id))?.id
    }
    if (!horseId) return false
    occupied[k].add(horseId)
    plan.used += 1
    bookings.push({ id: id('b'), slotId: slot.id, date, riderId: rider.id, horseId, status, createdAt: stamp(addDays(date, -3)) })
    return true
  }

  const demoRiders = riders.filter((r) => r.familyId === DEMO_FAMILY_ID)
  const others = riders.filter((r) => r.familyId !== DEMO_FAMILY_ID)

  // 1) One upcoming full class (Mateo sees it disabled): next beginner slot ≥ 2 days away.
  for (let d = 2; d <= 7; d++) {
    const date = addDays(today, d)
    const slot = slots.find((s) => s.weekday === weekdayOf(date) && s.level === 'beginner')
    if (!slot) continue
    const fillers = others.filter((r) => r.level === 'beginner')
    if (fillers.filter((r) => planFor(r.id, monthKeyOf(date))).length < slot.capacity) continue
    fillers.slice(0, slot.capacity).forEach((r) => book(r, slot, date, 'booked'))
    break
  }

  // 2) Demo family history: a few past classes this month + one upcoming class each.
  for (const r of demoRiders) {
    let past = r.id === 'r1' ? 4 : 1
    for (let d = -1; d >= -28 && past > 0; d--) {
      const date = addDays(today, d)
      if (date < monthStart) break
      const slot = slots.find((s) => s.weekday === weekdayOf(date) && s.level === r.level)
      if (slot && book(r, slot, date, past === 2 && r.id === 'r1' ? 'noshow' : 'attended')) past--
    }
    for (let d = 1; d <= 8; d++) {
      const date = addDays(today, d)
      const slot = slots.find((s) => s.weekday === weekdayOf(date) && s.level === r.level)
      if (slot && hoursUntil(date, slot.time) > 24 && book(r, slot, date, 'booked')) break
    }
  }

  // 3) Everyone else: random attendance in the window.
  for (let d = -14; d <= 8; d++) {
    const date = addDays(today, d)
    for (const slot of slots.filter((s) => s.weekday === weekdayOf(date))) {
      const isPast = hoursUntil(date, slot.time) < 0
      const isToday = date === today
      for (const r of others.filter((o) => o.level === slot.level)) {
        const p = isToday ? 0.75 : 0.4
        if (rand() > p) continue
        const status = isPast && !isToday ? (rand() < 0.1 ? 'noshow' : 'attended') : 'booked'
        book(r, slot, date, status)
      }
    }
  }

  // Boarding (pensión): Martínez & Ortega paid this month; Hernández pending.
  const boardingPay = (familyId, horseId, status) => payments.push({
    id: id('pay'), familyId, service: 'boarding', amount: BOARDING_MONTHLY, status,
    method: status === 'paid' ? 'transfer' : null, createdAt: stamp(monthStart),
    paidAt: status === 'paid' ? stamp(addDays(monthStart, 2)) : null, meta: { horseId, month },
  })
  boardingPay('f1', 'h6', 'pending')
  boardingPay('f2', 'h7', 'paid')
  boardingPay('f3', 'h8', 'paid')

  // Summer camp + registrations (Camila paid, Ximena pending deposit).
  const events = [{
    id: 'e1', type: 'camp', startDate: `${Number(month.slice(0, 4)) + (month.slice(5) > '07' ? 1 : 0)}-07-06`,
    endDate: `${Number(month.slice(0, 4)) + (month.slice(5) > '07' ? 1 : 0)}-07-31`,
    ages: '6–15', capacity: 24, price: CAMP.price, deposit: CAMP.deposit,
  }]
  const campRegistrations = []
  for (const [riderId, familyId, status] of [['r3', 'f2', 'paid'], ['r9', 'f6', 'pending']]) {
    const pay = {
      id: id('pay'), familyId, service: 'camp', amount: CAMP.deposit, status,
      method: status === 'paid' ? 'cash' : null, createdAt: stamp(addDays(today, -5)),
      paidAt: status === 'paid' ? stamp(addDays(today, -4)) : null, meta: { riderId, eventId: 'e1' },
    }
    // Ximena's family already sent a transfer receipt, waiting for review in Cobros.
    if (status === 'pending') Object.assign(pay, { receiptPath: 'sample', receiptStatus: 'review', receiptUploadedAt: stamp(addDays(today, -1)) })
    payments.push(pay)
    campRegistrations.push({ id: id('cr'), eventId: 'e1', riderId, paymentId: pay.id, createdAt: pay.createdAt })
  }

  // A paid rental and a paid birthday party this month, for the income report.
  const rentals = [{ id: id('rt'), familyId: 'f5', date: addDays(today, -6), time: '09:00', hours: 2, horseId: 'h2', createdAt: stamp(addDays(today, -8)) }]
  payments.push({
    id: id('pay'), familyId: 'f5', service: 'rental', amount: RENTAL_PER_HOUR * 2, status: 'paid', method: 'cash',
    createdAt: stamp(addDays(today, -8)), paidAt: stamp(addDays(today, -6)), meta: { rentalId: rentals[0].id },
  })
  payments.push({
    id: id('pay'), familyId: 'f4', service: 'events', amount: 8500, status: 'paid', method: 'transfer',
    createdAt: stamp(monthStart), paidAt: stamp(addDays(monthStart, 3)), meta: { kind: 'birthday' },
  })

  return {
    version: 1,
    seededAt: new Date().toISOString(),
    session: null,
    instructors,
    horses,
    families: families.map((f) => ({ ...f, active: true })),
    riders: riders.map(({ plan, ...r }) => ({ ...r, active: true, planClasses: plan, planStart: monthStart })),
    slots,
    plans,
    bookings,
    payments,
    events,
    campRegistrations,
    rentals,
    // Bank details for transfers: empty until management fills them in (the app shows placeholders).
    settings: { bankName: null, accountHolder: null, clabe: null, modulePayroll: true, moduleProfit: true, moduleSales: true },
    ...ownerSample(today),
    cancellations: [], // single class dates cancelled by the club
    planChanges: [], // plan history: new / upgrade / downgrade
    nextId: n + 1,
  }
}
