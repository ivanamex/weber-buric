import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { Letters } from '../motion.jsx'
import { Card, CtaBand, PageHero, Section, Split, WaButton } from '../parts.jsx'
import { PHOTOS } from '../content.js'

const TRAINING = [
  { key: 'technique', icon: 'jump' },
  { key: 'heights', icon: 'saddle' },
  { key: 'shows', icon: 'trophy' },
]

export default function Competitions() {
  const { t } = useI18n()
  return (
    <>
      <PageHero tone="navy" photo={PHOTOS.jumpGrey} alt={t('site.alt.jumpGrey')} eyebrow={t('site.competitions.eyebrow')}
        title={<Letters text={t('site.competitions.title')} />} sub={t('site.competitions.sub')}>
        <WaButton text={t('site.wa.competitions')}>{t('site.competitions.cta')}</WaButton>
      </PageHero>

      <Section eyebrow={t('site.competitions.trainingEyebrow')} title={t('site.competitions.trainingTitle')} lead={t('site.competitions.trainingLead')}>
        <div className="sgrid sgrid--3">
          {TRAINING.map((c) => <Card key={c.key} icon={c.icon} title={t(`site.competitions.training.${c.key}.title`)} text={t(`site.competitions.training.${c.key}.text`)} />)}
        </div>
      </Section>

      <Section tone="navy">
        <Split photo={PHOTOS.rosette} alt={t('site.alt.rosette')} reverse>
          <p className="seyebrow"><SiteIcon name="rosette" size={20} /> {t('site.competitions.championEyebrow')}</p>
          <h2 className="stitle">{t('site.competitions.championTitle')}</h2>
          <p className="slead">{t('site.competitions.championText')}</p>
        </Split>
      </Section>

      <Section eyebrow={t('site.competitions.resultsEyebrow')} title={t('site.competitions.resultsTitle')}>
        <div className="sempty" data-reveal="">
          <SiteIcon name="trophy" size={40} />
          <p>{t('site.competitions.resultsEmpty')}</p>
        </div>
      </Section>

      <CtaBand title={t('site.competitions.ctaTitle')} text={t('site.competitions.ctaText')} wa={t('site.wa.competitions')} button={t('site.competitions.cta')} />
    </>
  )
}
