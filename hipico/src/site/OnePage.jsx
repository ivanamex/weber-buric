import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { LivePhone } from '../components/LivePhone.jsx'
import { waLink } from '../components/ui.jsx'
import { todayKey } from '../lib/time.js'
import { AppButton } from './SiteLayout.jsx'
import { BigPhoto, ClubPhoto, Kinetic, Letters, reducedMotion } from './motion.jsx'
import { sectionId } from './routes.js'
import { BIG, CLIPS, CONTACT, GALLERY_VIDEOS, HERO_SCENES, PHOTOS, TESTIMONIALS, mapDirections, mapEmbed } from './content.js'
import { planList, useSiteData } from './siteData.js'
import GALLERY from 'virtual:gallery'

const wa = (text) => ({ href: waLink(text), target: '_blank', rel: 'noopener noreferrer' })
const RATE = 0.75 // every clip plays in a soft slow motion
const saveData = () => typeof navigator !== 'undefined' && navigator.connection?.saveData === true
const stillOnly = () => reducedMotion() || saveData()

/** A numbered section (at most one screen tall). `after` is full-width content below the text column. */
function Sec({ k, n, tone = 'light', className = '', bg = null, after = null, children }) {
  const { t, lang } = useI18n()
  return (
    <section id={sectionId(k, lang)} className={`sec sec--${tone} ${className}`} data-tone="light" aria-labelledby={`${k}-title`}>
      {bg}
      <div className="scontainer sec__grid">
        <p className="sec__eyebrow"><span>{n}</span> — {t(`site.nav.${k}`)}</p>
        <div className="sec__body">{children}</div>
      </div>
      {after}
    </section>
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

// Gallery alt text for known photos; any other file gets its name as a short description.
const GALLERY_ALT = {
  'jump-bay': 'jumpBay', 'families-celebrating': 'families', 'jump-grey': 'jumpGrey', 'rosette-campeon': 'rosette',
  'rider-buckskin': 'rider', 'paddock-herd': 'paddock', 'horse-fence': 'fence', 'girl-horse-closeup': 'closeup',
  'girl-horse-nose': 'nose', 'girl-riding-flamboyan': 'riding', 'horse-blaze': 'hero', 'paddock-face': 'paddockFace',
}
const ROW_H = 240
const MIN_SET = 2600 // px: one set of a row is always wider than the widest screen, so the loop never shows a gap

function fillRow(items) {
  if (!items.length) return []
  const width = items.reduce((s, g) => s + ROW_H * (g.w / g.h) + 16, 0)
  return Array.from({ length: Math.max(1, Math.ceil(MIN_SET / width)) }, () => items).flat()
}

function GalleryRow({ items, dir, alt }) {
  const set = fillRow(items)
  return (
    <div className={`sgallery__row sgallery__row--${dir}`}>
      <div className="sgallery__track">
        {[0, 1].map((copy) => set.map((g, i) => {
          const hidden = copy || i >= items.length
          return (
            <figure key={`${copy}-${i}`} className="sgallery__item" style={{ '--ratio': g.w / g.h }} aria-hidden={hidden ? 'true' : undefined}>
              {g.video
                ? <Clip clip={g} alt={hidden ? '' : alt(g)} />
                : <img src={g.src} width={g.w} height={g.h} alt={hidden ? '' : alt(g)} loading="lazy" decoding="async" />}
            </figure>
          )
        }))}
      </div>
    </div>
  )
}

/** 01 Disfruta: two rows of photos and clips sliding in opposite directions (pause on hover). */
function Enjoy() {
  const { t } = useI18n()
  const alt = (g) => (GALLERY_ALT[g.name] ? t(`site.alt.${GALLERY_ALT[g.name]}`) : g.name.replace(/[-_]+/g, ' '))
  const one = [...GALLERY.filter((_, i) => i % 2 === 0)]
  GALLERY_VIDEOS.forEach((v, i) => one.splice(Math.min(one.length, 1 + i * 2), 0, v))
  const two = GALLERY.filter((_, i) => i % 2 === 1)
  return (
    <Sec k="enjoy" n="01" className="senjoy" after={(
      <div className="sgallery" aria-label={t('site.enjoy.gallery')} role="group">
        <GalleryRow items={one} dir="left" alt={alt} />
        <GalleryRow items={two.length ? two : one} dir="right" alt={alt} />
      </div>
    )}>
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

/** Steps with a line above them that fills left to right as the row comes into view. */
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

/** 02 Qué hacemos: the bento, then "Aprende a montar" as one compact row of 4 steps. */
function Services() {
  const { t, lang, fmtMoney } = useI18n()
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
            <SiteIcon name={s.icon} size={30} className="tile__icon" />
            <h3>{t(`site.services.${s.key}.title`)}</h3>
            <p>{t(`site.services.${s.key}.text`)}</p>
            <Arrow />
          </a>
        ))}
      </div>
      <div className="slearn">
        <h3 className="slearn__title">{t('site.learn.title')}</h3>
        <StepRow id={sectionId('learn', lang)} steps={['trial', 'plan', 'pony', 'show'].map((k) => ({ key: k, title: t(`site.learn.steps.${k}.title`), text: t(`site.learn.steps.${k}.text`) }))} />
      </div>
    </Sec>
  )
}

