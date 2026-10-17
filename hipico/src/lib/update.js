// New versions reach every phone, even an installed app that only ever resumes from the background:
//   • the service worker is registered here (not by an injected script) and checked for updates at start, every 30 min
//     and whenever the app comes back to the screen (at most once a minute);
//   • a new version found right after the app came back (or opened) is applied at once with a reload, if nothing is in
//     progress (no sheet, payment window, lightbox, cart, unsaved form); otherwise the app shows a small bar
//     ("Hay una versión nueva" · Actualizar) and the website waits for the next page change;
//   • a screen whose files are gone (an old version asking for them) reloads once instead of staying blank.
import { useEffect, useSyncExternalStore } from 'react'
import { isScrollLocked } from './scrollLock.js'

export const BUILD = typeof __BUILD__ === 'undefined' ? '' : __BUILD__ // "17 oct · 10:40", Cancún time
export const BUILD_ID = typeof __BUILD_ID__ === 'undefined' ? 'dev' : __BUILD_ID__
const CHECK_EVERY = 30 * 60 * 1000
const MIN_GAP = 60 * 1000
const FRESH = 20 * 1000 // a version found this soon after coming back counts as "on return"

let updateSW = null
let registration = null
let waiting = false
let lastCheck = 0
let lastReturn = Date.now()
let hiddenSince = null
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const dirty = new Set() // forms with unsaved changes (EditKit registers them)
const working = new Set() // uploads or payments running

export const markDirty = (id, on) => { if (on) dirty.add(id); else dirty.delete(id) }
export const markWorking = (id, on) => { if (on) working.add(id); else working.delete(id) }

const SHEETS = '.isheet, .paydlg, .ssheet2, .shopdlg, .cartdrw, .confirm, .ssheet, .slightbox, [role="dialog"], [role="alertdialog"]'
/** Nothing open or half done: a reload now loses nothing. */
export const idle = () => !dirty.size && !working.size && !isScrollLocked() && !document.querySelector(SHEETS)
const inApp = () => /^\/(app|demo)(\/|$)/.test(window.location.pathname)
const inPreview = () => /^\/vista(\/|$)/.test(window.location.pathname)

let applying = false
/** The waiting worker takes over, then the page reloads (once) into the new version. */
function apply() {
  if (applying || !('serviceWorker' in navigator)) return
  applying = true
  waiting = false
  emit()
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  const take = (n = 0) => {
    const w = registration?.waiting
    if (w) w.postMessage({ type: 'SKIP_WAITING' })
    else if (n < 40) setTimeout(() => take(n + 1), 250)
    else updateSW?.(true)
  }
  take()
}

async function check(force = false) {
  if (!registration || (!force && Date.now() - lastCheck < MIN_GAP)) return
  lastCheck = Date.now()
  try { await registration.update() } catch { /* offline: next time */ }
}

function onReturn() {
  if (hiddenSince === null && Date.now() - lastReturn < MIN_GAP) return
  hiddenSince = null
  lastReturn = Date.now()
  if (waiting && idle()) { apply(); return }
  check()
}

let started = false
export async function startUpdates() {
  if (started || typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  started = true
  const { registerSW } = await import('virtual:pwa-register')
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      waiting = true
      // Found just after opening or coming back: take it now if nothing is in progress (no bar).
      if (Date.now() - lastReturn < FRESH && idle()) { apply(); return }
      emit()
    },
    onRegisteredSW(_url, reg) {
      registration = reg || null
      check(true)
      setInterval(() => check(), CHECK_EVERY)
    },
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenSince = Date.now()
    else onReturn()
  })
  window.addEventListener('pageshow', (e) => { if (e.persisted) { hiddenSince = hiddenSince ?? Date.now(); onReturn() } })
  window.addEventListener('focus', () => { if (hiddenSince !== null) onReturn() })
}

/** "Buscar actualizaciones": check now; resolves 'updating' (it reloads) or 'latest'. */
export async function checkNow() {
  if (!registration) return 'latest'
  await check(true)
  if (!waiting) {
    // An update found by this check installs in a moment.
    for (let i = 0; i < 16 && !waiting && (registration.installing || registration.waiting); i++) await new Promise((r) => setTimeout(r, 500))
  }
  if (waiting || registration.waiting) { apply(); return 'updating' }
  return 'latest'
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
/** True while a new version waits for a safe moment. */
export const useUpdateWaiting = () => useSyncExternalStore(subscribe, () => waiting, () => false)

/** The website: a waiting version is applied on the next page change (or when the tab comes back, see onReturn). */
export function useApplyOnRouteChange(pathname) {
  useEffect(() => { if (waiting && !inApp() && idle()) apply() }, [pathname])
}

/** The app's bar: hidden on the website and inside the phone preview. */
export function useShowUpdateBar() {
  return useUpdateWaiting() && inApp() && !inPreview()
}
export const applyUpdate = apply

/* ───────── A screen whose files are gone: reload once, then say so ───────── */
const GUARD = 'hipico.reloadedFor'
/** True the first time for this build (a second failure shows the error card instead of reloading again). */
function takeGuard() {
  try {
    if (sessionStorage.getItem(GUARD) === BUILD_ID) return false
    sessionStorage.setItem(GUARD, BUILD_ID)
    return true
  } catch { return false }
}
/** Reload once per build; false when this build already tried. */
export function reloadOnce() {
  if (!takeGuard()) return false
  window.location.reload()
  return true
}
/** A file of this version is gone: switch straight to the new version if there is one, else reload once. */
async function recover() {
  try {
    if (registration && !registration.waiting) {
      await registration.update()
      for (let i = 0; i < 16 && !registration.waiting; i++) await new Promise((r) => setTimeout(r, 250))
    }
  } catch { /* offline */ }
  if (registration?.waiting) {
    if (!takeGuard()) return false
    apply()
    return true
  }
  return reloadOnce()
}
/** React.lazy that recovers when the screen's file can't be loaded (an old version after a deploy). */
export const lazyRetry = (load) => () => load().catch(async (err) => {
  if (await recover()) return new Promise(() => {}) // the page is reloading
  throw err
})
export function watchChunkErrors() {
  window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); recover() })
}
