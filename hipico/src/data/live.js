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
    if (!who.data.is_admin && !who.data.family_id) return publish({ ...empty, status: 'noAccess', email })

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
    lastLoad = Date.now()
    publish({
      ...empty,
      status: 'ready',
      email,
      session: { role: who.data.is_admin ? 'admin' : 'family', familyId: who.data.family_id, email },
      instructors: rows(instructors),
      horses: rows(horses),
      families: rows(families),
      riders: rows(riders),
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

async function addFamily({ name, contact, email, phone }) {
  const clean = (email || '').trim().toLowerCase()
  if (!name?.trim() || !contact?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return { ok: false, code: 'missing' }
  const { error } = await sb.from('families').insert({ name: name.trim(), contact: contact.trim(), email: clean, phone: phone?.trim() || null })
  if (error) return { ok: false, code: error.code === '23505' ? 'emailExists' : 'network' }
  await refresh()
  return { ok: true }
}
async function addRider({ familyId, name, age, level }) {
  if (!familyId || !name?.trim() || !level) return { ok: false, code: 'missing' }
  const { error } = await sb.from('riders').insert({ family_id: familyId, name: name.trim(), age: Number(age) || null, level })
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
  addFamily,
  addRider,
}