/** 03 Competencias: the hooves clip on the left, the short stories and the championship on the right. */
function Competitions() {
  const { t } = useI18n()
  return (
    <Sec k="competitions" n="03">
      <Kinetic id="competitions-title" text={t('site.competitions.title')} />
      <div className="scomp">
        <figure className="smedia scomp__media" data-reveal=""><Clip clip={CLIPS.hooves} alt={t('site.alt.hooves')} /></figure>
        <div className="scomp__stories">
          {['training', 'events'].map((k) => (
            <article key={k} className="sstory" data-reveal="">
              <SiteIcon name={k === 'training' ? 'jump' : 'trophy'} size={30} />
              <div>
                <h3>{t(`site.competitions.${k}.title`)}</h3>
                <p>{t(`site.competitions.${k}.text`)}</p>
              </div>
            </article>
          ))}
          <article className="sstory sstory--champion" data-reveal="">
            <ClubPhoto photo={PHOTOS.rosette} alt={t('site.alt.rosette')} className="sstory__round" position="50% 45%" />
            <div>
              <h3>{t('site.competitions.champion.title')}</h3>
              <p>{t('site.competitions.champion.text')}</p>
            </div>
          </article>
          <a className="sbtn sbtn--deep" {...wa(t('site.wa.competitions'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.competitions.cta')}</span></a>
        </div>
      </div>
    </Sec>
  )
}

/** 04 Equinoterapia: one glow panel with the grooming clip, the text, the 3 steps and the CTA. */
function Therapy() {
  const { t } = useI18n()
  return (
    <Sec k="therapy" n="04" tone="mesh">
      <div className="stherapy">
        <figure className="smedia stherapy__media" data-reveal="">
          <Clip clip={CLIPS.grooming} alt={t('site.alt.grooming')} />
          <span className="spill">{t('site.tagSoon')}</span>
        </figure>
        <div className="stherapy__text">
          <Kinetic id="therapy-title" text={t('site.therapy.title')} />
          <p className="slead">{t('site.therapy.what')}</p>
          <p className="slead">{t('site.therapy.who')}</p>
          <p className="snote"><SiteIcon name="shield" size={20} /> {t('site.therapy.alongside')}</p>
        </div>
      </div>
      <StepRow className="ssteps--3" steps={['evaluation', 'weekly', 'review'].map((k) => ({ key: k, title: t(`site.therapy.steps.${k}.title`), text: t(`site.therapy.steps.${k}.text`) }))} />
      <div className="stherapy__cta">
        <a className="sbtn sbtn--deep sbtn--lg" {...wa(t('site.wa.therapy'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.therapy.cta')}</span></a>
        <p className="small">{t('site.therapy.footnote')}</p>
      </div>
    </Sec>
  )
}

/** 05 Pensión y caballos: the herd clip behind a mist scrim, the two panels on top. */
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

const APP_STEPS = [
  { key: 'confirm', icon: 'calendar' },
  { key: 'plan', icon: 'horseshoe' },
  { key: 'pay', icon: 'phone' },
]

/** 06 La app: one screen on mist. The phone (showing Inicio) on the left, the 3 statements on the right. */
function TheApp() {
  const { t } = useI18n()
  return (
    <Sec k="app" n="06">
      <div className="sapp">
        <div className="sapp__phone"><LivePhone src="/vista?control" /></div>
        <div className="sapp__text">
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
        </div>
      </div>
    </Sec>
  )
}

/** 07 Comunidad: the families photo, then whole event cards (3 on a computer, "Ver todos" for the rest; a swipe row with dots on phones). */
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
    <Sec k="community" n="07">
      <Kinetic id="community-title" text={t('site.community.title')} />
      <div className="scommunity">
        <figure className="sfamily" data-reveal="">
          <ClubPhoto photo={PHOTOS.families} alt={t('site.alt.families')} />
          {quote && (
            <figcaption className="sfamily__quote">
              <blockquote>{quote.text}</blockquote>
              <span>{quote.name}{quote.role ? ` · ${quote.role}` : ''}</span>
            </figcaption>
          )}
        </figure>
        <p className="slead scommunity__text">{t('site.community.text')}</p>
      </div>
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
      <Enjoy />
      <Services />
      <Competitions />
      <Therapy />
      <Boarding />
      <TheApp />
      <Community />
      <Visit />
    </>
  )
}
