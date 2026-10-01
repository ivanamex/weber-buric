import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { LivePhone } from '../../components/LivePhone.jsx'
import { Counter, Letters, WordBand } from '../motion.jsx'
import { AppButton } from '../SiteLayout.jsx'
import { CtaBand, PageHero, PageLink, Poles, Section, Split, WaButton } from '../parts.jsx'
import { pagePath } from '../routes.js'
import { CONTACT, FIGURES, PHOTOS, TESTIMONIALS, mapDirections, mapEmbed } from '../content.js'

const SERVICES = [
  { key: 'classes', icon: 'helmet', to: 'classes' },
  { key: 'boarding', icon: 'hay', to: 'boarding' },
  { key: 'jumping', icon: 'jump', to: 'competitions' },
  { key: 'therapy', icon: 'heartHand', to: 'therapy', tag: true },
  { key: 'early', icon: 'sprout', to: 'classes', hash: '#estimulacion' },
  { key: 'camps', icon: 'tent', to: 'events' },
  { key: 'parties', icon: 'cake', to: 'events', hash: '#fiestas' },
  { key: 'coaching', icon: 'compass', to: 'contact' },
]
const COUNTERS = ['years', 'horses', 'hectares', 'riders']
const APP_POINTS = [{ key: 'confirm', icon: 'calendar' }, { key: 'plan', icon: 'horseshoe' }, { key: 'pay', icon: 'phone' }]

export default function Home() {
  const { t, lang } = useI18n()
  return (
    <>
      <PageHero variant="cover" tone="forest" photo={PHOTOS.jumpBay} alt={t('site.alt.jumpBay')} position="62% center"
        eyebrow={t('site.home.eyebrow')} title={<Letters text={t('site.home.title')} />} sub={t('site.home.sub')}>
        <WaButton text={t('site.wa.trial')}>{t('site.home.ctaTrial')}</WaButton>
        <AppButton className="sbtn--glass" />
      </PageHero>
      <Poles />

      <section className="scounters" aria-label={t('site.home.countersLabel')}>
        <div className="scontainer scounters__row">
          {COUNTERS.map((k) => (
            <div key={k} className="counter" data-reveal="">
              <Counter value={FIGURES[k]} />
              <span className="counter__label">{t(`site.home.counters.${k}`)}</span>
            </div>
          ))}
        </div>
      </section>

      <Section eyebrow={t('site.home.servicesEyebrow')} title={t('site.home.servicesTitle')}>
        <div className="sgrid sgrid--4 sservices">
          {SERVICES.map((s) => (
            <Link key={s.key} to={pagePath(s.to, lang) + (s.hash || '')} className="scard sservice" data-reveal="">
              <span className="scard__icon"><SiteIcon name={s.icon} size={30} /></span>
              <h3>{t(`site.services.${s.key}.title`)}{s.tag && <span className="stag stag--soft">{t('site.tagNew')}</span>}</h3>
              <p>{t(`site.services.${s.key}.text`)}</p>
              <span className="sservice__go" aria-hidden="true"><SiteIcon name="arrowRight" size={18} /></span>
            </Link>
          ))}
        </div>
      </Section>

      <WordBand words={['HÍPICO', 'RIVIERA MAYA', 'PAAMUL']} />

      <Section tone="cream">
        <Split photo={PHOTOS.families} alt={t('site.alt.families')}>
          <p className="seyebrow">{t('site.home.familyEyebrow')}</p>
          <h2 className="stitle">{t('site.home.familyTitle')}</h2>
          <p className="slead">{t('site.home.familyText')}</p>
          <ul className="sticks">
            {['a', 'b', 'c'].map((k) => <li key={k}><SiteIcon name="check" size={20} /> {t(`site.home.familyPoints.${k}`)}</li>)}
          </ul>
          <PageLink to="classes">{t('site.home.familyLink')}</PageLink>
        </Split>
      </Section>

      <Section>
        <article className="sfeature tone--navy" data-reveal="">
          <span className="sfeature__icon"><SiteIcon name="heartHand" size={44} /></span>
          <div>
            <p className="seyebrow">{t('site.nav.therapy')}<span className="stag">{t('site.tagSoon')}</span></p>
            <h2 className="stitle">{t('site.home.therapyTitle')}</h2>
            <p className="slead">{t('site.home.therapyText')}</p>
            <PageLink to="therapy" className="slinkarrow slinkarrow--light">{t('site.home.therapyLink')}</PageLink>
          </div>
        </article>
      </Section>

      <section className="ssection sapp tone--forest">
        <div className="scontainer sapp__inner">
          <div className="sapp__phone"><LivePhone /></div>
          <div className="sapp__text" data-reveal="">
            <p className="seyebrow">{t('site.home.appEyebrow')}</p>
            <h2 className="stitle">{t('site.home.appTitle')}</h2>
            <p className="slead">{t('site.home.appText')}</p>
            <ul className="sapp__points">
              {APP_POINTS.map((p) => (
                <li key={p.key}><span><SiteIcon name={p.icon} size={24} /></span>{t(`site.home.appPoints.${p.key}`)}</li>
              ))}
            </ul>
            <AppButton className="sbtn--lg">{t('site.home.appCta')}</AppButton>
          </div>
        </div>
      </section>

      {TESTIMONIALS.length > 0 && (
        <Section eyebrow={t('site.home.voicesEyebrow')} title={t('site.home.voicesTitle')}>
          <div className="sgrid sgrid--2">
            {TESTIMONIALS.map((q) => (
              <figure key={q.name} className="squote" data-reveal="">
                <blockquote>{q.text}</blockquote>
                <figcaption>{q.name}{q.role ? ` · ${q.role}` : ''}</figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      <Section tone="cream" eyebrow={t('site.home.whereEyebrow')} title={t('site.home.whereTitle')}>
        <div className="smap" data-reveal="">
          <iframe src={mapEmbed} title={t('site.mapTitle')} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          <div className="smap__card">
            <p className="sfooter__line"><SiteIcon name="pin" size={20} /> <span>{CONTACT.address}</span></p>
            <a className="sbtn sbtn--primary" href={mapDirections} target="_blank" rel="noopener noreferrer"><SiteIcon name="map" size={20} /> {t('site.directions')}</a>
          </div>
        </div>
      </Section>

      <CtaBand title={t('site.home.ctaTitle')} text={t('site.home.ctaText')} wa={t('site.wa.trial')} button={t('site.home.ctaTrial')} />
    </>
  )
}
