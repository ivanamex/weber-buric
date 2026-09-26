import { useEffect, useState } from 'react'

// Chrome/Android fires `beforeinstallprompt` once, early. Keep it so a button can open the native dialog later.
let deferred = null
let installedNow = false
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

export function captureInstallPrompt() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify() })
  window.addEventListener('appinstalled', () => { deferred = null; installedNow = true; notify() })
}

/** Opens the native install dialog. Resolves 'accepted', 'dismissed' or 'unavailable'. */
export async function promptInstall() {
  if (!deferred) return 'unavailable'
  const e = deferred
  deferred = null
  notify()
  try {
    await e.prompt()
    const { outcome } = await e.userChoice
    return outcome
  } catch {
    return 'unavailable'
  }
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return installedNow || window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

const IN_APP = [
  [/WhatsApp/i, 'WhatsApp'],
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'],
  [/GmailApp|Gmail/i, 'Gmail'],
  [/GSA\//i, 'Google'],
  [/Line\//i, 'LINE'],
  [/Twitter/i, 'X'],
  [/TikTok|musical_ly|BytedanceWebview/i, 'TikTok'],
  [/Messenger/i, 'Messenger'],
]

/** Which phone, which browser, and whether we're inside another app's built-in browser. */
export function detectDevice(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  const iPadOS = /Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1
  const ios = /iPhone|iPad|iPod/.test(ua) || iPadOS
  const android = /Android/.test(ua)
  const known = IN_APP.find(([re]) => re.test(ua))
  const webview = android && /; wv\)/.test(ua)
  const inApp = known ? known[1] : webview ? '' : null
  const safari = ios && !inApp && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return { platform: ios ? 'ios' : android ? 'android' : 'desktop', inApp, safari, iPad: iPadOS || /iPad/.test(ua) }
}

/** Re-renders when the install dialog becomes available or the app gets installed. */
export function useInstallState() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const fn = () => setTick((n) => n + 1)
    listeners.add(fn)
    const mq = window.matchMedia?.('(display-mode: standalone)')
    mq?.addEventListener?.('change', fn)
    return () => { listeners.delete(fn); mq?.removeEventListener?.('change', fn) }
  }, [])
  return { canPrompt: !!deferred, standalone: isStandalone() }
}
