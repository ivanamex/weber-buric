import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { LivePhone } from '../components/LivePhone.jsx'
import { waLink } from '../components/ui.jsx'
import { todayKey } from '../lib/time.js'
import { AppButton } from './SiteLayout.jsx'
import { BigPhoto, ClubPhoto, Kinetic, Letters, ScrollWords, reducedMotion } from './motion.jsx'
import { sectionId } from './routes.js'
import { BIG, CONTACT, FIGURES, PHOTOS, TESTIMONIALS, mapDirections, mapEmbed } from './content.js'
import { planList, useSiteData } from './siteData.js'

const wa = (text) => ({ href: waLink(text), target: '_blank', rel: 'noopener noreferrer' })

/** A numbered section: the eyebrow ("01 — QUÉ HACEMOS") sticks to the left edge on desktop while it scrolls past. */
function Sec({ k, n, tone = 'light', className = '', bg = null, children }) {
  const { t, lang } = useI18n()
  return (
    <section id={sectionId(k, lang)} className={`sec sec--${tone} ${className}`} data-tone={tone === 'light' || tone === 'mesh' ? 'light' : 'dark'}
      aria-labelledby={`${k}-title`}>
      {bg}
      <div className="scontainer sec__grid">
        <p className="sec__eyebrow"><span>{n}</span> — {t(`site.nav.${k}`)}</p>
        <div className="sec__body">{children}</div>
      </div>
    </section>
  )
}

const Arrow = () => <span className="tile__arrow" aria-hidden="true"><SiteIcon name="arrowRight" size={22} /></span>

