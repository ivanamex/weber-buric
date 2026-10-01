import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { Letters } from '../motion.jsx'
import { Card, CtaBand, PageHero, Section, WaButton } from '../parts.jsx'
import { PHOTOS } from '../content.js'
import { useSiteData } from '../siteData.js'
import { PonyFriday } from './Classes.jsx'

const KINDS = [
  { key: 'summer', icon: 'tent', wa: 'camps' },
  { key: 'holiday', icon: 'calendar', wa: 'camps' },
]

function Upcoming() {
  const { t, fmtDate, fmtMoney } = useI18n()
  const data = useSiteData()
  const events = data?.events || []
  if (!events.length) return null
  return (
    <Section tone="cream" eyebrow={t('site.events.upcomingEyebrow')} title={t('site.events.upcomingTitle')}>
      <ul className="sgrid sgrid--3 sevents">
        {events.map((e) => (
          <li key={e.id} className="scard sevent" data-reveal="">
            <span className="sevent__date">
              <strong>{fmtDate(e.startDate, { day: 'numeric' })}</strong>
              <span>{fmtDate(e.startDate, { month: 'short' }).replace('.', '')}</span>
            </span>
            <div>
              <h3>{t(`site.events.types.${e.type}`) === `site.events.types.${e.type}` ? t('site.events.types.camp') : t(`site.events.types.${e.type}`)}</h3>
              <p>{fmtDate(e.startDate, { day: 'numeric', month: 'long' })} – {fmtDate(e.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {e.ages && <p className="small">{t('site.events.ages', { ages: e.ages })}</p>}
              {e.price > 0 && <p className="small">{t('site.events.price', { price: fmtMoney(e.price) })}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export default function Events() {
  const { t } = useI18n()
  return (
    <>
      <PageHero photo={PHOTOS.families} alt={t('site.alt.families')} eyebrow={t('site.events.eyebrow')}
        title={<Letters text={t('site.events.title')} />} sub={t('site.events.sub')}>
        <WaButton text={t('site.wa.camps')}>{t('site.events.cta')}</WaButton>
      </PageHero>

      <Upcoming />

      <Section eyebrow={t('site.events.campsEyebrow')} title={t('site.events.campsTitle')} lead={t('site.events.campsLead')}>
        <div className="sgrid sgrid--2">
          {KINDS.map((k) => (
            <Card key={k.key} icon={k.icon} title={t(`site.events.kinds.${k.key}.title`)} text={t(`site.events.kinds.${k.key}.text`)}>
              <WaButton text={t(`site.wa.${k.wa}`)} className="sbtn--primary">{t('site.events.ask')}</WaButton>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="fiestas" tone="cream">
        <article className="sfeature tone--navy" data-reveal="">
          <span className="sfeature__icon"><SiteIcon name="cake" size={44} /></span>
          <div>
            <p className="seyebrow">{t('site.events.partiesEyebrow')}</p>
            <h2 className="stitle">{t('site.events.partiesTitle')}</h2>
            <p className="slead">{t('site.events.partiesText')}</p>
            <WaButton text={t('site.wa.parties')}>{t('site.events.partiesCta')}</WaButton>
          </div>
        </article>
      </Section>

      <Section id="pony">
        <PonyFriday />
      </Section>

      <CtaBand title={t('site.events.ctaTitle')} text={t('site.events.ctaText')} wa={t('site.wa.camps')} button={t('site.events.cta')} />
    </>
  )
}
