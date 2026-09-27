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
/** Switch the data source. Called by the route layout for /app, /demo and the landing's phone preview. */
export function activate(mode) {
  if (active === mode) return
  active = mode
  if (mode === 'live') live.activate(setState)
  else { resetPrices(); demo.activate(setState, mode === 'preview') }
}

const backend = () => (active === 'live' ? live.actions : demo.actions)
const act = (name) => async (...args) => backend()[name](...args)

export const login = act('login') // demo only: pick a role
export const sendLink = act('sendLink') // live only: email a login link + code
export const verifyCode = act('verifyCode') // live only
export const logout = act('logout') // live, family: keeps the account on this phone; { full: true } signs out
export const resume = act('resume') // live: "Continuar como…" after Salir
export const signInPassword = act('signInPassword') // live: email + optional password
export const setPassword = act('setPassword') // family: create or change the optional password
export const resetDemo = act('resetDemo')
export const bookClass = act('bookClass')
export const bookSingleClass = act('bookSingleClass') // trial / single / extra, paid on its own
export const saveClassPrices = act('saveClassPrices') // management: Clase muestra, suelta, adicional
// Owner's panel (management only)
export const sellHorse = act('sellHorse')
export const uploadHorsePhoto = act('uploadHorsePhoto')
export const removeHorsePhoto = act('removeHorsePhoto')
export const horsePhotoUrl = (path) => backend().horsePhotoUrl(path) // synchronous: a public link
export const saveEmployee = act('saveEmployee')
export const paySalary = act('paySalary')
export const saveExpense = act('saveExpense')
export const deleteExpense = act('deleteExpense')
export const saveCategory = act('saveCategory')
export const saveModules = act('saveModules') // Nómina / Rentabilidad / Caballos en venta on or off
export const cancelBooking = act('cancelBooking')
export const markAttendance = act('markAttendance')
export const choosePlan = act('choosePlan')
export const changePlan = act('changePlan') // upgrade now (pay the difference) or downgrade from the next renewal
export const requestBoardingPayment = act('requestBoardingPayment')
export const markPaid = act('markPaid')
export const registerCamp = act('registerCamp')
export const bookRental = act('bookRental')
export const createFamily = act('createFamily') // management: family + riders + plan
export const saveFamily = act('saveFamily') // management: edit family, riders and plans
export const setFamilyActive = act('setFamilyActive') // management: block / unblock
export const deleteFamily = act('deleteFamily') // management: remove access, keep history
export const selfSignup = act('selfSignup') // live only: a new family creates its own account
export const uploadReceipt = act('uploadReceipt') // family: transfer receipt (photo or PDF) → "Por revisar"
export const reviewReceipt = act('reviewReceipt') // management: approve or reject with a note
export const receiptUrl = act('receiptUrl') // short-lived link to view a receipt
export const saveSettings = act('saveSettings') // management: bank details for transfers
export const saveSlot = act('saveSlot') // management: create / edit a weekly class, turn it on or off
export const saveInstructor = act('saveInstructor')
export const saveHorse = act('saveHorse') // school horses, and boarded horses with their owner family
export const cancelClassDate = act('cancelClassDate') // one date off: bookings return to the plan
export const reopenClassDate = act('reopenClassDate')
export const markClassAttended = act('markClassAttended') // "Todos vinieron"
