// The club website is one page (/ in Spanish, /en in English) with numbered sections.
export const SECTIONS = [
  { key: 'services', n: '01', es: 'que-hacemos', en: 'what-we-do' },
  { key: 'competitions', n: '02', es: 'competencias', en: 'show-jumping' },
  { key: 'therapy', n: '03', es: 'equinoterapia', en: 'equine-therapy' },
  { key: 'boarding', n: '04', es: 'pension', en: 'boarding' },
  { key: 'community', n: '05', es: 'comunidad', en: 'community' },
  { key: 'app', n: '06', es: 'app', en: 'app' },
  { key: 'visit', n: '07', es: 'visitanos', en: 'visit' },
]
// Places inside a section that old links point to.
export const ANCHORS = { sales: { es: 'caballos', en: 'horses-for-sale' } }

export const sectionId = (key, lang) => (SECTIONS.find((s) => s.key === key) || ANCHORS[key])?.[lang] || ''
export const homePath = (lang) => (lang === 'en' ? '/en' : '/')

// The old separate pages (and printed links to them) land on their section.
export const OLD_PAGES = {
  es: { clases: 'services', pension: 'boarding', competencias: 'competitions', equinoterapia: 'therapy', eventos: 'community', caballos: 'sales', contacto: 'visit' },
  en: { lessons: 'services', boarding: 'boarding', 'show-jumping': 'competitions', 'equine-therapy': 'therapy', 'events-and-camps': 'community', 'horses-for-sale': 'sales', contact: 'visit' },
}

/** The same place in the other language: a section id in one language → its id in the other. */
export function translateHash(hash, from, to) {
  const id = hash.replace(/^#/, '')
  const s = [...SECTIONS, ...Object.values(ANCHORS)].find((x) => x[from] === id)
  return s ? `#${s[to]}` : ''
}

/** The language a website address asks for (the app and the download page keep the visitor's own). */
export function siteLangOf(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/en' || path.startsWith('/en/')) return 'en'
  if (OLD_PAGES.es[path.slice(1)]) return 'es'
  return null
}
