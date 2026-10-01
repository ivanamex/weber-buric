import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { Letters } from '../motion.jsx'
import { Card, CtaBand, PageHero, Section, WaButton } from '../parts.jsx'
import { PHOTOS } from '../content.js'

const SUPPORTS = ['balance', 'coordination', 'attention', 'communication', 'confidence', 'emotions']
const STEPS = ['interview', 'program', 'horse', 'review']
const FORMATS = [
  { key: 'evaluation', icon: 'compass' },
  { key: 'monthly', icon: 'calendar' },
  { key: 'groups', icon: 'sprout' },
]

export default function Therapy() {
  const { t } = useI18n()
  return (
    <>
      <PageHero photo={PHOTOS.fence} alt={t('site.alt.fence')} eyebrow={t('site.therapy.eyebrow')} tag={t('site.tagSoon')}
        title={<Letters text={t('site.therapy.title')} />} sub={t('site.therapy.sub')}>
        <WaButton text={t('site.wa.therapy')}>{t('site.therapy.cta')}</WaButton>
      </PageHero>

      <Section eyebrow={t('site.therapy.whatEyebrow')} title={t('site.therapy.whatTitle')} lead={t('site.therapy.whatText')}>
        <p className="snote" data-reveal=""><SiteIcon name="sprout" size={18} /> {t('site.therapy.builds')}</p>
      </Section>

      <Section tone="cream" eyebrow={t('site.therapy.whoEyebrow')} title={t('site.therapy.whoTitle')} lead={t('site.therapy.whoLead')}>
        <ul className="sgrid sgrid--3 schecks" data-reveal="">
          {SUPPORTS.map((k) => <li key={k}><SiteIcon name="check" size={20} /> {t(`site.therapy.supports.${k}`)}</li>)}
        </ul>
        <p className="snote snote--strong" data-reveal=""><SiteIcon name="shield" size={20} /> {t('site.therapy.alongside')}</p>
      </Section>

      <Section eyebrow={t('site.therapy.howEyebrow')} title={t('site.therapy.howTitle')}>
        <ol className="ssteps">
          {STEPS.map((k, i) => (
            <li key={k} className="ssteps__item" data-reveal="">
              <span className="ssteps__num">{i + 1}</span>
              <h3>{t(`site.therapy.steps.${k}.title`)}</h3>
              <p>{t(`site.therapy.steps.${k}.text`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="cream" eyebrow={t('site.therapy.formatsEyebrow')} title={t('site.therapy.formatsTitle')}>
        <div className="sgrid sgrid--3">
          {FORMATS.map((f) => (
            <Card key={f.key} icon={f.icon} title={t(`site.therapy.formats.${f.key}.title`)} text={t(`site.therapy.formats.${f.key}.text`)}>
              <p className="splan__price splan__price--sm">{t('site.priceTbd')}</p>
            </Card>
          ))}
        </div>
      </Section>

      <CtaBand title={t('site.therapy.ctaTitle')} text={t('site.therapy.ctaText')} wa={t('site.wa.therapy')} button={t('site.therapy.cta')}>
        <p className="scta__note">{t('site.therapy.footnote')}</p>
      </CtaBand>
    </>
  )
}
