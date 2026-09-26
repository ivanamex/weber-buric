// All club dates live in America/Cancun (UTC-05:00 all year — Quintana Roo has no DST).
export const TZ = 'America/Cancun'
const OFFSET = '-05:00'

const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

/** 'YYYY-MM-DD' for an instant, in club time. */
export const dateKeyOf = (d = new Date()) => keyFmt.format(d)
export const todayKey = () => dateKeyOf(new Date())
export const monthKeyOf = (key) => key.slice(0, 7)
export const currentMonthKey = () => monthKeyOf(todayKey())

const utcNoon = (key) => new Date(`${key}T12:00:00Z`)
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
