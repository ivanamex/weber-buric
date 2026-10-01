import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { waLink } from '../../components/ui.jsx'
import { Letters } from '../motion.jsx'
import { PageHero, Section } from '../parts.jsx'
import { CONTACT, PHOTOS, mapDirections, mapEmbed } from '../content.js'

const TOPICS = ['classes', 'trial', 'boarding', 'competitions', 'therapy', 'events', 'horses', 'other']

/** A simple form that opens WhatsApp with the message already written (nothing is stored). */
function ContactForm() {
  const { t } = useI18n()
  const [f, setF] = useState({ name: '', topic: 'classes', message: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const send = (e) => {
    e.preventDefault()
    const text = [
      t('site.contact.waHello', { name: f.name.trim() || '—' }),
      t('site.contact.waTopic', { topic: t(`site.contact.topics.${f.topic}`) }),
      f.message.trim(),
    ].filter(Boolean).join('\n')
    window.open(waLink(text), '_blank', 'noopener')
  }
  return (
    <form className="sform scard" onSubmit={send} data-reveal="">
      <h2 className="stitle stitle--sm">{t('site.contact.formTitle')}</h2>
      <label className="sfield">
        <span>{t('site.contact.name')}</span>
        <input value={f.name} onChange={set('name')} autoComplete="name" required maxLength={80} />
      </label>
      <label className="sfield">
        <span>{t('site.contact.topic')}</span>
        <select value={f.topic} onChange={set('topic')}>
          {TOPICS.map((k) => <option key={k} value={k}>{t(`site.contact.topics.${k}`)}</option>)}
        </select>
      </label>
      <label className="sfield">
        <span>{t('site.contact.message')}</span>
        <textarea value={f.message} onChange={set('message')} rows={4} maxLength={800} />
      </label>
      <button type="submit" className="sbtn sbtn--accent sbtn--block sbtn--lg"><SiteIcon name="whatsapp" size={20} /> {t('site.contact.send')}</button>
      <p className="small muted">{t('site.contact.formNote')}</p>
    </form>
  )
}

export default function Contact() {
  const { t } = useI18n()
  return (
    <>
      <PageHero photo={PHOTOS.fence} alt={t('site.alt.fence')} eyebrow={t('site.contact.eyebrow')}
        title={<Letters text={t('site.contact.title')} />} sub={t('site.contact.sub')} />

      <Section>
        <div className="scontact">
          <div className="scontact__info" data-reveal="">
            <ul className="sinfo">
              <li><SiteIcon name="pin" /><div><strong>{t('site.contact.address')}</strong><span>{CONTACT.address}</span></div></li>
              <li><SiteIcon name="call" /><div><strong>{t('site.contact.phone')}</strong><a href={CONTACT.phoneHref}>{CONTACT.phone}</a></div></li>
              <li><SiteIcon name="whatsapp" /><div><strong>WhatsApp</strong><a href={waLink(t('site.wa.general'))} target="_blank" rel="noopener noreferrer">wa.me/529841436457</a></div></li>
              <li><SiteIcon name="mail" /><div><strong>{t('site.contact.email')}</strong><a className="break" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div></li>
              <li><SiteIcon name="instagram" /><div><strong>Instagram</strong><a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer">{CONTACT.instagramHandle}</a></div></li>
              <li><SiteIcon name="facebook" /><div><strong>Facebook</strong><a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer">hipicorivieramaya</a></div></li>
            </ul>
          </div>
          <ContactForm />
        </div>
      </Section>

      <Section tone="cream" eyebrow={t('site.home.whereEyebrow')} title={t('site.home.whereTitle')}>
        <div className="smap" data-reveal="">
          <iframe src={mapEmbed} title={t('site.mapTitle')} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          <div className="smap__card">
            <p className="sfooter__line"><SiteIcon name="pin" size={20} /> <span>{CONTACT.address}</span></p>
            <a className="sbtn sbtn--primary" href={mapDirections} target="_blank" rel="noopener noreferrer"><SiteIcon name="map" size={20} /> {t('site.directions')}</a>
          </div>
        </div>
      </Section>
    </>
  )
}
