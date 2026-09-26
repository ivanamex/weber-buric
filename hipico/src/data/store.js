// Single data-access module used by every screen.
//   • 'demo' mode: sample data in this browser (./demo.js) — used at /demo, and at /app until Supabase is set up.
//   • 'live' mode: Supabase (./live.js) — used at /app once the Supabase keys are configured.
// Both modes produce the same state shape; all actions are async and resolve to { ok, code?, … }.
import { useSyncExternalStore } from 'react'
import * as demo from './demo.js'
import * as live from './live.js'
import { resetPrices } from './prices.js'

export * from './queries.js'
export const LIVE_CONFIGURED = live.LIVE_CONFIGURED

let state = { mode: null, status: 'idle', session: null }
const listeners = new Set()
const setState = (next) => {
  if (active && next.mode !== active) return // a late update from the mode we just left
  state = next
  listeners.forEach((l) => l())
}

export const getState = () => state
export const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
export const useStore = () => useSyncExternalStore(subscribe, getState)

let active = null
/** Switch the data source. Called by the route layout for /app and /demo. */
export function activate(mode) {
  if (active === mode) return
  active = mode
  if (mode === 'live') live.activate(setState)
  else { resetPrices(); demo.activate(setState) }
}

const backend = () => (active === 'live' ? live.actions : demo.actions)
const act = (name) => async (...args) => backend()[name](...args)

export const login = act('login') // demo only: pick a role
export const sendLink = act('sendLink') // live only: email a login link + code
export const verifyCode = act('verifyCode') // live only
export const logout = act('logout')
export const resetDemo = act('resetDemo')
export const bookClass = act('bookClass')
export const cancelBooking = act('cancelBooking')
export const markAttendance = act('markAttendance')
export const choosePlan = act('choosePlan')
export const requestBoardingPayment = act('requestBoardingPayment')
export const markPaid = act('markPaid')
export const registerCamp = act('registerCamp')
export const bookRental = act('bookRental')
export const createFamily = act('createFamily') // management: family + riders + plan
export const importFamilies = act('importFamilies') // management: list from a CSV
export const saveFamily = act('saveFamily') // management: edit family, riders and plans
export const setFamilyActive = act('setFamilyActive') // management: deactivate / reactivate
export const selfSignup = act('selfSignup') // live only: a new family creates its own account
