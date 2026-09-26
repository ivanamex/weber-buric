import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { BrandLogo, Logo } from '../components/Logo.jsx'
import { LangToggle } from '../components/LangToggle.jsx'
import { Icon } from '../components/Icon.jsx'
import { waLink } from '../components/ui.jsx'
import { InstallButtons } from '../components/Install.jsx'
import { HeroHorse, RunningHorse } from '../components/TextHorse.jsx'

const STEPS = [
  { key: 'book', icon: 'calendar' },
  { key: 'plan', icon: 'horseshoe' },
  { key: 'pay', icon: 'phone' },
]
const FEATURES = [
  { key: 'bookings', icon: 'calendar' },
  { key: 'plans', icon: 'horseshoe' },
  { key: 'boarding', icon: 'barn' },
  { key: 'rental', icon: 'horseHead' },
  { key: 'events', icon: 'balloons' },
  { key: 'admin', icon: 'chart' },
]

const SCREEN_W = 430 // the preview renders at a Pro Max width, then scales to the drawn screen
const STATUS_H = 54 // room for the island, like the real status bar

/** A phone drawn in CSS with the real app inside (the demo, in memory), touring Inicio → Reservar → Mi plan. */
function LivePhone() {
  const { t, lang } = useI18n()
  const screen = useRef(null)
  const [scale, setScale] = useState(0.62)
  useEffect(() => {
    const el = screen.current
    const ro = new ResizeObserver(() => setScale(el.clientWidth / SCREEN_W))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div className="iphone-stage" aria-hidden="true">
      <div className="iphone">
        <span className="iphone__key iphone__key--action" />
        <span className="iphone__key iphone__key--up" />
        <span className="iphone__key iphone__key--down" />
        <span className="iphone__key iphone__key--power" />
        <div className="iphone__screen" ref={screen}>
          <iframe key={lang} src="/vista" title={t('landing.phoneTitle')} tabIndex={-1} loading="lazy"
            style={{ width: SCREEN_W, height: SCREEN_W * 2.17 - STATUS_H, top: STATUS_H * scale, transform: `scale(${scale})` }} />
          <span className="iphone__island" />
        </div>
      </div>
      <span className="iphone__ground" />
    </div>
  )
}

/** Fade sections in as they scroll into view, with a slight parallax on the photos (desktop). */
function useScrollEffects(root) {
  useEffect(() => {
    const el = root.current
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const items = el.querySelectorAll('[data-reveal]')
    if (reduced || !('IntersectionObserver' in window)) return undefined
    el.classList.add('has-reveal')
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
    }), { rootMargin: '0px 0px -10% 0px' })
    items.forEach((i) => io.observe(i))

    const parallax = [...el.querySelectorAll('[data-parallax]')]
    const desktop = window.matchMedia('(hover: hover) and (min-width: 900px)')
    let raf = 0
    const move = () => {
      raf = 0
      const vh = window.innerHeight
      for (const p of parallax) {
        const r = p.parentElement.getBoundingClientRect()
        if (r.bottom < 0 || r.top > vh) continue
        const off = desktop.matches ? (r.top + r.height / 2 - vh / 2) * -0.08 : 0
        p.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(move) }
    window.addEventListener('scroll', onScroll, { passive: true })
    move()
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [root])
}

