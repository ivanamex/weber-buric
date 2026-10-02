import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { LivePhone } from '../components/LivePhone.jsx'
import { waLink } from '../components/ui.jsx'
import { todayKey } from '../lib/time.js'
import { AppButton } from './SiteLayout.jsx'
import { BigPhoto, ClubPhoto, Kinetic, Letters, reducedMotion } from './motion.jsx'
import { sectionId } from './routes.js'
import { BIG, CLIPS, CONTACT, HERO_SCENES, PHOTOS, TESTIMONIALS, mapDirections, mapEmbed } from './content.js'
import { Hoofprints } from './Hoofprints.jsx'
import { planList, useSiteData } from './siteData.js'
import { GalleryRow } from './Gallery.jsx'

const wa = (text) => ({ href: waLink(text), target: '_blank', rel: 'noopener noreferrer' })
const RATE = 0.75 // every clip plays in a soft slow motion
const saveData = () => typeof navigator !== 'undefined' && navigator.connection?.saveData === true
const stillOnly = () => reducedMotion() || saveData()

/** A section: the title starts at the left content edge. `after` is full-width content below the container. */
function Sec({ k, className = '', after = null, children }) {
  const { lang } = useI18n()
  return (
    <section id={sectionId(k, lang)} className={`sec ${className}`} data-tone="light" aria-labelledby={`${k}-title`}>
      <div className="scontainer">{children}</div>
      {after}
    </section>
  )
}

/** Pattern B: the media on one side (7/12), the text on the other (5/12). */
function Split({ media, side = 'left', bare = false, children }) {
  return (
    <div className={`ssplit ssplit--${side}`}>
      <figure className={`ssplit__media ${bare ? 'ssplit__media--bare' : ''}`} data-reveal="">{media}</figure>
      <div className="ssplit__text">{children}</div>
    </div>
  )
}

/** A muted clip that loops only while it's on screen. Reduced motion or Save-Data: the poster only. */
function Clip({ clip, className = '', alt = '' }) {
  const ref = useRef(null)
  const [still, setStill] = useState(true)
  useEffect(() => { setStill(stillOnly()) }, [])
  useEffect(() => {
    const v = ref.current
    if (still || !v) return undefined
    v.playbackRate = RATE
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { v.playbackRate = RATE; v.play().catch(() => {}) } else v.pause()
    }, { threshold: 0.15 })
    io.observe(v)
    return () => { io.disconnect(); v.pause() }
  }, [still])
  if (still) return <img className={className} src={clip.poster} alt={alt} width={clip.w} height={clip.h} loading="lazy" decoding="async" />
  return (
    <video ref={ref} className={className} muted playsInline loop preload="metadata" poster={clip.poster}
      width={clip.w} height={clip.h} aria-label={alt || undefined} aria-hidden={alt ? undefined : 'true'}>
      <source src={clip.video} type="video/mp4" />
    </video>
  )
}

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

/**
 * The hero: the three clips full-bleed, one after the other (each as long as its clip at 0.75×, then a 1 s
 * cross-fade). Only the playing clip and the next one load. The chips follow and jump to a scene.
 */
