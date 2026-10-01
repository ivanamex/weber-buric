import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { Letters } from '../motion.jsx'
import { AppButton } from '../SiteLayout.jsx'
import { Card, CtaBand, PageHero, Section, WaButton } from '../parts.jsx'
import { PHOTOS } from '../content.js'

const CARE = [
  { key: 'daily', icon: 'heart' },
  { key: 'feed', icon: 'hay' },
  { key: 'vet', icon: 'shield' },
  { key: 'farrier', icon: 'horseshoe' },
]

export default function Boarding() {
  const { t } = useI18n()
  return (
    <>
      <PageHero photo={PHOTOS.paddock} alt={t('site.alt.paddock')} eyebrow={t('site.boarding.eyebrow')}
        title={<Letters text={t('site.boarding.title')} />} sub={t('site.boarding.sub')}>
        <WaButton text={t('site.wa.boarding')}>{t('site.boarding.cta')}</WaButton>
      </PageHero>

      <Section eyebrow={t('site.boarding.careEyebrow')} title={t('site.boarding.careTitle')}>
        <div className="sgrid sgrid--4">
          {CARE.map((c) => <Card key={c.key} icon={c.icon} title={t(`site.boarding.care.${c.key}.title`)} text={t(`site.boarding.care.${c.key}.text`)} />)}
        </div>
      </Section>

      <Section tone="cream" eyebrow={t('site.boarding.paddocksEyebrow')} title={t('site.boarding.paddocksTitle')} lead={t('site.boarding.paddocksText')} />

      <Section>
        <article className="sfeature tone--forest" data-reveal="">
          <span className="sfeature__icon"><SiteIcon name="phone" size={44} /></span>
          <div>
            <p className="seyebrow">{t('site.boarding.appEyebrow')}</p>
            <h2 className="stitle">{t('site.boarding.appTitle')}</h2>
            <p className="slead">{t('site.boarding.appText')}</p>
            <ul className="sticks sticks--light">
              {['a', 'b', 'c'].map((k) => <li key={k}><SiteIcon name="check" size={20} /> {t(`site.boarding.appPoints.${k}`)}</li>)}
            </ul>
            <AppButton />
          </div>
        </article>
      </Section>

      <CtaBand title={t('site.boarding.ctaTitle')} text={t('site.boarding.ctaText')} wa={t('site.wa.boarding')} button={t('site.boarding.cta')} />
    </>
  )
}
