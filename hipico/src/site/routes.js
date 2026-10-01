// The club website's pages, with their address in each language.
export const PAGES = [
  { key: 'home', es: '', en: '' },
  { key: 'classes', es: 'clases', en: 'lessons' },
  { key: 'boarding', es: 'pension', en: 'boarding' },
  { key: 'competitions', es: 'competencias', en: 'show-jumping' },
  { key: 'therapy', es: 'equinoterapia', en: 'equine-therapy' },
  { key: 'events', es: 'eventos', en: 'events-and-camps' },
  { key: 'sales', es: 'caballos', en: 'horses-for-sale' },
  { key: 'contact', es: 'contacto', en: 'contact' },
]

export const pagePath = (key, lang) => {
  const slug = PAGES.find((p) => p.key === key)?.[lang] ?? ''
  if (lang === 'en') return slug ? `/en/${slug}` : '/en'
  return `/${slug}`
}

/** Which site page an address is, or null when it's not part of the website. */
export function pageAt(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/en' || path.startsWith('/en/')) {
    const slug = path.slice(4)
    const p = PAGES.find((x) => x.en === slug)
    return p ? { key: p.key, lang: 'en' } : null
  }
  const p = PAGES.find((x) => `/${x.es}` === path)
  return p ? { key: p.key, lang: 'es' } : null
}

/** The language a website address asks for (the app and the download page keep the visitor's own). */
export const siteLangOf = (pathname) => {
  const p = pageAt(pathname)
  return p && pathname !== '/' ? p.lang : null
}
