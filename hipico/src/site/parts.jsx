// Building blocks shared by the website pages.
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { waLink } from '../components/ui.jsx'
import { Photo } from './motion.jsx'
import { pagePath } from './routes.js'

/** Thin diagonal bands of green, cream and coral, like a jump pole: the website's divider. */
export const Poles = ({ className = '' }) => <div className={`poles ${className}`} aria-hidden="true" />

export function WaButton({ text, children, className = 'sbtn--accent', icon = true }) {
  return (
    <a className={`sbtn ${className}`} href={waLink(text)} target="_blank" rel="noopener noreferrer">
      {icon && <SiteIcon name="whatsapp" size={20} />} {children}
    </a>
  )
}

export function PageLink({ to, children, className = 'slinkarrow', hash = '' }) {
  const { lang } = useI18n()
  return <Link to={pagePath(to, lang) + hash} className={className}>{children} <SiteIcon name="arrowRight" size={18} /></Link>
}

/**
 * A page's opening block on a dark tone. `cover`: the photo fills the block with a dark gradient on the left
 * (never wider than the photo itself on big screens). `split`: text on the left, the photo framed on the right.
 */
export function PageHero({ eyebrow, title, sub, photo, alt, tone = 'forest', variant = 'split', tag, children, position }) {
  return (
    <section className={`shero shero--${variant} tone--${tone}`}>
      {variant === 'cover' && photo && (
        <div className="shero__media">
          <img src={photo.src} alt={alt} width={photo.w} height={photo.h} fetchPriority="high" decoding="async" style={position ? { objectPosition: position } : undefined} />
        </div>
      )}
      <div className="scontainer shero__inner">
        <div className="shero__text">
          {eyebrow && <p className="seyebrow">{eyebrow}{tag && <span className="stag">{tag}</span>}</p>}
          {title}
          {sub && <p className="shero__sub">{sub}</p>}
          {children && <div className="shero__ctas">{children}</div>}
        </div>
        {variant === 'split' && photo && (
          <div className={`shero__frame ${photo.h > photo.w ? 'is-tall' : ''}`}>
            <img src={photo.src} alt={alt} width={photo.w} height={photo.h} fetchPriority="high" decoding="async" style={position ? { objectPosition: position } : undefined} />
          </div>
        )}
        {variant === 'plain' && <div className="shero__mark" aria-hidden="true"><SiteIcon name="horseshoe" size={220} /></div>}
      </div>
    </section>
  )
}

export function Section({ id, eyebrow, title, lead, tone = '', children, className = '' }) {
  return (
    <section id={id} className={`ssection ${tone ? `ssection--${tone}` : ''} ${className}`}>
      <div className="scontainer">
        {(eyebrow || title) && (
          <header className="ssection__head" data-reveal="">
            {eyebrow && <p className="seyebrow">{eyebrow}</p>}
            {title && <h2 className="stitle">{title}</h2>}
            {lead && <p className="slead">{lead}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}

/** Text on one side, a framed photo on the other (stacked on phones). */
export function Split({ photo, alt, reverse = false, children, position }) {
  return (
    <div className={`ssplit ${reverse ? 'ssplit--rev' : ''} ${photo.h > photo.w ? 'ssplit--tall' : ''}`}>
      <Photo src={photo.src} alt={alt} width={photo.w} height={photo.h} position={position} />
      <div className="ssplit__text" data-reveal="">{children}</div>
    </div>
  )
}

export function Card({ icon, title, text, tag, children, to, hash, className = '' }) {
  const { t } = useI18n()
  return (
    <article className={`scard ${className}`} data-reveal="">
      {icon && <span className="scard__icon"><SiteIcon name={icon} size={30} /></span>}
      <h3>{title}{tag && <span className="stag stag--soft">{tag}</span>}</h3>
      {text && <p>{text}</p>}
      {children}
      {to && <PageLink to={to} hash={hash}>{t('site.more')}</PageLink>}
    </article>
  )
}

/** The closing call to action of a page: a dark band with the jump-pole stripes on top. */
export function CtaBand({ title, text, wa, button, children }) {
  return (
    <section className="scta">
      <Poles />
      <div className="scontainer scta__inner" data-reveal="">
        <h2>{title}</h2>
        {text && <p>{text}</p>}
        <div className="scta__actions">
          {wa && <WaButton text={wa}>{button}</WaButton>}
          {children}
        </div>
      </div>
    </section>
  )
}