function Hero() {
  const { t, lang } = useI18n()
  const [on, setOn] = useState(0)
  const [still, setStill] = useState(true)
  const [visible, setVisible] = useState(true)
  const videos = useRef([])
  const root = useRef(null)
  useEffect(() => { setStill(stillOnly()) }, [])
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 })
    io.observe(root.current)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    const v = videos.current[on]
    if (still || !v) return undefined
    if (!visible) { v.pause(); return undefined }
    v.playbackRate = RATE
    v.play().catch(() => {})
    // Only now fetch the next clip, so the first load stays small.
    const warm = setTimeout(() => {
      const n = videos.current[(on + 1) % HERO_SCENES.length]
      if (n && n.preload !== 'auto') { n.preload = 'auto'; n.load() }
    }, 1200)
    // Start the cross-fade 1 s before the clip ends, so the next scene is already there.
    const tick = () => {
      if (v.duration && v.currentTime >= v.duration - 1 * RATE) setOn((i) => (i + 1) % HERO_SCENES.length)
    }
    const next = () => setOn((i) => (i + 1) % HERO_SCENES.length)
    v.addEventListener('timeupdate', tick)
    v.addEventListener('ended', next)
    return () => { clearTimeout(warm); v.removeEventListener('timeupdate', tick); v.removeEventListener('ended', next) }
  }, [on, still, visible])
  // Once the cross-fade is over, the other scenes stop and rewind.
  useEffect(() => {
    const id = setTimeout(() => videos.current.forEach((v, i) => {
      if (v && i !== on) { v.pause(); v.currentTime = 0 }
    }), 1100)
    return () => clearTimeout(id)
  }, [on])
  return (
    <section className="shero" data-tone="dark" aria-label={t('site.hero.label')} ref={root}>
      <div className="shero__media">
        {HERO_SCENES.map((sc, i) => (
          <div key={sc.key} className={`shero__scene ${i === on ? 'is-on' : ''}`} aria-hidden={i === on ? undefined : 'true'}>
            {still ? (
              <img src={sc.poster} alt={t(`site.hero.scenes.${sc.key}.alt`)} width="1280" height="700" decoding="async"
                loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : undefined} />
            ) : (
              <video ref={(el) => { videos.current[i] = el }} muted playsInline poster={sc.poster}
                preload={i === 0 ? 'auto' : 'none'} aria-label={t(`site.hero.scenes.${sc.key}.alt`)}>
                <source src={sc.video} type="video/mp4" />
              </video>
            )}
          </div>
        ))}
      </div>
      <div className="shero__scrim" aria-hidden="true" />
      <div className="scontainer shero__inner">
        <div className="shero__text">
          <Letters text={t('site.hero.title')} className="shero__title" />
          <p className="shero__sub">{t('site.hero.sub')}</p>
          <div className="shero__ctas">
            <a className="sbtn sbtn--deep sbtn--lg" {...wa(t('site.wa.trial'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.ctaTrial')}</span></a>
            <a className="sbtn sbtn--light sbtn--lg" href={`#${sectionId('services', lang)}`}>{t('site.hero.prices')}</a>
          </div>
        </div>
        <div className="shero__chips" role="group" aria-label={t('site.hero.scenesLabel')}>
          {HERO_SCENES.map((sc, i) => (
            <button key={sc.key} type="button" className={i === on ? 'is-on' : ''} aria-pressed={i === on} onClick={() => setOn(i)}>
              {t(`site.hero.scenes.${sc.key}.chip`)}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Galería: one slow row of photos and clips, full width; a tile opens the lightbox. */
function Enjoy() {
  const { t } = useI18n()
  return (
    <Sec k="enjoy" className="senjoy" after={<GalleryRow />}>
      <Kinetic id="enjoy-title" text={t('site.enjoy.title')} />
    </Sec>
  )
}

const SMALL_TILES = [
  { key: 'early', icon: 'sprout' },
  { key: 'camps', icon: 'tent' },
  { key: 'parties', icon: 'cake' },
  { key: 'coaching', icon: 'compass' },
]
const Arrow = () => <span className="tile__arrow" aria-hidden="true"><SiteIcon name="arrowRight" size={20} /></span>

/** Steps, each on its own coloured tile. */
function StepRow({ id, steps, className = '' }) {
  return (
    <ol id={id} className={`ssteps ${className}`} data-reveal="">
      {steps.map((s, i) => (
        <li key={s.key}>
          <span className="ssteps__n">{i + 1}</span>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </li>
      ))}
    </ol>
  )
}

/** Qué hacemos: the bento, then "Aprende a montar": the 4 step tiles on the page, hoofprints walking behind them. */
function Services() {
  const { t, lang, fmtMoney } = useI18n()
  const band = useRef(null)
  const data = useSiteData()
  const plans = planList(data?.prices)
  const trial = data?.prices?.class_trial
  return (
    <Sec k="services" after={(
      <div className="slearn" ref={band}>
        <Hoofprints band={band} />
        <div className="scontainer">
          <h3 className="stitle2" id={sectionId('learn', lang)}>{t('site.learn.title')}</h3>
          <StepRow steps={['trial', 'plan', 'pony', 'show'].map((k) => ({ key: k, title: t(`site.learn.steps.${k}.title`), text: t(`site.learn.steps.${k}.text`) }))} />
        </div>
      </div>
    )}>
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
            <SiteIcon name={s.icon} size={30} className="tile__icon" />
            <h3>{t(`site.services.${s.key}.title`)}</h3>
            <p>{t(`site.services.${s.key}.text`)}</p>
            <Arrow />
          </a>
        ))}
      </div>
    </Sec>
  )
}

/** Competencias, pattern A: the hooves clip full width with the title on a scrim; below, three plain points. */
function Competitions() {
  const { t, lang } = useI18n()
  return (
    <section id={sectionId('competitions', lang)} className="sec sec--full" data-tone="light" aria-labelledby="competitions-title">
      <div className="sfull" data-tone="dark">
        <Clip clip={CLIPS.hooves} className="sfull__media" alt={t('site.alt.hooves')} />
        <div className="sfull__scrim" aria-hidden="true" />
        <div className="scontainer sfull__inner">
          <Kinetic id="competitions-title" text={t('site.competitions.title')} />
          <p className="sfull__line">{t('site.competitions.lead')}</p>
          <a className="sbtn sbtn--deep sbtn--lg" {...wa(t('site.wa.competitions'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.competitions.cta')}</span></a>
        </div>
      </div>
      <div className="scontainer">
        <ul className="spoints">
          {['training', 'events'].map((k) => (
            <li key={k} data-reveal="">
              <SiteIcon name={k === 'training' ? 'jump' : 'trophy'} size={32} className="spoints__icon" />
              <h3>{t(`site.competitions.${k}.title`)}</h3>
              <p>{t(`site.competitions.${k}.text`)}</p>
            </li>
          ))}
          <li data-reveal="">
            <ClubPhoto photo={PHOTOS.rosette} alt={t('site.alt.rosette')} className="spoints__round" position="50% 45%" />
            <h3>{t('site.competitions.champion.title')}</h3>
            <p>{t('site.competitions.champion.text')}</p>
          </li>
        </ul>
      </div>
    </section>
  )
}

/** Equinoterapia, pattern B: the grooming clip left; the text, the 3 step tiles and the CTA right. */
function Therapy() {
  const { t } = useI18n()
  return (
    <Sec k="therapy">
      <Split media={<Clip clip={CLIPS.grooming} alt={t('site.alt.grooming')} />}>
        <span className="spill">{t('site.tagSoon')}</span>
        <Kinetic id="therapy-title" text={t('site.therapy.title')} />
        <p className="slead">{t('site.therapy.what')}</p>
        <p className="snote"><SiteIcon name="shield" size={20} /> {t('site.therapy.alongside')}</p>
        <StepRow className="ssteps--stack" steps={['evaluation', 'weekly', 'review'].map((k) => ({ key: k, title: t(`site.therapy.steps.${k}.title`), text: t(`site.therapy.steps.${k}.text`) }))} />
        <a className="sbtn sbtn--deep sbtn--lg" {...wa(t('site.wa.therapy'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.therapy.cta')}</span></a>
        <p className="small snote--soft">{t('site.therapy.footnote')}</p>
      </Split>
    </Sec>
  )
}

/** Pensión y caballos, pattern B: the herd clip right; one title, the care list, the button, horses for sale. */
function Boarding() {
  const { t, lang } = useI18n()
  const data = useSiteData()
  const horses = data?.sales || []
  return (
    <Sec k="boarding">
      <Split side="right" media={<Clip clip={CLIPS.herd} alt={t('site.alt.paddock')} />}>
        <Kinetic id="boarding-title" text={t('site.boarding.title')} />
        <ul className="slist">
          {['daily', 'feed', 'vet', 'farrier', 'app'].map((k) => (
            <li key={k}><SiteIcon name={{ daily: 'heart', feed: 'hay', vet: 'shield', farrier: 'horseshoe', app: 'phone' }[k]} size={22} /><span>{t(`site.boarding.care.${k}`)}</span></li>
          ))}
        </ul>
        <a className="sbtn sbtn--deep" {...wa(t('site.wa.boarding'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.boarding.cta')}</span></a>
        <div className="ssales" id={sectionId('sales', lang)}>
          {horses.length > 0 && (
            <ul className="shorses" aria-label={t('site.sales.title')}>
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
          )}
          <a className="slinkarrow" {...wa(t('site.wa.horses'))}>{t('site.sales.looking')} <SiteIcon name="arrowRight" size={18} /></a>
        </div>
      </Split>
    </Sec>
  )
}

const APP_STEPS = [
  { key: 'confirm', icon: 'calendar' },
  { key: 'plan', icon: 'horseshoe' },
  { key: 'pay', icon: 'phone' },
]

/** La app, pattern B: the whole phone (showing Inicio) left, the 3 points and the button right. */
function TheApp() {
  const { t } = useI18n()
  return (
    <Sec k="app">
      <Split bare media={<div className="sapp__phone"><LivePhone src="/vista?control" /></div>}>
        <Kinetic id="app-title" text={t('site.app.title')} />
        <ul className="sapp__flow">
          {APP_STEPS.map((s) => (
            <li key={s.key} data-reveal="">
              <span className="sapp__icon"><SiteIcon name={s.icon} size={26} /></span>
              <div>
                <h3>{t(`site.app.steps.${s.key}.title`)}</h3>
                <p>{t(`site.app.steps.${s.key}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>
        <AppButton className="sbtn--lg">{t('site.app.cta')}</AppButton>
      </Split>
    </Sec>
  )
}

/** Comunidad, pattern B: the families photo left and the text right; then whole event cards (3 on a computer, "Ver todos" for the rest; a swipe row with dots on phones). */
function Community() {
  const { t, fmtDate, fmtMoney } = useI18n()
  const data = useSiteData()
  const events = data?.events || []
  const pony = nextPonyFriday()
  const quote = TESTIMONIALS[0]
  const [all, setAll] = useState(false)
  const [dot, setDot] = useState(0)
  const row = useRef(null)
  const typeName = (type) => (t(`site.community.types.${type}`) === `site.community.types.${type}` ? t('site.community.types.camp') : t(`site.community.types.${type}`))
  const cards = [
    { key: 'pony', pony: true, kicker: t('site.community.pony.kicker'), title: 'Pony Friday', text: t('site.community.pony.text'),
      date: pony && t('site.community.pony.next', { date: fmtDate(pony, { weekday: 'long', day: 'numeric', month: 'long' }) }), go: t('site.community.pony.cta'), wa: t('site.wa.pony') },
    ...events.map((e) => ({ key: e.id, kicker: typeName(e.type),
      title: `${fmtDate(e.startDate, { day: 'numeric', month: 'short' })} – ${fmtDate(e.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`,
      text: [e.ages && t('site.community.ages', { ages: e.ages }), e.price > 0 && t('site.community.price', { price: fmtMoney(e.price) })].filter(Boolean).join(' · '),
      go: t('site.community.ask'), wa: t('site.wa.camps') })),
    ...['summer', 'holiday'].map((k) => ({ key: k, kicker: t('site.community.campKicker'), title: t(`site.community.camps.${k}.title`),
      text: t(`site.community.camps.${k}.text`), go: t('site.community.ask'), wa: t('site.wa.camps') })),
  ]
  const onScroll = () => {
    const el = row.current
    const first = el?.firstElementChild
    if (first) setDot(Math.round(el.scrollLeft / (first.getBoundingClientRect().width + 14)))
  }
  return (
    <Sec k="community">
      <Split media={<ClubPhoto photo={PHOTOS.families} alt={t('site.alt.families')} />}>
        <Kinetic id="community-title" text={t('site.community.title')} />
        <p className="slead">{t('site.community.text')}</p>
        {quote && (
          <blockquote className="squote">
            <p>{quote.text}</p>
            <span>{quote.name}{quote.role ? ` · ${quote.role}` : ''}</span>
          </blockquote>
        )}
      </Split>
      <ul className={`sevents ${all ? 'is-all' : ''}`} ref={row} onScroll={onScroll} aria-label={t('site.community.rowLabel')}>
        {cards.map((c) => (
          <li key={c.key} className={`scardlet ${c.pony ? 'scardlet--pony' : ''}`}>
            <span className="scardlet__kicker">{c.kicker}</span>
            <h3>{c.title}</h3>
            {c.text && <p>{c.text}</p>}
            {c.date && <p className="scardlet__date">{c.date}</p>}
            <a className="scardlet__go" {...wa(c.wa)}>{c.go} <SiteIcon name="arrowRight" size={18} /></a>
          </li>
        ))}
      </ul>
      <div className="sevents__foot">
        <span className="sevents__dots" aria-hidden="true">{cards.map((c, i) => <i key={c.key} className={i === dot ? 'is-on' : ''} />)}</span>
        {cards.length > 3 && (
          <button type="button" className="slinkarrow sevents__all" aria-expanded={all} onClick={() => setAll((v) => !v)}>
            {all ? t('site.community.fewer') : t('site.community.all', { n: cards.length })}
          </button>
        )}
      </div>
    </Sec>
  )
}

/** Visítanos, pattern B: address and WhatsApp left, the map right. */
function Visit() {
  const { t } = useI18n()
  return (
    <Sec k="visit">
      <Split side="right" bare media={(
        <div className="svisit__map">
          <iframe src={mapEmbed} title={t('site.mapTitle')} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      )}>
        <Kinetic id="visit-title" text={t('site.visit.title')} />
        <ul className="slist">
          <li><SiteIcon name="pin" size={22} /><span>{CONTACT.address}</span></li>
          {CONTACT.hours && <li><SiteIcon name="clock" size={22} /><span>{CONTACT.hours}</span></li>}
          <li><SiteIcon name="call" size={22} /><a href={CONTACT.phoneHref}>{CONTACT.phone}</a></li>
          <li><SiteIcon name="mail" size={22} /><a className="break" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
          <li><SiteIcon name="instagram" size={22} /><a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer">{CONTACT.instagramHandle}</a></li>
        </ul>
        <a className="sbtn sbtn--deep sbtn--lg" {...wa(t('site.wa.general'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={22} /> {t('site.visit.whatsapp')}</span></a>
        <a className="slinkarrow" href={mapDirections} target="_blank" rel="noopener noreferrer"><SiteIcon name="map" size={20} /> {t('site.directions')}</a>
      </Split>
    </Sec>
  )
}

export default function OnePage() {
  return (
    <>
      <Hero />
      <Services />
      <Competitions />
      <Therapy />
      <Boarding />
      <TheApp />
      <Community />
      <Enjoy />
      <Visit />
    </>
  )
}
