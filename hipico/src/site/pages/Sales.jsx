import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { Letters } from '../motion.jsx'
import { CtaBand, PageHero, Section, WaButton } from '../parts.jsx'
import { useSiteData } from '../siteData.js'

function HorseCard({ h }) {
  const { t } = useI18n()
  const facts = [
    h.age != null && t('site.sales.age', { n: h.age }),
    h.level && t(`levels.${h.level}`),
    h.breed,
  ].filter(Boolean)
  return (
    <article className="scard shorse" data-reveal="">
      <div className="shorse__photo">
        {h.photo
          ? <img src={h.photo} alt={t('site.sales.photoAlt', { name: h.name })} loading="lazy" decoding="async" width="600" height="450" />
          : <SiteIcon name="horseshoe" size={64} />}
      </div>
      <h3>{h.name}</h3>
      {facts.length > 0 && <p>{facts.join(' · ')}</p>}
      <WaButton text={t('site.wa.horse', { name: h.name })} className="sbtn--primary sbtn--block">{t('site.sales.ask')}</WaButton>
    </article>
  )
}

export default function Sales() {
  const { t } = useI18n()
  const data = useSiteData()
  const horses = data?.sales || []
  return (
    <>
      <PageHero variant="plain" tone="navy" eyebrow={t('site.sales.eyebrow')}
        title={<Letters text={t('site.sales.title')} />} sub={t('site.sales.sub')} />

      <Section>
        {!data ? <p className="slead center">…</p> : horses.length ? (
          <div className="sgrid sgrid--3">{horses.map((h) => <HorseCard key={h.id} h={h} />)}</div>
        ) : (
          <div className="sempty" data-reveal="">
            <SiteIcon name="saddle" size={44} />
            <h3>{t('site.sales.emptyTitle')}</h3>
            <p>{t('site.sales.emptyText')}</p>
            <WaButton text={t('site.wa.horses')} className="sbtn--primary">{t('site.sales.emptyCta')}</WaButton>
          </div>
        )}
      </Section>

      <CtaBand title={t('site.sales.ctaTitle')} text={t('site.sales.ctaText')} wa={t('site.wa.horses')} button={t('site.sales.emptyCta')} />
    </>
  )
}
