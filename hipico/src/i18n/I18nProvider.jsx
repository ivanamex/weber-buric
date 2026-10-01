import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import es from './es.json'
import en from './en.json'
import { CURRENCY } from '../data/prices.js'
import { displayDate, TZ } from '../lib/time.js'
import { siteLangOf } from '../site/routes.js'

const DICTS = { es, en }
const LANG_KEY = 'hipico.lang'
const LOCALES = { es: 'es-MX', en: 'en-US' }
const I18nContext = createContext(null)

const readLang = () => {
  const fromSite = typeof window === 'undefined' ? null : siteLangOf(window.location.pathname) // a website page's address sets its language
  if (fromSite) return fromSite
  try { const l = localStorage.getItem(LANG_KEY); if (l === 'es' || l === 'en') return l } catch { /* ignore */ }
  return 'es'
}
const lookup = (dict, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), dict)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readLang)

  useEffect(() => {
    document.documentElement.lang = lang
    try { localStorage.setItem(LANG_KEY, lang) } catch { /* ignore */ }
  }, [lang])

  const t = useCallback((key, vars) => {
    let s = lookup(DICTS[lang], key) ?? lookup(DICTS.es, key) ?? key
    if (typeof s === 'string' && vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m))
    return s
  }, [lang])

  const value = useMemo(() => {
    const locale = LOCALES[lang]
    const money = new Intl.NumberFormat(locale, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 })
    return {
      lang,
      setLang: setLangState,
      t,
      locale,
      fmtMoney: (n) => money.format(n),
      /** Format a 'YYYY-MM-DD' club date. */
      fmtDate: (key, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
        new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...opts }).format(displayDate(key)),
      /** Format an ISO instant in club time. */
      fmtInstant: (iso, opts = { day: 'numeric', month: 'short' }) =>
        new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts }).format(new Date(iso)),
      fmtTime: (hhmm) => (lang === 'en'
        ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(`2000-01-01T${hhmm}:00Z`))
        : hhmm),
    }
  }, [lang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
