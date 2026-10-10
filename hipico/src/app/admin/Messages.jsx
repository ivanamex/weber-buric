import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, contactMessages, markContactMessage } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { Empty, Segmented } from '../../components/ui.jsx'
import { Sheet } from '../../components/EditKit.jsx'
import { DataTable, useDeskSearch, useDesktop } from '../../components/Desk.jsx'
import { StatusPill } from '../../components/Colors.jsx'
import { useToast } from '../../components/Toast.jsx'
import { waTo } from '../../lib/phone.js'

const VIEWS = ['new', 'answered', 'all']

/** Mensajes: what people write from the website. New ones first; open one to reply by WhatsApp or email and mark it answered. */
export default function AdminMessages() {
  const { t, fmtInstant } = useI18n()
  const s = useStore()
  const desk = useDesktop()
  const q = useDeskSearch(t('messages.searchPh'))
  const [shown, setShown] = useState('new')
  const [open, setOpen] = useState(null)
  const all = contactMessages(s)
  const serviceName = (m) => (m.service ? t(`site.sheet.${m.service}.title`) : t('messages.general'))
  const rows = all
    .filter((m) => shown === 'all' || m.status === shown)
    .filter((m) => !q || [m.name, m.message, m.phone, m.email, serviceName(m)].some((v) => v?.toLowerCase().includes(q)))
  const when = (iso) => fmtInstant(iso, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  const selected = open && all.find((m) => m.id === open)
  const counts = { new: all.filter((m) => m.status === 'new').length, answered: all.filter((m) => m.status === 'answered').length, all: all.length }
  const State = ({ m }) => <StatusPill status={m.status === 'new' ? 'review' : 'paid'}>{t(m.status === 'new' ? 'messages.stateNew' : 'messages.stateAnswered')}</StatusPill>
  const Channel = ({ m }) => <span className="row gap-sm"><Icon name={m.channel === 'email' ? 'mail' : 'whatsapp'} size={16} /> {m.channel === 'email' ? m.email : m.phone}</span>
  const columns = [
    { key: 'name', label: t('messages.col.name'), value: (m) => m.name, render: (m) => <span className="dtable__strong">{m.name}</span> },
    { key: 'service', label: t('messages.col.service'), value: (m) => serviceName(m) },
    { key: 'channel', label: t('messages.col.channel'), value: (m) => m.channel, csv: (m) => m.channel === 'email' ? m.email : m.phone, render: (m) => <Channel m={m} /> },
    { key: 'date', nowrap: true, label: t('messages.col.date'), value: (m) => m.createdAt, render: (m) => when(m.createdAt), csv: (m) => m.createdAt },
    { key: 'state', label: t('desk.status'), value: (m) => (m.status === 'new' ? 0 : 1), csv: (m) => t(m.status === 'new' ? 'messages.stateNew' : 'messages.stateAnswered'), render: (m) => <State m={m} /> },
  ]
  const empty = <Empty icon="mail" title={t(shown === 'new' ? 'messages.none' : shown === 'answered' ? 'messages.noneAnswered' : 'messages.noneAll')} />
  return (
    <div className="page">
      {!desk && <h1 className="page__title">{t('messages.title')}</h1>}
      <p className="small muted">{t('messages.intro')}</p>
      <div className="dtoolbar">
        <Segmented small value={shown} onChange={setShown} options={VIEWS.map((v) => ({ value: v, label: `${t(`messages.${v}`)}${counts[v] ? ` (${counts[v]})` : ''}` }))} />
      </div>
      {desk ? (
        <DataTable columns={columns} rows={rows} onRow={(m) => setOpen(m.id)} selected={open} defaultSort={{ key: 'date', dir: -1 }} empty={empty} />
      ) : rows.length ? (
        <ul className="card list">
          {rows.map((m) => (
            <li key={m.id} className="list__row msgrow">
              <button type="button" className="msgrow__btn" onClick={() => setOpen(m.id)} aria-label={`${m.name} · ${serviceName(m)}`}>
                <Icon name={m.channel === 'email' ? 'mail' : 'whatsapp'} size={18} />
                <span className="grow">
                  <span className="list__title">{m.name}{m.status === 'new' && <span className="msgrow__new" aria-hidden="true" />}</span>
                  <span className="small muted">{serviceName(m)} · {when(m.createdAt)}</span>
                  <span className="small msgrow__preview">{m.message}</span>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : empty}
      {selected && (
        <Sheet title={selected.name} onClose={() => setOpen(null)}>
          <MessageDetail m={selected} serviceName={serviceName} when={when} />
        </Sheet>
      )}
    </div>
  )
}

function MessageDetail({ m, serviceName, when }) {
  const { t } = useI18n()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const first = m.name.split(/\s+/)[0]
  const wa = waTo(m.phone, t('messages.replyText', { name: first }))
  const mail = m.email ? `mailto:${m.email}?subject=${encodeURIComponent(t('messages.replySubject'))}&body=${encodeURIComponent(t('messages.replyText', { name: first }))}` : ''
  const mark = async () => {
    setBusy(true)
    const res = await markContactMessage(m.id, m.status === 'new' ? 'answered' : 'new')
    setBusy(false)
    if (!res.ok) toast(t(`errors.${res.code}`), 'error')
  }
  return (
    <div className="card msg">
      <p className="row gap-sm wrap">
        <StatusPill status={m.status === 'new' ? 'review' : 'paid'}>{t(m.status === 'new' ? 'messages.stateNew' : 'messages.stateAnswered')}</StatusPill>
        <span className="chip">{serviceName(m)}</span>
      </p>
      <p className="small muted mt8">
        {t('messages.receivedOn', { date: when(m.createdAt) })} · {t('messages.prefers', { channel: t(`messages.channels.${m.channel}`) })}
        {m.lang === 'en' ? ` · ${t('messages.writtenIn')}` : ''}
      </p>
      <p className="msg__text">{m.message || '—'}</p>
      <ul className="msg__contact">
        {m.phone && <li><Icon name="phone" size={18} /><a href={`tel:${m.phone.replace(/[^\d+]/g, '')}`}>{m.phone}</a></li>}
        {m.email && <li><Icon name="mail" size={18} /><a className="break" href={`mailto:${m.email}`}>{m.email}</a></li>}
      </ul>
      <div className="row gap-sm wrap mt12">
        {wa && <a className="btn btn--primary" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> {t('messages.replyWa')}</a>}
        {mail && <a className={`btn ${wa ? 'btn--slate' : 'btn--primary'}`} href={mail}><Icon name="mail" size={18} /> {t('messages.replyEmail')}</a>}
      </div>
      <button type="button" className="btn btn--outline mt12" disabled={busy} onClick={mark}>
        <Icon name={m.status === 'new' ? 'check' : 'refresh'} size={18} /> {t(m.status === 'new' ? 'messages.markAnswered' : 'messages.markNew')}
      </button>
      {m.answeredAt && <p className="small muted mt8">{t('messages.answeredOn', { date: when(m.answeredAt) })}</p>}
    </div>
  )
}
