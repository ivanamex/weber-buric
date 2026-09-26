import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { BrandLogo, Logo, Mark } from '../components/Logo.jsx'
import { LangToggle } from '../components/LangToggle.jsx'
import { Icon } from '../components/Icon.jsx'
import { Horseshoes, waLink } from '../components/ui.jsx'
import { InstallButtons } from '../components/Install.jsx'

const STEPS = [
  { key: 'book', icon: 'calendar' },
  { key: 'plan', icon: 'horseshoe' },
  { key: 'pay', icon: 'phone' },
]
const FEATURES = [
  { key: 'bookings', icon: 'calendar' },
  { key: 'plans', icon: 'horseshoe' },
  { key: 'boarding', icon: 'barn' },
  { key: 'rental', icon: 'horseHead' },
  { key: 'events', icon: 'balloons' },
  { key: 'admin', icon: 'chart' },
]

function PhonePreview() {
  const { t } = useI18n()
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone__notch" />
      <div className="phone__screen">
        <div className="phone__top">
          <Mark size={30} />
          <span>{t('landing.preview.hello')}</span>
        </div>
        <div className="phone__card phone__card--green">
          <small>{t('landing.preview.next')}</small>
          <strong>{t('landing.preview.class')}</strong>
          <span>{t('landing.preview.when')}</span>
        </div>
        <div className="phone__card">
          <small>{t('landing.preview.plan')}</small>
          <strong>{t('landing.preview.progress')}</strong>
          <Horseshoes used={5} total={8} label={t('landing.preview.progress')} />
        </div>
        <div className="phone__card phone__card--row">
          <Icon name="saddle" size={18} />
          <span>{t('landing.preview.boarding')}</span>
          <em>✓</em>
        </div>
        <div className="phone__tabs">
          <Icon name="horseHead" size={16} /><Icon name="calendar" size={16} /><Icon name="horseshoe" size={16} /><Icon name="more" size={16} />
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const { t } = useI18n()
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="landing">
      <header className="lheader">
        <div className="container lheader__inner">
          <Link to="/" aria-label="Hípico Riviera Maya"><Logo light compact /></Link>
          <div className="lheader__actions">
            <LangToggle light />
            <Link to="/app" className="btn btn--accent btn--sm lheader__cta">{t('landing.openShort')}</Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero__bg" aria-hidden="true">
          <svg viewBox="0 0 600 600"><circle cx="300" cy="300" r="220" /><circle cx="300" cy="300" r="290" /></svg>
        </div>
        <div className="container hero__inner">
          <div className="hero__copy">
            <BrandLogo variant="white" height={64} className="hero__logo" />
            <p className="eyebrow eyebrow--accent">{t('landing.eyebrow')}</p>
            <h1>{t('landing.headline')}</h1>
            <p className="hero__sub">{t('landing.subline')}</p>
            <div className="hero__ctas">
              <Link to="/app" className="btn btn--accent btn--lg">
                {t('landing.ctaOpen')} <Icon name="arrowRight" size={20} />
              </Link>
              <button type="button" className="btn btn--ghost-light btn--lg" onClick={() => scrollTo('features')}>
                {t('landing.ctaHow')} <Icon name="arrowDown" size={20} />
              </button>
            </div>
            <p className="hero__note"><Icon name="shield" size={16} /> {t('landing.heroNote')}</p>
          </div>
          <PhonePreview />
        </div>
      </section>

      <section className="lsection" id="how">
        <div className="container">
          <p className="eyebrow">{t('landing.how.eyebrow')}</p>
          <h2 className="lsection__title">{t('landing.how.title')}</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.key} className="step">
                <span className="step__num">{i + 1}</span>
                <span className="step__icon"><Icon name={s.icon} size={28} /></span>
                <h3>{t(`landing.how.${s.key}.title`)}</h3>
                <p>{t(`landing.how.${s.key}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lsection lsection--tint" id="features">
        <div className="container">
          <p className="eyebrow">{t('landing.features.eyebrow')}</p>
          <h2 className="lsection__title">{t('landing.features.title')}</h2>
          <div className="features">
            {FEATURES.map((f) => (
              <article key={f.key} className="feature">
                <span className="feature__icon"><Icon name={f.icon} size={28} /></span>
                <h3>{t(`landing.features.${f.key}.title`)}</h3>
                <p>{t(`landing.features.${f.key}.text`)}</p>
              </article>
            ))}
          </div>
          <div className="center">
            <Link to="/app" className="btn btn--primary btn--lg">{t('landing.ctaOpen')} <Icon name="arrowRight" size={20} /></Link>
          </div>
        </div>
      </section>

      <section className="lsection" id="install">
        <div className="container install">
          <div>
            <p className="eyebrow">{t('landing.install.eyebrow')}</p>
            <h2 className="lsection__title">{t('landing.install.title')}</h2>
            <p className="lsection__lead">{t('landing.install.text')}</p>
          </div>
          <InstallButtons />
        </div>
      </section>

      <footer className="lfooter">
        <div className="container lfooter__inner">
          <div>
            <Logo light />
            <p className="lfooter__place">{t('landing.footer.place')}</p>
          </div>
          <div className="lfooter__actions">
            <a className="btn btn--whatsapp" href={waLink(t('landing.footer.waText'))} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={20} /> WhatsApp
            </a>
            <LangToggle light />
          </div>
        </div>
        <div className="container lfooter__legal">
          <span>© {new Date().getFullYear()} Hípico Riviera Maya</span>
          <span>{t('landing.footer.demo')}</span>
        </div>
      </footer>
    </div>
  )
}
