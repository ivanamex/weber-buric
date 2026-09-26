// Live mode: Supabase. Reads go through Row Level Security (each family sees only its own rows);
// every change goes through a database function in supabase/schema.sql, which enforces the rules.
import { applyPrices } from './prices.js'
import { todayKey, addDays } from '../lib/time.js'

const URL = __SUPABASE_URL__
const KEY = __SUPABASE_KEY__
export const LIVE_CONFIGURED = Boolean(URL && KEY)

let sb = null
let publish = () => {}
let loading = null
let lastLoad = 0
let lastRiders = []
const getRiders = () => lastRiders

const empty = {
  mode: 'live', session: null, instructors: [], horses: [], families: [], riders: [], slots: [], plans: [],
  bookings: [], payments: [], events: [], campRegistrations: [], rentals: [], slotCounts: {}, campCounts: {},
}

// snake_case → camelCase, one level deep (jsonb `meta` is already camelCase).
const camel = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v]))
const rows = (res) => {
  if (res.error) throw res.error
  return (res.data || []).map(camel)
}

export async function activate(setState) {
  publish = setState
  if (!sb) {
    publish({ ...empty, status: 'loading' })
    const { createClient } = await import('@supabase/supabase-js')
    sb = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } })
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(() => refresh(), 0)
    })
    // Pick up changes made on other devices when the app comes back to the foreground.
    const onFocus = () => { if (document.visibilityState === 'visible' && Date.now() - lastLoad > 15000) refresh() }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
  }
  await refresh()
}

export function refresh() {
  loading ||= load().finally(() => { loading = null })
  return loading
}

async function load() {
  try {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) return publish({ ...empty, status: 'signedOut' })
    const who = await sb.rpc('whoami')
    if (who.error) throw who.error
    const email = who.data.email
    if (!who.data.is_admin && !who.data.family_id) {
      // Deactivated family → blocked. Unknown email → short sign-up form (never a duplicate).
      return publish({ ...empty, status: who.data.family_inactive ? 'inactive' : 'signup', email })
    }

    const today = todayKey()
    const from = addDays(today, -62)
    const to = addDays(today, 62)
    const [prices, instructors, horses, families, riders, slots, plans, bookings, payments, events, campRegistrations, rentals, counts, camp] =
      await Promise.all([
        sb.from('prices').select('key, amount'),
        sb.from('instructors').select('*'),
        sb.from('horses').select('*').order('name'),
        sb.from('families').select('*').order('name'),
        sb.from('riders').select('*').order('name'),
        sb.from('slots').select('*').eq('active', true),
        sb.from('plans').select('*'),
        sb.from('bookings').select('*').gte('date', from).lte('date', to),
        sb.from('payments').select('*').order('created_at'),
        sb.from('events').select('*').eq('active', true).order('start_date'),
        sb.from('camp_registrations').select('*'),
        sb.from('rentals').select('*').gte('date', from),
        sb.rpc('slot_counts', { p_from: from, p_to: to }),
        sb.rpc('camp_counts'),
      ])
    applyPrices(Object.fromEntries(rows(prices).map((p) => [p.key, p.amount])))
    const riderRows = rows(riders)
    lastRiders = riderRows
    lastLoad = Date.now()
    publish({
      ...empty,
      status: 'ready',
      email,
      session: { role: who.data.is_admin ? 'admin' : 'family', familyId: who.data.family_id, email },
      instructors: rows(instructors),
      horses: rows(horses),
      families: rows(families),
      riders: riderRows,
      slots: rows(slots),
      plans: rows(plans),
      bookings: rows(bookings),
      payments: rows(payments),
      events: rows(events),
      campRegistrations: rows(campRegistrations),
      rentals: rows(rentals),
      slotCounts: Object.fromEntries(rows(counts).map((c) => [`${c.slotId}|${c.date}`, c.taken])),
      campCounts: Object.fromEntries(rows(camp).map((c) => [c.eventId, c.taken])),
    })
  } catch (err) {
    console.error('[hipico] load failed', err)
    publish({ ...empty, status: 'error' })
  }
}

/** Call a database function, then reload so every screen shows the new state. */
async function call(fn, args) {
  try {
    const { data, error } = await sb.rpc(fn, args)
    if (error) throw error
    await refresh()
    return data?.ok ? { ...data, ok: true } : { ok: false, code: data?.code || 'network' }
  } catch (err) {
    console.error(`[hipico] ${fn} failed`, err)
    return { ok: false, code: 'network' }
  }
}

