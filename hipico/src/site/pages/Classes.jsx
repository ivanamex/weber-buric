import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { todayKey } from '../../lib/time.js'
import { Letters } from '../motion.jsx'
import { Card, CtaBand, PageHero, Section, WaButton } from '../parts.jsx'
import { PHOTOS } from '../content.js'
import { planList, useSiteData } from '../siteData.js'

const LEVELS = [
  { key: 'ponies', icon: 'sprout' },
  { key: 'beginner', icon: 'helmet' },
  { key: 'intermediate', icon: 'saddle' },
  { key: 'advanced', icon: 'jump' },
]

/** Pony Friday is the last Friday of each month: the next one from today. */
export function nextPonyFriday(today = todayKey()) {
  let [y, m] = today.split('-').map(Number)
  for (let i = 0; i < 3; i++) {
    const last = new Date(Date.UTC(y, m, 0)) // last day of month m
    last.setUTCDate(last.getUTCDate() - ((last.getUTCDay() + 2) % 7)) // back to Friday
    const key = last.toISOString().slice(0, 10)
    if (key >= today) return key
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return null
}

export function PonyFriday() {
  const { t, fmtDate } = useI18n()
  const next = nextPonyFriday()
  return (
    <article className="spony" data-reveal="">
      <span className="spony__icon"><SiteIcon name="horseshoe" size={40} /></span>
      <div>
        <p className="seyebrow">{t('site.pony.eyebrow')}</p>
        <h3>Pony Friday</h3>
        <p>{t('site.pony.text')}</p>
        <ul className="sfacts">
          <li><SiteIcon name="calendar" size={18} /> {t('site.pony.when')}{next ? ` · ${t('site.pony.next', { date: fmtDate(next, { weekday: 'long', day: 'numeric', month: 'long' }) })}` : ''}</li>
          <li><SiteIcon name="clock" size={18} /> 9:00 – 12:30</li>
          <li><SiteIcon name="users" size={18} /> {t('site.pony.ages')}</li>
          <li><SiteIcon name="horseshoe" size={18} /> {t('site.pony.price')}</li>
        </ul>
        <WaButton text={t('site.wa.pony')} className="sbtn--primary">{t('site.pony.cta')}</WaButton>
      </div>
    </article>
  )
}

export default function Classes() {
  const { t, fmtMoney } = useI18n()
  const data = useSiteData()
  const plans = planList(data?.prices)
  const trial = data?.prices?.class_trial
  return (
    <>
      <PageHero photo={PHOTOS.rider} alt={t('site.alt.rider')} eyebrow={t('site.classes.eyebrow')}
        title={<Letters text={t('site.classes.title')} />} sub={t('site.classes.sub')}>
        <WaButton text={t('site.wa.trial')}>{t('site.home.ctaTrial')}</WaButton>
      </PageHero>

      <Section eyebrow={t('site.classes.levelsEyebrow')} title={t('site.classes.levelsTitle')} lead={t('site.classes.levelsLead')}>
        <div className="sgrid sgrid--4">
          {LEVELS.map((l) => <Card key={l.key} icon={l.icon} title={t(`site.classes.levels.${l.key}.title`)} text={t(`site.classes.levels.${l.key}.text`)} />)}
        </div>
      </Section>

      <Section tone="cream" eyebrow={t('site.classes.plansEyebrow')} title={t('site.classes.plansTitle')} lead={t('site.classes.plansLead')}>
        <div className="sgrid sgrid--4 splans">
          <article className="scard splan splan--trial" data-reveal="">
            <span className="scard__icon"><SiteIcon name="helmet" size={30} /></span>
            <h3>{t('site.classes.trialTitle')}</h3>
            <p>{t('site.classes.trialText')}</p>
            <p className="splan__price">{trial ? fmtMoney(trial) : t('site.askPrices')}</p>
            <WaButton text={t('site.wa.trial')} className="sbtn--accent sbtn--block">{t('site.classes.trialCta')}</WaButton>
          </article>
          {plans.length ? plans.map((p) => (
            <article key={p.classes} className="scard splan" data-reveal="">
              <span className="scard__icon"><SiteIcon name="horseshoe" size={30} /></span>
              <h3>{t('site.classes.planName', { n: p.classes })}</h3>
              <p>{t('site.classes.planText', { n: p.classes / 4 })}</p>
              <p className="splan__price">{fmtMoney(p.price)}<small>{t('site.classes.perMonth')}</small></p>
              <p className="small">{t('site.classes.perClass', { price: fmtMoney(Math.round(p.price / p.classes)) })}</p>
            </article>
          )) : (
            <article className="scard splan" data-reveal="">
              <span className="scard__icon"><SiteIcon name="horseshoe" size={30} /></span>
              <h3>{t('site.classes.plansTitle')}</h3>
              <p className="splan__price">{data ? t('site.askPrices') : '…'}</p>
            </article>
          )}
        </div>
        <p className="snote" data-reveal=""><SiteIcon name="phone" size={18} /> {t('site.classes.plansNote')}</p>
      </Section>

      <Section id="pony">
        <PonyFriday />
      </Section>

      <Section id="estimulacion" tone="cream">
        <article className="sfeature tone--forest" data-reveal="">
          <span className="sfeature__icon"><SiteIcon name="sprout" size={44} /></span>
          <div>
            <p className="seyebrow">{t('site.services.early.title')}</p>
            <h2 className="stitle">{t('site.classes.earlyTitle')}</h2>
            <p className="slead">{t('site.classes.earlyText')}</p>
            <WaButton text={t('site.wa.early')}>{t('site.classes.earlyCta')}</WaButton>
          </div>
        </article>
      </Section>

      <CtaBand title={t('site.classes.ctaTitle')} text={t('site.classes.ctaText')} wa={t('site.wa.trial')} button={t('site.home.ctaTrial')} />
    </>
  )
}
