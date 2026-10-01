import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { LivePhone } from '../components/LivePhone.jsx'
import { waLink } from '../components/ui.jsx'
import { todayKey } from '../lib/time.js'
import { AppButton } from './SiteLayout.jsx'
import { BigPhoto, ClubPhoto, Kinetic, Letters, reducedMotion } from './motion.jsx'
import { sectionId } from './routes.js'
import { BIG, CONTACT, HERO_SCENES, PHOTOS, TESTIMONIALS, mapDirections, mapEmbed } from './content.js'
import { planList, useSiteData } from './siteData.js'
import GALLERY from 'virtual:gallery'

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

const saveData = () => typeof navigator !== 'undefined' && navigator.connection?.saveData === true
const SCENE_MS = 6500

/** The hero's big frame: three scenes in a loop with cross-fades; the chips show the one playing and jump to it. */
function HeroScenes() {
  const { t } = useI18n()
  const [on, setOn] = useState(1)
  const [still, setStill] = useState(true)
  const videos = useRef([])
  useEffect(() => { setStill(reducedMotion() || saveData()) }, [])
  const scene = HERO_SCENES[on]
  // Photos (or videos without their file yet) move on by timer; a playing video moves on when it ends.
  useEffect(() => {
    if (still) return undefined
    const v = scene.video && videos.current[on]
    if (v) {
      v.currentTime = 0
      v.play().catch(() => {})
      const next = () => setOn((i) => (i + 1) % HERO_SCENES.length)
      v.addEventListener('ended', next)
      return () => { v.removeEventListener('ended', next); v.pause() }
    }
    const id = setTimeout(() => setOn((i) => (i + 1) % HERO_SCENES.length), SCENE_MS)
    return () => clearTimeout(id)
  }, [on, still, scene.video])
  return (
    <div className="hframe">
      {HERO_SCENES.map((sc, i) => (
        <div key={sc.key} className={`hframe__scene ${i === on ? 'is-on' : ''}`} aria-hidden={i === on ? undefined : 'true'}>
          {sc.video && !still ? (
            <video ref={(el) => { videos.current[i] = el }} muted playsInline preload={i === on ? 'auto' : 'none'} poster={sc.photo.src}
              aria-label={t(`site.hero.scenes.${sc.key}.alt`)}>
              <source src={sc.video} type="video/mp4" />
            </video>
          ) : (
            <img src={sc.photo.src} srcSet={sc.photo.small ? `${sc.photo.small} 800w, ${sc.photo.src} 1600w` : undefined}
              sizes="(min-width: 900px) 45vw, 100vw" width={sc.photo.w} height={sc.photo.h} alt={t(`site.hero.scenes.${sc.key}.alt`)}
              loading={i === 1 ? 'eager' : 'lazy'} fetchPriority={i === 1 ? 'high' : undefined} decoding="async"
              style={{ objectPosition: sc.photo.position }} />
          )}
        </div>
      ))}
      <div className="hframe__chips" role="group" aria-label={t('site.hero.scenesLabel')}>
        {HERO_SCENES.map((sc, i) => (
          <button key={sc.key} type="button" className={i === on ? 'is-on' : ''} aria-pressed={i === on} onClick={() => setOn(i)}>
            {t(`site.hero.scenes.${sc.key}.chip`)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Hero() {
  const { t, lang } = useI18n()
  return (
    <section className="shero" data-tone="light" aria-label={t('site.hero.label')}>
      <svg className="shero__course" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <path d="M760 900 C 780 760, 750 600, 800 470 S 820 200, 960 120 S 1240 90, 1440 130" />
      </svg>
      <div className="shero__inner">
        <div className="shero__head">
          <Letters text={t('site.hero.title')} className="shero__title" />
          <p className="shero__sub">{t('site.hero.sub')}</p>
        </div>
        <HeroScenes />
        <div className="shero__ctas">
          <a className="sbtn sbtn--deep sbtn--lg" {...wa(t('site.wa.trial'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.ctaTrial')}</span></a>
          <a className="sbtn sbtn--line sbtn--lg" href={`#${sectionId('services', lang)}`}>{t('site.hero.prices')}</a>
        </div>
      </div>
    </section>
  )
}

/** "Aprende a montar": the rider's path, like a jumping course, one fence at a time. */
function Learn() {
  const { t } = useI18n()
  return (
    <Sec k="learn" n="01">
      <div className="slearn">
        <div className="slearn__head">
          <Kinetic id="learn-title" text={t('site.learn.title')} />
          <p className="slead">{t('site.learn.lead')}</p>
        </div>
        <ol className="slearn__steps">
          {['trial', 'plan', 'pony', 'show'].map((k, i) => (
            <li key={k} data-reveal="">
              <span className="slearn__n">{i + 1}</span>
              <h3>{t(`site.learn.steps.${k}.title`)}</h3>
              <p>{t(`site.learn.steps.${k}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </Sec>
  )
}

// Gallery alt text for the club's own photos; any other file gets its name as a short description.
const GALLERY_ALT = {
  'jump-bay': 'jumpBay', 'families-celebrating': 'families', 'jump-grey': 'jumpGrey', 'rosette-campeon': 'rosette',
  'rider-buckskin': 'rider', 'paddock-herd': 'paddock', 'horse-fence': 'fence', 'girl-horse-closeup': 'closeup',
  'girl-horse-nose': 'nose', 'girl-riding-flamboyan': 'riding', 'horse-blaze': 'hero',
}

function GalleryRow({ items, dir, alt }) {
  return (
    <div className={`sgallery__row sgallery__row--${dir}`}>
      <div className="sgallery__track">
        {[0, 1].map((copy) => items.map((g) => (
          <figure key={`${copy}-${g.name}`} className="sgallery__item" style={{ '--ratio': g.w / g.h }} aria-hidden={copy ? 'true' : undefined}>
            <img src={g.src} width={g.w} height={g.h} alt={copy ? '' : alt(g)} loading="lazy" decoding="async" />
          </figure>
        )))}
      </div>
    </div>
  )
}

/** "Disfruta": the big title, then two rows of photos sliding in opposite directions (pause on hover). */
function Enjoy() {
  const { t } = useI18n()
  const alt = (g) => (GALLERY_ALT[g.name] ? t(`site.alt.${GALLERY_ALT[g.name]}`) : g.name.replace(/[-_]+/g, ' '))
  const rows = [GALLERY.filter((_, i) => i % 2 === 0), GALLERY.filter((_, i) => i % 2 === 1)]
  return (
    <section className="senjoy" data-tone="light" aria-labelledby="enjoy-title">
      <div className="scontainer"><h2 id="enjoy-title" className="senjoy__word">{t('site.enjoy.word')}</h2></div>
      <div className="sgallery" aria-label={t('site.enjoy.gallery')} role="group">
        <GalleryRow items={rows[0]} dir="left" alt={alt} />
        <GalleryRow items={rows[1].length ? rows[1] : rows[0]} dir="right" alt={alt} />
      </div>
    </section>
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
    <Sec k="services" n="02">
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
    <Sec k="competitions" n="03">
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
            <a className="sbtn sbtn--deep" {...wa(t('site.wa.competitions'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.competitions.cta')}</span></a>
          </article>
        </div>
      </div>
    </Sec>
  )
}

function Therapy() {
  const { t } = useI18n()
  return (
    <Sec k="therapy" n="04" tone="mesh">
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
        <a className="sbtn sbtn--deep sbtn--lg" {...wa(t('site.wa.therapy'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.therapy.cta')}</span></a>
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
    <Sec k="boarding" n="05">
      <Kinetic id="boarding-title" text={t('site.boarding.title')} />
      <div className="spanels">
        <article className="spanel" data-reveal="">
          <h3>{t('site.boarding.panel')}</h3>
          <ul className="slist">
            {['daily', 'feed', 'vet', 'farrier', 'app'].map((k) => (
              <li key={k}><SiteIcon name={{ daily: 'heart', feed: 'hay', vet: 'shield', farrier: 'horseshoe', app: 'phone' }[k]} size={22} /><span>{t(`site.boarding.care.${k}`)}</span></li>
            ))}
          </ul>
          <a className="sbtn sbtn--deep" {...wa(t('site.wa.boarding'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.boarding.cta')}</span></a>
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
          <a className="sbtn sbtn--deep" {...wa(t('site.wa.horses'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.sales.cta')}</span></a>
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
    <Sec k="community" n="06">
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
    <Sec k="app" n="07" tone="dark" className="sapp" bg={(
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
    <Sec k="visit" n="08">
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
          <a className="sbtn sbtn--deep sbtn--xl" {...wa(t('site.wa.general'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={24} /> {t('site.visit.whatsapp')}</span></a>
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
      <Learn />
      <Services />
      <Competitions />
      <Therapy />
      <Boarding />
      <Community />
      <TheApp />
      <Enjoy />
      <Visit />
    </>
  )
}
