// All club dates live in America/Cancun (UTC-05:00 all year — Quintana Roo has no DST).
export const TZ = 'America/Cancun'
const OFFSET = '-05:00'

const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

/** 'YYYY-MM-DD' for an instant, in club time. */
export const dateKeyOf = (d = new Date()) => keyFmt.format(d)
export const todayKey = () => dateKeyOf(new Date())
export const monthKeyOf = (key) => key.slice(0, 7)
export const currentMonthKey = () => monthKeyOf(todayKey())

const utcNoon = (key) => new Date(`${String(key).slice(0, 10)}T12:00:00Z`)
export const addDays = (key, n) => {
  const d = utcNoon(key)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
/** 0 = Sunday … 6 = Saturday */
export const weekdayOf = (key) => utcNoon(key).getUTCDay()
/** Monday of the week containing key. */
export const weekStart = (key) => addDays(key, -((weekdayOf(key) + 6) % 7))

export const monthEnd = (monthKey) => {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10)
}
export const nextMonthKey = (monthKey) => monthKeyOf(addDays(monthEnd(monthKey), 1))

/** Instant for a club-local date + 'HH:MM'. */
export const toInstant = (key, time) => new Date(`${key}T${time}:00${OFFSET}`)
export const hoursUntil = (key, time) => (toInstant(key, time).getTime() - Date.now()) / 36e5

/** Date object suitable for Intl formatting with timeZone 'UTC' (no day shifting). */
export const displayDate = (key) => utcNoon(key)

/** anchor + k months, clamped to the month's last day and always counted from the anchor (31 Jan → 28 Feb → 31 Mar). */
export function addMonthsFrom(anchor, k) {
  const [y, m, d] = anchor.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1 + k, 1, 12))
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate()
  first.setUTCDate(Math.min(d, last))
  return first.toISOString().slice(0, 10)
}
/** The plan period (date to date) that contains `date`, for a plan that started on `anchor`. Same rule as period_of() in the database. */
export function periodOf(anchor, date) {
  let k = (Number(date.slice(0, 4)) - Number(anchor.slice(0, 4))) * 12 + Number(date.slice(5, 7)) - Number(anchor.slice(5, 7))
  if (addMonthsFrom(anchor, k) > date) k -= 1
  if (k < 0) k = 0
  return { startsOn: addMonthsFrom(anchor, k), endsOn: addDays(addMonthsFrom(anchor, k + 1), -1) }
}
/** Whole days from a to b (b − a). */
export const daysBetween = (a, b) => Math.round((utcNoon(b) - utcNoon(a)) / 864e5)