export default function Landing() {
  const { t } = useI18n()
  const root = useRef(null)
  const hero = useRef(null)
  useScrollEffects(root)
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="landing" ref={root}>
      <header className="lheader">
        <div className="container lheader__inner">
          <Link to="/" aria-label="Hípico Riviera Maya"><Logo light compact /></Link>
          <div className="lheader__actions">
            <LangToggle light />
            <Link to="/app" className="btn btn--accent btn--sm lheader__cta">{t('landing.openShort')}</Link>
          </div>
        </div>
      </header>

      <section className="hero" ref={hero}>
        <div className="hero__bg" aria-hidden="true">
          <svg viewBox="0 0 600 600"><circle cx="300" cy="300" r="220" /><circle cx="300" cy="300" r="290" /></svg>
        </div>
        <div className="container hero__inner">
          <div className="hero__head">
            <BrandLogo variant="white" height={64} className="hero__logo" />
            <p className="eyebrow eyebrow--accent">{t('landing.eyebrow')}</p>
            <h1>{t('landing.headline')}</h1>
          </div>
          <div className="hero__phone"><LivePhone /></div>
          <div className="hero__body">
            <p className="hero__sub">{t('landing.subline')}</p>
            <div className="hero__ctas">
              <Link to="/app" className="btn btn--accent btn--lg">
                {t('landing.ctaOpen')} <Icon name="arrowRight" size={20} className="nudge" />
              </Link>
              <button type="button" className="btn btn--ghost-light btn--lg" onClick={() => scrollTo('features')}>
                {t('landing.ctaHow')} <Icon name="arrowDown" size={20} className="nudge nudge--down" />
              </button>
            </div>
            <p className="hero__note"><Icon name="shield" size={16} /> {t('landing.heroNote')}</p>
            <div className="hero__horse"><HeroHorse glowArea={hero} /></div>
          </div>
        </div>
      </section>

      <section className="lsection" id="how">
        <div className="container" data-reveal>
          <p className="eyebrow">{t('landing.how.eyebrow')}</p>
          <h2 className="lsection__title">{t('landing.how.title')}</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.key} className="step">
                <span className="step__num">{i + 1}</span>
                <span className="step__icon"><Icon name={s.icon} size={28} /></span>
                <h3>{t(`landing.how.${s.key}.title`)}</h3>
                <p>{t(`landing.how.${s.key}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pband" aria-label={t('landing.band')}>
        <img className="pband__img" data-parallax src="/img/horse-beach-running.webp" alt="" loading="lazy" decoding="async" width="1000" height="652" />
        <p className="pband__line" data-reveal>{t('landing.band')}</p>
      </section>

      <section className="lsection lsection--tint" id="features">
        <div className="container" data-reveal>
          <p className="eyebrow">{t('landing.features.eyebrow')}</p>
          <h2 className="lsection__title">{t('landing.features.title')}</h2>
          <div className="features">
            {FEATURES.map((f) => (
              <article key={f.key} className="feature">
                <span className="feature__icon"><Icon name={f.icon} size={28} /></span>
                <h3>{t(`landing.features.${f.key}.title`)}</h3>
                <p>{t(`landing.features.${f.key}.text`)}</p>
              </article>
            ))}
          </div>
          <div className="center">
            <Link to="/app" className="btn btn--primary btn--lg">{t('landing.ctaOpen')} <Icon name="arrowRight" size={20} className="nudge" /></Link>
          </div>
        </div>
      </section>

      <section className="lsection lsection--photo" id="install">
        <div className="install__photo" aria-hidden="true">
          <img data-parallax src="/img/horse-beach-standing.webp" alt="" loading="lazy" decoding="async" width="290" height="300" />
        </div>
        <div className="container install" data-reveal>
          <div>
            <p className="eyebrow">{t('landing.install.eyebrow')}</p>
            <h2 className="lsection__title">{t('landing.install.title')}</h2>
            <p className="lsection__lead">{t('landing.install.text')}</p>
          </div>
          <InstallButtons />
        </div>
      </section>

      <section className="closing">
        <RunningHorse />
        <div className="container closing__inner" data-reveal>
          <h2>{t('landing.closing.title')}</h2>
          <p>{t('landing.closing.text')}</p>
          <InstallButtons className="dlbtns--row" />
          <Link to="/app" className="slink slink--light">{t('landing.closing.open')} <Icon name="arrowRight" size={16} className="nudge" /></Link>
        </div>
      </section>

      <footer className="lfooter">
        <div className="container lfooter__inner">
          <div>
            <Logo light />
            <p className="lfooter__place">{t('landing.footer.place')}</p>
            <p className="lfooter__links">
              <Link to="/app" className="slink slink--light">{t('landing.openShort')}</Link>
              <Link to="/demo" className="slink slink--light">{t('landing.footer.seeDemo')}</Link>
            </p>
          </div>
          <div className="lfooter__actions">
            <a className="btn btn--whatsapp" href={waLink(t('landing.footer.waText'))} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={20} /> WhatsApp
            </a>
            <LangToggle light />
          </div>
        </div>
        <div className="container lfooter__legal">
          <span>© {new Date().getFullYear()} Hípico Riviera Maya</span>
          <span>{t('landing.footer.demo')}</span>
        </div>
      </footer>
    </div>
  )
}
