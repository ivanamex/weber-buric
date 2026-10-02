import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { LivePhone } from '../components/LivePhone.jsx'
import { waLink } from '../components/ui.jsx'
import { todayKey } from '../lib/time.js'
import { AppButton } from './SiteLayout.jsx'
import { ClubPhoto, Kinetic, Letters, reducedMotion } from './motion.jsx'
import { SECTIONS, sectionId } from './routes.js'
import { CLIPS, CONTACT, HERO_SCENES, PHOTOS, SERVICE_PHOTOS, mapDirections, mapEmbed } from './content.js'
import { PageHoofprints } from './Hoofprints.jsx'
import { planList, useSiteData } from './siteData.js'
import { FilmStrip } from './Gallery.jsx'
import { ServiceSheet } from './ServiceSheet.jsx'

const wa = (text) => ({ href: waLink(text), target: '_blank', rel: 'noopener noreferrer' })
const RATE = 0.75 // every clip plays in a soft slow motion
const saveData = () => typeof navigator !== 'undefined' && navigator.connection?.saveData === true
const stillOnly = () => reducedMotion() || saveData()

/** A section. `rail`: the side number and name ("01 El club"), sticky on a computer while the section scrolls. */
function Sec({ k, className = '', rail = false, after = null, children }) {
  const { t, lang } = useI18n()
  const n = SECTIONS.find((x) => x.key === k)?.n
  return (
    <section id={sectionId(k, lang)} className={`sec ${className}`} data-tone="light" aria-labelledby={`${k}-title`}>
      <div className={`scontainer ${rail ? 'sec__in' : ''}`}>
        {rail && <p className="srail" aria-hidden="true"><b>{n}</b>{t(`site.rail.${k}`)}</p>}
        <div className="sec__body">{children}</div>
      </div>
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

const BOXES = [
  { key: 'camps', color: 'sage' },
  { key: 'pony', color: 'light' },
  { key: 'parties', color: 'sand' },
  { key: 'coaching', color: 'olive' },
]

/** Qué hacemos: four photo cards (each opens its lightbox) and four colourful boxes (each opens WhatsApp). */
function Services({ onOpen }) {
  const { t, fmtDate } = useI18n()
  const data = useSiteData()
  const pony = nextPonyFriday()
  const camp = (data?.events || []).find((e) => e.type === 'camp')
  const cards = [
    { key: 'classes', title: t('site.services.classes.title'), text: t('site.services.classes.card') },
    { key: 'competitions', title: t('site.services.competitions.title'), text: t('site.services.competitions.text') },
    { key: 'boarding', title: t('site.services.boarding.title'), text: t('site.services.boarding.text') },
    { key: 'early', title: t('site.services.early.title'), text: t('site.services.early.text') },
  ]
  const box = {
    camps: { title: t('site.boxes.camps.title'), go: camp ? t('site.boxes.camps.next', { date: fmtDate(camp.startDate, { day: 'numeric', month: 'long' }) }) : t('site.boxes.camps.go'), wa: t('site.wa.camps') },
    pony: { title: 'Pony Friday', go: pony ? t('site.boxes.pony.go', { date: fmtDate(pony, { day: 'numeric', month: 'long' }) }) : t('site.community.pony.cta'), wa: t('site.wa.pony') },
    parties: { title: t('site.boxes.parties.title'), go: t('site.boxes.parties.go'), wa: t('site.wa.parties') },
    coaching: { title: t('site.services.coaching.title'), go: t('site.boxes.coaching.go'), wa: t('site.wa.coaching') },
  }
  return (
    <Sec k="services" rail>
      <div className="shead">
        <Kinetic id="services-title" text={t('site.services.title')} />
        <p className="slead">{t('site.services.lead')}</p>
      </div>
      <div className="scards">
        {cards.map((c) => {
          const ph = SERVICE_PHOTOS[c.key]
          return (
            <button key={c.key} type="button" className={`scard scard--${c.key}`} data-reveal="" aria-haspopup="dialog"
              aria-label={t('site.services.open', { name: c.title })} onClick={() => onOpen({ key: c.key, photo: ph, alt: t(`site.alt.${ph.alt}`), position: ph.position })}>
              <img src={ph.src} width={ph.w} height={ph.h} alt="" loading="lazy" decoding="async" style={{ objectPosition: ph.position }} />
              <span className="scard__plus" aria-hidden="true">+</span>
              <span className="scard__text"><span className="scard__title">{c.title}</span><span>{c.text}</span></span>
            </button>
          )
        })}
      </div>
      <div className="sboxes">
        {BOXES.map((b) => (
          <a key={b.key} className={`sbox sbox--${b.color}`} {...wa(box[b.key].wa)} data-reveal="">
            <h3>{box[b.key].title}</h3>
            <p>{t(`site.boxes.${b.key}.text`)}</p>
            <small>{box[b.key].go} →</small>
          </a>
        ))}
      </div>
    </Sec>
  )
}

/** Competencias, free: text on the left, the hooves clip on the right, the big rosette over the clip's corner. */
function Competitions({ onOpen }) {
  const { t } = useI18n()
  const ph = SERVICE_PHOTOS.competitions
  return (
    <Sec k="competitions" rail className="scomp2">
      <div className="scomp2__grid">
        <div className="scomp2__text">
          <Kinetic id="competitions-title" text={t('site.competitions.title')} />
          <p className="slead">{t('site.competitions.lead')}</p>
          <div className="sctas">
            <a className="sbtn sbtn--deep" {...wa(t('site.wa.competitions'))}><span className="sbtn__in">{t('site.competitions.cta')}</span></a>
            <button type="button" className="sbtn sbtn--line" aria-haspopup="dialog"
              onClick={() => onOpen({ key: 'competitions', photo: ph, alt: t(`site.alt.${ph.alt}`), position: ph.position })}>{t('site.competitions.more')}</button>
          </div>
        </div>
        <figure className="scomp2__video" data-reveal="">
          <Clip clip={CLIPS.hooves} alt={t('site.alt.hooves')} />
          <span className="scomp2__tag" aria-hidden="true"><SiteIcon name="play" size={14} /> {t('site.competitions.video')}</span>
        </figure>
        <div className="scomp2__champ">
          <div>
            <h3>{t('site.competitions.champion.title')}</h3>
            <p>{t('site.competitions.champion.text')}</p>
          </div>
          <figure className="scomp2__rosette" data-reveal=""><ClubPhoto photo={PHOTOS.rosette} alt={t('site.alt.rosette')} position="50% 40%" /></figure>
        </div>
      </div>
    </Sec>
  )
}

/** Equinoterapia: the grooming clip left, the text right, on the same background as the rest of the page. */
function Therapy() {
  const { t } = useI18n()
  return (
    <Sec k="therapy" rail>
      <Split media={<Clip clip={CLIPS.grooming} alt={t('site.alt.grooming')} />}>
        <span className="spill">{t('site.tagSoon')}</span>
        <Kinetic id="therapy-title" text={t('site.therapy.title')} />
        <p className="slead">{t('site.therapy.lead')}</p>
        <a className="sbtn sbtn--deep" {...wa(t('site.wa.therapy'))}><span className="sbtn__in">{t('site.therapy.cta')}</span></a>
        <p className="small snote--soft">{t('site.therapy.footnote')}</p>
      </Split>
    </Sec>
  )
}

/** Pensión y caballos, as it was: the care list, the button, horses for sale; the herd clip right. */
function Boarding() {
  const { t, lang } = useI18n()
  const data = useSiteData()
  const horses = data?.sales || []
  return (
    <Sec k="boarding" rail>
      <Split side="right" media={<Clip clip={CLIPS.herd} alt={t('site.alt.paddock')} />}>
        <Kinetic id="boarding-title" text={t('site.boarding.title')} />
        <ul className="slist">
          {['daily', 'feed', 'vet', 'farrier', 'app'].map((k) => (
            <li key={k}><SiteIcon name={{ daily: 'heart', feed: 'hay', vet: 'shield', farrier: 'horseshoe', app: 'phone' }[k]} size={22} /><span>{t(`site.boarding.care.${k}`)}</span></li>
          ))}
        </ul>
        <a className="sbtn sbtn--deep" {...wa(t('site.wa.boarding'))}><span className="sbtn__in">{t('site.boarding.cta')}</span></a>
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

/** Familias que montan juntas: the title, then the film strip across the whole width. */
function Families() {
  const { t } = useI18n()
  return (
    <Sec k="community" rail className="sfamilies" after={<FilmStrip />}>
      <div className="shead shead--inline">
        <Kinetic id="community-title" text={t('site.community.title')} />
        <p className="snote--soft sdrag" aria-hidden="true">{t('site.families.drag')}</p>
      </div>
    </Sec>
  )
}

const APP_STEPS = [
  { key: 'confirm', icon: 'calendar' },
  { key: 'plan', icon: 'horseshoe' },
  { key: 'pay', icon: 'phone' },
]

/** La app, as it was: the whole phone (showing Inicio) left, the 3 points and the button right. */
function TheApp() {
  const { t } = useI18n()
  return (
    <Sec k="app" rail>
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

/** Te esperamos en Paamul, as it was: address and WhatsApp left, the map right. */
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
  const [sheet, setSheet] = useState(null)
  return (
    <>
      <PageHoofprints />
      <Hero />
      <Services onOpen={setSheet} />
      <Competitions onOpen={setSheet} />
      <Therapy />
      <Boarding />
      <Families />
      <TheApp />
      <Visit />
      {sheet && <ServiceSheet service={sheet} onClose={() => setSheet(null)} />}
    </>
  )
}
