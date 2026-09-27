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
let lastRole = null
let viaLink = false
// "Salir" on a family's phone keeps the account on this device, so coming back is one tap ("Continuar como…").
const PAUSED_KEY = 'hipico.paused'
const readPaused = () => { try { return localStorage.getItem(PAUSED_KEY) } catch { return null } }
const setPaused = (email) => { try { if (email) localStorage.setItem(PAUSED_KEY, email); else localStorage.removeItem(PAUSED_KEY) } catch { /* ignore */ } }
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
    // Signed in by tapping the email link (the session arrives in the address): used for the password nudge.
    viaLink = /access_token=|token_hash=/.test(window.location.hash + window.location.search)
    const { createClient } = await import('@supabase/supabase-js')
    sb = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } })
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') keepStorage()
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(() => refresh(), 0)
    })
    // Pick up changes made on other devices when the app comes back to the foreground.
    const onFocus = () => { if (document.visibilityState === 'visible' && Date.now() - lastLoad > 15000) refresh() }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
  }
  await refresh()
}

// Ask the browser not to clear saved data, so the sign-in lasts on this device.
function keepStorage() {
  try { navigator.storage?.persist?.().catch(() => {}) } catch { /* ignore */ }
}

export function refresh() {
  loading ||= load().finally(() => { loading = null })
  return loading
}