async function sendLink(email) {
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/app`, shouldCreateUser: true },
  })
  if (error) { console.error(error); return { ok: false, code: error.status === 429 ? 'tooMany' : 'network' } }
  return { ok: true }
}
async function verifyCode(email, token) {
  const { error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: 'email' })
  if (error) { console.error(error); return { ok: false, code: 'badCode' } }
  await refresh()
  return { ok: true }
}
async function logout() {
  await sb.auth.signOut()
  publish({ ...empty, status: 'signedOut' })
  return { ok: true }
}

/** Call a function without reloading (used when several changes are saved together). */
async function rpcOnly(fn, args) {
  const { data, error } = await sb.rpc(fn, args)
  if (error) { console.error(`[hipico] ${fn} failed`, error); return { ok: false, code: 'network' } }
  return data?.ok ? { ...data, ok: true } : { ok: false, code: data?.code || 'network' }
}

const familyPayload = (p) => ({
  name: p.name || '', contact: p.contact || '', email: p.email || '', phone: p.phone || '',
  plan: p.plan ? Number(p.plan) : null, start: p.start || null,
  riders: (p.riders || []).filter((r) => r.name?.trim()).map((r) => ({
    name: r.name.trim(), level: r.level, age: r.age ? Number(r.age) : null, plan: r.plan ? Number(r.plan) : null,
  })),
})

const createFamily = (p) => call('admin_create_family', { p: familyPayload(p) })
const importFamilies = (list) => call('admin_import_families', { p: list.map(familyPayload) })
const selfSignup = (p) => call('self_signup', { p: familyPayload(p) })

async function saveFamily({ familyId, fields, riders = [] }) {
  try {
    const email = (fields.email || '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !fields.contact?.trim()) return { ok: false, code: 'missing' }
    const { error } = await sb.from('families').update({
      name: fields.name?.trim(), contact: fields.contact.trim(), email, phone: fields.phone?.trim() || null,
    }).eq('id', familyId)
    if (error) return { ok: false, code: error.code === '23505' ? 'emailExists' : 'network' }
    const current = getRiders()
    for (const r of riders) {
      if (!r.name?.trim() || !r.level) return { ok: false, code: 'missing' }
      let id = r.id
      const row = { name: r.name.trim(), level: r.level, age: r.age ? Number(r.age) : null, active: r.active !== false }
      if (id) {
        const res = await sb.from('riders').update(row).eq('id', id)
        if (res.error) return { ok: false, code: 'network' }
      } else {
        const res = await sb.from('riders').insert({ ...row, family_id: familyId }).select('id').single()
        if (res.error) return { ok: false, code: 'network' }
        id = res.data.id
      }
      const before = current.find((x) => x.id === id)?.planClasses || null
      const after = Number(r.planClasses) || null
      if (before !== after) {
        const res = await rpcOnly('admin_set_plan', { p_rider: id, p_classes: after })
        if (!res.ok) { await refresh(); return res }
      }
    }
    await refresh()
    return { ok: true }
  } catch (err) {
    console.error('[hipico] saveFamily failed', err)
    return { ok: false, code: 'network' }
  }
}

async function setFamilyActive(familyId, active) {
  const { error } = await sb.from('families').update({ active, deactivated_at: active ? null : new Date().toISOString() }).eq('id', familyId)
  if (error) return { ok: false, code: 'network' }
  await refresh()
  return { ok: true }
}

export const actions = {
  sendLink,
  verifyCode,
  logout,
  login: async () => ({ ok: false, code: 'notFound' }),
  resetDemo: async () => ({ ok: false, code: 'notFound' }),
  bookClass: ({ riderId, slotId, date }) => call('book_class', { p_rider: riderId, p_slot: slotId, p_date: date }),
  cancelBooking: (id) => call('cancel_booking', { p_booking: id }),
  markAttendance: (id, status) => call('mark_attendance', { p_booking: id, p_status: status }),
  choosePlan: ({ riderId, classes, month }) => call('choose_plan', { p_rider: riderId, p_classes: classes, p_month: month }),
  requestBoardingPayment: (familyId) => call('request_boarding_payment', { p_family: familyId ?? null }),
  markPaid: (id, method) => call('mark_paid', { p_payment: id, p_method: method }),
  registerCamp: ({ eventId, riderId }) => call('register_camp', { p_event: eventId, p_rider: riderId }),
  bookRental: ({ date, time, hours, horseId }) => call('book_rental', { p_date: date, p_time: time, p_hours: hours, p_horse: horseId }),
  createFamily,
  importFamilies,
  saveFamily,
  setFamilyActive,
  selfSignup,
}