/** Pony Friday is the last Friday of each month: the next one from today. */
export function nextPonyFriday(today = todayKey()) {
  let [y, m] = today.split('-').map(Number)
  for (let i = 0; i < 3; i++) {
    const last = new Date(Date.UTC(y, m, 0))
    last.setUTCDate(last.getUTCDate() - ((last.getUTCDay() + 2) % 7))
    const key = last.toISOString().slice(0, 10)
    if (key >= today) return key
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return null
}

function Hero() {
  const { t } = useI18n()
  return (
    <section className="shero" data-tone="dark" aria-label={t('site.hero.label')}>
      <BigPhoto photo={BIG.hero} alt={t('site.alt.hero')} eager className="shero__img" />
      <div className="shero__scrim" aria-hidden="true" />
      <div className="scontainer shero__inner">
        <p className="seyebrow">{t('site.hero.eyebrow')}</p>
        <Letters text={t('site.hero.title')} className="shero__title" />
        <p className="shero__sub">{t('site.hero.sub')}</p>
        <div className="shero__ctas">
          <a className="sbtn sbtn--accent sbtn--lg" {...wa(t('site.wa.trial'))}><SiteIcon name="whatsapp" size={20} /> {t('site.ctaTrial')}</a>
          <AppButton className="sbtn--glass sbtn--lg" />
        </div>
      </div>
      <span className="shero__rail" aria-hidden="true" />
    </section>
  )
}

function Manifesto() {
  const { t } = useI18n()
  const figures = Object.entries(FIGURES).filter(([, v]) => typeof v === 'number' && v > 0)
  return (
    <>
      <figure className="smoment" aria-hidden="false">
        <BigPhoto photo={BIG.closeup} alt={t('site.alt.closeup')} className="smoment__img" />
      </figure>
      <section className="smanifesto" data-tone="light" aria-label={t('site.manifesto.label')}>
        <div className="scontainer">
          <ScrollWords text={t('site.manifesto.text')} />
          {figures.length > 0 && (
            <dl className="sfigures">
              {figures.map(([k, v]) => <div key={k}><dt>{t(`site.figures.${k}`)}</dt><dd>{v.toLocaleString('es-MX')}</dd></div>)}
            </dl>
          )}
        </div>
      </section>
    </>
  )
}

const SMALL_TILES = [
  { key: 'early', icon: 'sprout' },
  { key: 'camps', icon: 'tent' },
  { key: 'parties', icon: 'cake' },
  { key: 'coaching', icon: 'compass' },
]

function Services() {
  const { t, fmtMoney } = useI18n()
  const data = useSiteData()
  const plans = planList(data?.prices)
  const trial = data?.prices?.class_trial
  return (
    <Sec k="services" n="01">
      <Kinetic id="services-title" text={t('site.services.title')} />
      <div className="bento">
        <a className="tile tile--photo tile--classes" {...wa(t('site.wa.trial'))} data-reveal="">
          <BigPhoto photo={BIG.riding} alt={t('site.alt.riding')} className="tile__img" sizes="(min-width: 900px) 50vw, 100vw" />
          <div className="tile__text">
            <h3>{t('site.services.classes.title')}</h3>
            <p>{t('site.services.classes.text')}</p>
            <ul className="tile__prices">
              {trial > 0 && <li><span>{t('site.services.classes.trial')}</span><strong>{fmtMoney(trial)}</strong></li>}
              {plans.map((p) => <li key={p.classes}><span>{t('site.services.classes.plan', { n: p.classes })}</span><strong>{fmtMoney(p.price)}</strong></li>)}
              {data && !plans.length && <li><span>{t('site.askPrices')}</span></li>}
            </ul>
          </div>
          <Arrow />
        </a>
        <a className="tile tile--photo tile--competitions" {...wa(t('site.wa.competitions'))} data-reveal="">
          <ClubPhoto photo={PHOTOS.jumpBay} alt={t('site.alt.jumpBay')} className="tile__img" position="60% 40%" />
          <div className="tile__text"><h3>{t('site.services.competitions.title')}</h3><p>{t('site.services.competitions.text')}</p></div>
          <Arrow />
        </a>
        <a className="tile tile--photo tile--boarding" {...wa(t('site.wa.boarding'))} data-reveal="">
          <ClubPhoto photo={PHOTOS.paddock} alt={t('site.alt.paddock')} className="tile__img" />
          <div className="tile__text"><h3>{t('site.services.boarding.title')}</h3><p>{t('site.services.boarding.text')}</p></div>
          <Arrow />
        </a>
        {SMALL_TILES.map((s) => (
          <a key={s.key} className={`tile tile--icon tile--${s.key}`} {...wa(t(`site.wa.${s.key}`))} data-reveal="">
            <SiteIcon name={s.icon} size={34} className="tile__icon" />
            <h3>{t(`site.services.${s.key}.title`)}</h3>
            <p>{t(`site.services.${s.key}.text`)}</p>
            <Arrow />
          </a>
        ))}
      </div>
    </Sec>
  )
}

function Competitions() {
  const { t } = useI18n()
  return (
    <Sec k="competitions" n="02">
      <Kinetic id="competitions-title" text={t('site.competitions.title')} />
      <div className="ssticky">
        <figure className="ssticky__pin"><ClubPhoto photo={PHOTOS.jumpGrey} alt={t('site.alt.jumpGrey')} /></figure>
        <div className="ssticky__flow">
          {['training', 'events'].map((k) => (
            <article key={k} className="sstory" data-reveal="">
              <SiteIcon name={k === 'training' ? 'jump' : 'trophy'} size={36} />
              <h3>{t(`site.competitions.${k}.title`)}</h3>
              <p>{t(`site.competitions.${k}.text`)}</p>
            </article>
          ))}
          <article className="sstory sstory--champion" data-reveal="">
            <ClubPhoto photo={PHOTOS.rosette} alt={t('site.alt.rosette')} className="sstory__round" position="50% 45%" />
            <h3>{t('site.competitions.champion.title')}</h3>
            <p>{t('site.competitions.champion.text')}</p>
            <a className="sbtn sbtn--accent" {...wa(t('site.wa.competitions'))}><SiteIcon name="whatsapp" size={20} /> {t('site.competitions.cta')}</a>
          </article>
        </div>
      </div>
    </Sec>
  )
}

function Therapy() {
  const { t } = useI18n()
  return (
    <Sec k="therapy" n="03" tone="mesh">
      <p className="spill">{t('site.tagSoon')}</p>
      <Kinetic id="therapy-title" text={t('site.therapy.title')} />
      <div className="stherapy">
        <div className="stherapy__text" data-reveal="">
          <p className="slead">{t('site.therapy.what')}</p>
          <p className="slead">{t('site.therapy.who')}</p>
          <p className="snote"><SiteIcon name="shield" size={20} /> {t('site.therapy.alongside')}</p>
        </div>
        <figure className="stherapy__photo" data-reveal=""><ClubPhoto photo={PHOTOS.fence} alt={t('site.alt.fence')} /></figure>
      </div>
      <ol className="ssteps">
        {['evaluation', 'weekly', 'review'].map((k, i) => (
          <li key={k} data-reveal="">
            <span className="ssteps__n">{i + 1}</span>
            <h3>{t(`site.therapy.steps.${k}.title`)}</h3>
            <p>{t(`site.therapy.steps.${k}.text`)}</p>
          </li>
        ))}
      </ol>
      <div className="stherapy__cta" data-reveal="">
        <a className="sbtn sbtn--accent sbtn--lg" {...wa(t('site.wa.therapy'))}><SiteIcon name="whatsapp" size={20} /> {t('site.therapy.cta')}</a>
        <p className="small">{t('site.therapy.footnote')}</p>
      </div>
    </Sec>
  )
}

function Boarding() {
  const { t, lang } = useI18n()
  const data = useSiteData()
  const horses = data?.sales || []
  return (
    <Sec k="boarding" n="04">
      <Kinetic id="boarding-title" text={t('site.boarding.title')} />
      <div className="spanels">
        <article className="spanel" data-reveal="">
          <h3>{t('site.boarding.panel')}</h3>
          <ul className="slist">
            {['daily', 'feed', 'vet', 'farrier', 'app'].map((k) => (
              <li key={k}><SiteIcon name={{ daily: 'heart', feed: 'hay', vet: 'shield', farrier: 'horseshoe', app: 'phone' }[k]} size={22} /><span>{t(`site.boarding.care.${k}`)}</span></li>
            ))}
          </ul>
          <a className="sbtn sbtn--primary" {...wa(t('site.wa.boarding'))}><SiteIcon name="whatsapp" size={20} /> {t('site.boarding.cta')}</a>
        </article>
        <article className="spanel" id={sectionId('sales', lang)} data-reveal="">
          <h3>{t('site.sales.title')}</h3>
          {horses.length ? (
            <ul className="shorses">
              {horses.map((h) => (
                <li key={h.id}>
                  <span className="shorses__photo">
                    {h.photo ? <img src={h.photo} alt={t('site.sales.photoAlt', { name: h.name })} loading="lazy" decoding="async" width="160" height="120" /> : <SiteIcon name="horseshoe" size={30} />}
                  </span>
                  <span className="shorses__text">
                    <strong>{h.name}</strong>
                    <small>{[h.age != null && t('site.sales.age', { n: h.age }), h.level && t(`levels.${h.level}`), h.breed].filter(Boolean).join(' · ')}</small>
                  </span>
                  <a className="shorses__ask" {...wa(t('site.wa.horse', { name: h.name }))} aria-label={t('site.sales.askAbout', { name: h.name })}><SiteIcon name="whatsapp" size={22} /></a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="slead">{t('site.sales.empty')}</p>
          )}
          <a className="sbtn sbtn--primary" {...wa(t('site.wa.horses'))}><SiteIcon name="whatsapp" size={20} /> {t('site.sales.cta')}</a>
        </article>
      </div>
    </Sec>
  )
}

function Community() {
  const { t, fmtDate, fmtMoney } = useI18n()
  const data = useSiteData()
  const events = data?.events || []
  const pony = nextPonyFriday()
  const quote = TESTIMONIALS[0]
  const typeName = (type) => (t(`site.community.types.${type}`) === `site.community.types.${type}` ? t('site.community.types.camp') : t(`site.community.types.${type}`))
  return (
    <Sec k="community" n="05">
      <Kinetic id="community-title" text={t('site.community.title')} />
      <figure className="sfamily" data-reveal="">
        <ClubPhoto photo={PHOTOS.families} alt={t('site.alt.families')} />
        {quote && (
          <figcaption className="sfamily__quote">
            <blockquote>{quote.text}</blockquote>
            <span>{quote.name}{quote.role ? ` · ${quote.role}` : ''}</span>
          </figcaption>
        )}
      </figure>
      <p className="slead">{t('site.community.text')}</p>
      <ul className="srow" aria-label={t('site.community.rowLabel')}>
        <li className="scardlet scardlet--pony">
          <span className="scardlet__kicker">{t('site.community.pony.kicker')}</span>
          <h3>Pony Friday</h3>
          <p>{t('site.community.pony.text')}</p>
          {pony && <p className="scardlet__date">{t('site.community.pony.next', { date: fmtDate(pony, { weekday: 'long', day: 'numeric', month: 'long' }) })}</p>}
          <a className="scardlet__go" {...wa(t('site.wa.pony'))}>{t('site.community.pony.cta')} <SiteIcon name="arrowRight" size={18} /></a>
        </li>
        {events.map((e) => (
          <li key={e.id} className="scardlet">
            <span className="scardlet__kicker">{typeName(e.type)}</span>
            <h3>{fmtDate(e.startDate, { day: 'numeric', month: 'short' })} – {fmtDate(e.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}</h3>
            <p>{[e.ages && t('site.community.ages', { ages: e.ages }), e.price > 0 && t('site.community.price', { price: fmtMoney(e.price) })].filter(Boolean).join(' · ')}</p>
            <a className="scardlet__go" {...wa(t('site.wa.camps'))}>{t('site.community.ask')} <SiteIcon name="arrowRight" size={18} /></a>
          </li>
        ))}
        {['summer', 'holiday'].map((k) => (
          <li key={k} className="scardlet">
            <span className="scardlet__kicker">{t('site.community.campKicker')}</span>
            <h3>{t(`site.community.camps.${k}.title`)}</h3>
            <p>{t(`site.community.camps.${k}.text`)}</p>
            <a className="scardlet__go" {...wa(t('site.wa.camps'))}>{t('site.community.ask')} <SiteIcon name="arrowRight" size={18} /></a>
          </li>
        ))}
      </ul>
    </Sec>
  )
}

const APP_STEPS = [
  { key: 'confirm', screen: 'familia/reservar', icon: 'calendar' },
  { key: 'plan', screen: 'familia/plan', icon: 'horseshoe' },
  { key: 'pay', screen: 'familia/pagos', icon: 'phone' },
]

/** The phone stays pinned while three statements scroll past; its screen changes with each one (desktop). */
function TheApp() {
  const { t } = useI18n()
  const frame = useRef(null)
  const flow = useRef(null)
  const [step, setStep] = useState(0)
  const [fade, setFade] = useState(false)
  const [wide, setWide] = useState(null)
  useEffect(() => { setWide(Boolean(window.matchMedia?.('(min-width: 900px)').matches) && !reducedMotion()) }, [])
  useEffect(() => {
    if (!wide) return undefined
    const items = [...flow.current.querySelectorAll('[data-step]')]
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) setStep(Number(e.target.dataset.step))
    }), { rootMargin: '-45% 0px -45% 0px' })
    items.forEach((i) => io.observe(i))
    return () => io.disconnect()
  }, [wide])
  useEffect(() => {
    if (!wide) return undefined
    const send = () => frame.current?.contentWindow?.postMessage({ hipicoScreen: APP_STEPS[step].screen }, window.location.origin)
    setFade(true)
    const a = setTimeout(send, 220)
    const b = setTimeout(() => setFade(false), 520)
    const ready = (e) => { if (e.origin === window.location.origin && e.data?.hipicoReady) send() }
    window.addEventListener('message', ready)
    return () => { clearTimeout(a); clearTimeout(b); window.removeEventListener('message', ready) }
  }, [step, wide])
  return (
    <Sec k="app" n="06" tone="dark" className="sapp" bg={(
      <div className="sapp__bg" aria-hidden="true">
        <BigPhoto photo={BIG.nose} alt="" className="sapp__photo" sizes="60vw" />
        <span className="sapp__glow" />
      </div>
    )}>
      <Kinetic id="app-title" text={t('site.app.title')} />
      <div className="sapp__grid">
        <div className={`sapp__phone ${fade ? 'is-fading' : ''}`}>
          {wide !== null && <LivePhone src={wide ? '/vista?control' : '/vista'} frameRef={frame} />}
        </div>
        <ol className="sapp__flow" ref={flow}>
          {APP_STEPS.map((s, i) => (
            <li key={s.key} data-step={i} className={wide && step === i ? 'is-active' : ''} data-reveal="">
              <SiteIcon name={s.icon} size={32} />
              <h3>{t(`site.app.steps.${s.key}.title`)}</h3>
              <p>{t(`site.app.steps.${s.key}.text`)}</p>
            </li>
          ))}
          <li className="sapp__cta"><AppButton className="sbtn--lg">{t('site.app.cta')}</AppButton></li>
        </ol>
      </div>
    </Sec>
  )
}

function Visit() {
  const { t } = useI18n()
  return (
    <Sec k="visit" n="07">
      <Kinetic id="visit-title" text={t('site.visit.title')} />
      <div className="svisit">
        <div className="svisit__map" data-reveal="">
          <iframe src={mapEmbed} title={t('site.mapTitle')} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
        <div className="svisit__info" data-reveal="">
          <ul className="slist">
            <li><SiteIcon name="pin" size={22} /><span>{CONTACT.address}</span></li>
            <li><SiteIcon name="call" size={22} /><a href={CONTACT.phoneHref}>{CONTACT.phone}</a></li>
            <li><SiteIcon name="mail" size={22} /><a className="break" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
            <li><SiteIcon name="instagram" size={22} /><a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer">{CONTACT.instagramHandle}</a></li>
          </ul>
          <a className="sbtn sbtn--accent sbtn--xl" {...wa(t('site.wa.general'))}><SiteIcon name="whatsapp" size={24} /> {t('site.visit.whatsapp')}</a>
          <a className="slinkarrow" href={mapDirections} target="_blank" rel="noopener noreferrer"><SiteIcon name="map" size={20} /> {t('site.directions')}</a>
        </div>
      </div>
    </Sec>
  )
}

export default function OnePage() {
  return (
    <>
      <Hero />
      <Manifesto />
      <Services />
      <Competitions />
      <Therapy />
      <Boarding />
      <Community />
      <TheApp />
      <Visit />
    </>
  )
}