async function load() {
  try {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) return publish({ ...empty, status: 'signedOut' })
    const paused = readPaused()
    if (paused && paused === session.user?.email) return publish({ ...empty, status: 'paused', email: paused })
    if (paused) setPaused(null)
    const who = await sb.rpc('whoami')
    if (who.error) throw who.error
    const email = who.data.email
    if (!who.data.is_admin && !who.data.family_id) {
      // Deactivated family → blocked. Unknown email → short sign-up form (never a duplicate).
      const status = who.data.family_deleted ? 'deleted' : who.data.family_inactive ? 'inactive' : 'signup'
      return publish({ ...empty, status, email })
    }

    const today = todayKey()
    const from = addDays(today, -62)
    const to = addDays(today, 62)
    const [prices, instructors, horses, families, riders, slots, plans, bookings, payments, events, campRegistrations, rentals, counts, camp, settings, cancellations, planChanges] =
      await Promise.all([
        sb.from('prices').select('key, amount'),
        sb.from('instructors').select('*'),
        sb.from('horses').select('*').order('name'),
        sb.from('families').select('*').order('name'),
        sb.from('riders').select('*').order('name'),
        sb.from('slots').select('*').order('time'),
        sb.from('plans').select('*'),
        sb.from('bookings').select('*').gte('date', from).lte('date', to),
        sb.from('payments').select('*').order('created_at'),
        sb.from('events').select('*').eq('active', true).order('start_date'),
        sb.from('camp_registrations').select('*'),
        sb.from('rentals').select('*').gte('date', from),
        sb.rpc('slot_counts', { p_from: from, p_to: to }),
        sb.rpc('camp_counts'),
        sb.from('club_settings').select('*').maybeSingle(),
        sb.from('slot_cancellations').select('*').gte('date', from),
        sb.from('plan_changes').select('*').order('created_at', { ascending: false }),
      ])
    applyPrices(Object.fromEntries(rows(prices).map((p) => [p.key, p.amount])))
    const riderRows = rows(riders)
    lastRiders = riderRows
    lastLoad = Date.now()
    lastRole = who.data.is_admin ? 'admin' : 'family'
    publish({
      ...empty,
      status: 'ready',
      email,
      hasPassword: Boolean(session.user?.user_metadata?.has_password),
      viaLink,
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
      // Bank details for transfers (missing before the database update → placeholders).
      settings: settings.data ? camel(settings.data) : {},
      cancellations: cancellations.error ? [] : rows(cancellations),
      planChanges: planChanges.error ? [] : rows(planChanges),
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

/** Supabase auth errors → the app's message codes (errors.* in the dictionaries). */
function authCode(error) {
  const code = error?.code || ''
  const msg = (error?.message || '').toLowerCase()
  if (error?.status === 429 || code.includes('rate_limit') || msg.includes('rate limit') || msg.includes('seconds')) return 'tooMany'
  if (code === 'otp_expired' || msg.includes('expired')) return 'codeExpired'
  if (code === 'email_address_invalid' || code === 'validation_failed' || msg.includes('invalid email')) return 'badEmail'
  if (code === 'otp_disabled' || code === 'signup_disabled') return 'signupClosed'
  if (msg.includes('token') || msg.includes('otp') || code.includes('invalid')) return 'badCode'
  if (msg.includes('fetch') || msg.includes('network')) return 'network'
  return 'authFailed'
}

async function sendLink(email) {
  try {
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/app`, shouldCreateUser: true },
    })
    if (error) { console.error(error); return { ok: false, code: authCode(error) } }
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, code: 'network' }
  }
}
async function verifyCode(email, token) {
  try {
    const { error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: 'email' })
    if (error) { console.error(error); return { ok: false, code: authCode(error) === 'codeExpired' ? 'codeExpired' : authCode(error) === 'tooMany' ? 'tooMany' : 'badCode' } }
    setPaused(null)
    await refresh()
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, code: 'network' }
  }
}
async function logout({ full = false } = {}) {
  const { data: { session } } = await sb.auth.getSession()
  if (!full && session && lastRole === 'family') {
    setPaused(session.user.email)
    publish({ ...empty, status: 'paused', email: session.user.email })
    return { ok: true }
  }
  setPaused(null)
  await sb.auth.signOut({ scope: 'local' }) // this device only; other phones stay signed in
  publish({ ...empty, status: 'signedOut' })
  return { ok: true }
}
async function resume() {
  setPaused(null)
  await refresh()
  return { ok: true }
}
async function signInPassword(email, password) {
  try {
    const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) {
      console.error(error)
      const code = authCode(error)
      return { ok: false, code: code === 'tooMany' || code === 'network' ? code : 'badPassword' }
    }
    setPaused(null)
    await refresh()
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, code: 'network' }
  }
}
async function setPassword(password) {
  if (!password || password.length < 8) return { ok: false, code: 'shortPassword' }
  try {
    const { error } = await sb.auth.updateUser({ password, data: { has_password: true } })
    if (error) {
      console.error(error)
      if (error.code === 'same_password') return { ok: true }
      if (error.code === 'weak_password') return { ok: false, code: 'weakPassword' }
      if (error.code === 'reauthentication_needed') return { ok: false, code: 'reauthNeeded' }
      return { ok: false, code: authCode(error) === 'network' ? 'network' : 'authFailed' }
    }
    await refresh()
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, code: 'network' }
  }
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
const selfSignup = (p) => call('self_signup', { p: familyPayload(p) })

async function saveFamily({ familyId, fields, riders = [], planStart }) {
  try {
    const email = (fields.email || '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !fields.contact?.trim()) return { ok: false, code: 'missing' }
    const { error } = await sb.from('families').update({
      name: fields.name?.trim(), contact: fields.contact.trim(), email, phone: fields.phone?.trim() || null,
    }).eq('id', familyId)
    if (error) return { ok: false, code: error.code === '23505' ? 'emailExists' : 'network' }
    const current = getRiders()
    // The start date goes with the plans being changed; if no plan changes, it moves every current plan.
    const startOnly = !riders.some((r) => r.id && (Number(r.planClasses) || null) !== (current.find((x) => x.id === r.id)?.planClasses || null))
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
      const prev = current.find((x) => x.id === id)
      const after = Number(r.planClasses) || null
      if ((prev?.planClasses || null) !== after || (startOnly && after && planStart && planStart !== prev?.planStart)) {
        const res = await rpcOnly('admin_set_plan', { p_rider: id, p_classes: after, p_start: planStart || null })
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

async function deleteFamily(familyId) {
  const { error } = await sb.from('families').update({ deleted_at: new Date().toISOString() }).eq('id', familyId)
  if (error) return { ok: false, code: 'network' }
  await refresh()
  return { ok: true }
}

async function setFamilyActive(familyId, active) {
  const { error } = await sb.from('families').update({ active, deactivated_at: active ? null : new Date().toISOString() }).eq('id', familyId)
  if (error) return { ok: false, code: 'network' }
  await refresh()
  return { ok: true }
}

/* ───────── Schedule (management) ───────── */
const SLOT_COLS = { weekday: 'weekday', time: 'time', duration: 'duration', discipline: 'discipline', level: 'level', instructorId: 'instructor_id', arena: 'arena', capacity: 'capacity', active: 'active' }
async function upsertRow(table, id, row) {
  const res = id ? await sb.from(table).update(row).eq('id', id) : await sb.from(table).insert(row)
  if (res.error) { console.error(`[hipico] ${table} save failed`, res.error); return { ok: false, code: 'missing' } }
  await refresh()
  return { ok: true }
}
const saveSlot = (slot) => upsertRow('slots', slot.id,
  Object.fromEntries(Object.entries(SLOT_COLS).filter(([k]) => slot[k] !== undefined).map(([k, col]) => [col, ['weekday', 'duration', 'capacity'].includes(k) ? Number(slot[k]) : slot[k]])))
const saveInstructor = (i) => upsertRow('instructors', i.id, { name: i.name?.trim(), specialty: i.specialty || null, active: i.active !== false })
const saveHorse = (h) => upsertRow('horses', h.id, {
  name: h.name?.trim(), type: h.type, active: h.active !== false, owner_family_id: h.type === 'boarded' ? h.ownerFamilyId || null : null,
})
const cancelClassDate = (slotId, date, reason) => call('cancel_class_date', { p_slot: slotId, p_date: date, p_reason: reason || null })
const reopenClassDate = (slotId, date) => call('reopen_class_date', { p_slot: slotId, p_date: date })
const markClassAttended = (slotId, date) => call('mark_class_attended', { p_slot: slotId, p_date: date })

/* ───────── Transfer receipts (private bucket: <family>/<payment>/<file>) ───────── */
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf' }
const typeOf = (file) => file.type || ({ heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' })[file.name.split('.').pop().toLowerCase()] || ''

async function uploadReceipt(paymentId, file) {
  const type = typeOf(file)
  if (!file || !EXT[type]) return { ok: false, code: 'fileType' }
  if (file.size > 10 * 1024 * 1024) return { ok: false, code: 'fileTooBig' }
  const payment = (await sb.from('payments').select('id, family_id').eq('id', paymentId).maybeSingle()).data
  if (!payment) return { ok: false, code: 'notFound' }
  const path = `${payment.family_id}/${payment.id}/${Date.now()}.${EXT[type]}`
  const up = await sb.storage.from('receipts').upload(path, file, { contentType: type, upsert: false })
  if (up.error) { console.error('[hipico] upload failed', up.error); return { ok: false, code: 'uploadFailed' } }
  return call('submit_receipt', { p_payment: paymentId, p_path: path })
}

const reviewReceipt = (paymentId, approve, note) =>
  call('review_receipt', { p_payment: paymentId, p_approve: approve, p_note: note || null })

async function receiptUrl(payment) {
  if (!payment.receiptPath) return { ok: false, code: 'notFound' }
  const { data, error } = await sb.storage.from('receipts').createSignedUrl(payment.receiptPath, 600)
  if (error) return { ok: false, code: 'network' }
  const ext = payment.receiptPath.split('.').pop().toLowerCase()
  const type = Object.keys(EXT).find((k) => EXT[k] === ext) || ''
  return { ok: true, url: data.signedUrl, type }
}

async function saveSettings(fields) {
  const clabe = (fields.clabe || '').replace(/\s/g, '')
  if (clabe && !/^\d{18}$/.test(clabe)) return { ok: false, code: 'badClabe' }
  const { error } = await sb.from('club_settings').update({
    bank_name: fields.bankName?.trim() || null, account_holder: fields.accountHolder?.trim() || null,
    clabe: clabe || null, updated_at: new Date().toISOString(),
  }).eq('id', 1)
  if (error) return { ok: false, code: 'network' }
  await refresh()
  return { ok: true }
}

export const actions = {
  sendLink,
  verifyCode,
  logout,
  resume,
  signInPassword,
  setPassword,
  login: async () => ({ ok: false, code: 'notFound' }),
  resetDemo: async () => ({ ok: false, code: 'notFound' }),
  bookClass: ({ riderId, slotId, date }) => call('book_class', { p_rider: riderId, p_slot: slotId, p_date: date }),
  cancelBooking: (id) => call('cancel_booking', { p_booking: id }),
  markAttendance: (id, status) => call('mark_attendance', { p_booking: id, p_status: status }),
  choosePlan: ({ riderId, classes, month }) => call('choose_plan', { p_rider: riderId, p_classes: classes, p_month: month }),
  changePlan: ({ riderId, classes }) => call('change_plan', { p_rider: riderId, p_classes: classes }),
  requestBoardingPayment: (familyId) => call('request_boarding_payment', { p_family: familyId ?? null }),
  markPaid: (id, method) => call('mark_paid', { p_payment: id, p_method: method }),
  registerCamp: ({ eventId, riderId }) => call('register_camp', { p_event: eventId, p_rider: riderId }),
  bookRental: ({ date, time, hours, horseId }) => call('book_rental', { p_date: date, p_time: time, p_hours: hours, p_horse: horseId }),
  createFamily,
  saveFamily,
  setFamilyActive,
  deleteFamily,
  selfSignup,
  uploadReceipt,
  saveSlot,
  saveInstructor,
  saveHorse,
  cancelClassDate,
  reopenClassDate,
  markClassAttended,
  reviewReceipt,
  receiptUrl,
  saveSettings,
}
