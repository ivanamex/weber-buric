import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, byId, moduleOn, setShopOrderStatus, saveShopProduct, setShopProductActive, uploadShopPhoto } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { Empty, Segmented } from '../../components/ui.jsx'
import { ConfirmDialog, SaveBar, Sheet, useFormState } from '../../components/EditKit.jsx'
import { DataTable, exportCsv, useDesktop, useDeskAction, useDeskSearch } from '../../components/Desk.jsx'
import { StatusPill } from '../../components/Colors.jsx'
import { useToast } from '../../components/Toast.jsx'
import { waTo } from '../../lib/phone.js'
import { todayKey } from '../../lib/time.js'
import { useBase } from '../Backend.jsx'
import { useSave } from './useSave.js'
import { CATEGORIES, STICKERS, SIZE_CHIPS, KID_SIZES, ORDER_FILTERS, nextStatus, orderLine, stockNum, shopPhoto } from '../../data/shop.js'
import { OrderPill, ProductCardPreview } from '../../site/shop/ShopParts.jsx'

const FILTERS = Object.keys(ORDER_FILTERS)

/** Dirección → Tienda: the orders (what to order from FreeRide, what's ready, what was delivered) and the products. */
export default function AdminShop() {
  const { t } = useI18n()
  const s = useStore()
  const base = useBase()
  const desk = useDesktop()
  const [params, setParams] = useSearchParams()
  const view = params.get('vista') === 'productos' ? 'products' : 'orders'
  const setView = (v) => setParams(v === 'products' ? { vista: 'productos' } : {}, { replace: true })
  if (!moduleOn(s, 'moduleShop')) return <Navigate to={`${base}/direccion`} replace />
  return (
    <div className="page shopadmin">
      {!desk && <h1 className="page__title">{t('shop.nav')}</h1>}
      <div className={desk ? 'drows' : 'dtoolbar'}>
        <div className="drows__tabs">
          <Segmented value={view} onChange={setView} options={[{ value: 'orders', label: t('shop.panel.tabs.orders') }, { value: 'products', label: t('shop.panel.tabs.products') }]} />
        </div>
      </div>
      {view === 'orders' ? <Orders /> : <Products />}
    </div>
  )
}

/* ───────── Pedidos ───────── */

/** The order's charge as a pill: Pagado · Por revisar · Paga en el club · Pendiente. */
function payState(s, o) {
  const pays = s.payments.filter((p) => p.service === 'shop' && p.meta?.order === o.id)
  if (!pays.length) return { status: 'neutral', key: 'none', pays }
  if (pays.every((p) => p.status === 'paid')) return { status: 'paid', key: 'paid', pays }
  if (pays.some((p) => p.status === 'pending' && p.receiptStatus === 'review')) return { status: 'review', key: 'review', pays }
  if (pays.some((p) => p.status === 'pending' && p.meta?.payAtClub)) return { status: 'pending', key: 'club', pays }
  return { status: 'pending', key: 'pending', pays }
}

function Orders() {
  const { t, fmtMoney, fmtInstant } = useI18n()
  const s = useStore()
  const desk = useDesktop()
  const q = useDeskSearch(t('shop.panel.searchOrders'))
  const [filter, setFilter] = useState('nuevos')
  const [open, setOpen] = useState(null)
  const all = s.shopOrders || []
  const counts = Object.fromEntries(FILTERS.map((f) => [f, all.filter(ORDER_FILTERS[f]).length]))
  const rows = all.filter(ORDER_FILTERS[filter])
    .filter((o) => !q || [String(o.number), o.name, o.phone, o.email, ...o.items.map(orderLine)].some((v) => v?.toLowerCase().includes(q)))
  const when = (iso) => fmtInstant(iso, { day: 'numeric', month: 'short' })
  const Pay = ({ o }) => { const p = payState(s, o); return <StatusPill status={p.status}>{t(`shop.panel.pay.${p.key}`)}</StatusPill> }
  const columns = [
    { key: 'number', label: '#', value: (o) => o.number, render: (o) => <span className="dtable__strong">#{o.number}</span> },
    { key: 'date', nowrap: true, label: t('shop.panel.cols.date'), value: (o) => o.createdAt, render: (o) => when(o.createdAt), csv: (o) => o.createdAt.slice(0, 10) },
    { key: 'buyer', label: t('shop.panel.cols.buyer'), value: (o) => o.name, csv: (o) => `${o.name} ${o.phone || ''}`, render: (o) => <span className="dtwo"><b>{o.name}</b><span className="small muted">{o.phone || o.email}</span></span> },
    { key: 'items', label: t('shop.panel.cols.items'), value: (o) => o.items.map(orderLine).join(', '), render: (o) => <span className="dtwo">{o.items.map((l, i) => <span key={i}>{orderLine(l)}{l.onOrder ? ` · ${t('shop.onOrder').toLowerCase()}` : ''}</span>)}</span> },
    { key: 'total', align: 'right', label: t('shop.panel.cols.total'), value: (o) => o.total, render: (o) => fmtMoney(o.total) },
    { key: 'pay', label: t('shop.panel.cols.payment'), value: (o) => payState(s, o).key, csv: (o) => t(`shop.panel.pay.${payState(s, o).key}`), render: (o) => <Pay o={o} /> },
    { key: 'status', label: t('shop.panel.cols.status'), value: (o) => o.status, csv: (o) => t(`shop.status.${o.status}`), render: (o) => <OrderPill status={o.status} /> },
  ]
  useDeskAction([{ label: t('desk.export'), icon: 'download', onClick: () => exportCsv(`pedidos-${todayKey()}.csv`, columns, rows) }], [rows.length, filter, q])
  const empty = <Empty icon="bag" title={t(all.length ? 'shop.panel.empty.filtered' : 'shop.panel.empty.orders')} />
  const selected = open && byId(all, open)
  return (
    <>
      <div className="chips-scroll chips-scroll--fade" role="group" aria-label={t('shop.panel.cols.status')}>
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`chip ${filter === f ? 'is-active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {t(`shop.panel.filters.${f}`)}{counts[f] ? ` (${counts[f]})` : ''}
          </button>
        ))}
      </div>
      {desk ? (
        <DataTable columns={columns} rows={rows} onRow={(o) => setOpen(o.id)} selected={open} defaultSort={{ key: 'number', dir: -1 }} empty={empty} />
      ) : rows.length ? (
        <ul className="card list">
          {rows.map((o) => (
            <li key={o.id} className="list__row msgrow">
              <button type="button" className="msgrow__btn" onClick={() => setOpen(o.id)} aria-label={`#${o.number} · ${o.name}`}>
                <Icon name="bag" size={18} />
                <span className="grow">
                  <span className="list__title">#{o.number} · {o.name}</span>
                  <span className="small muted">{when(o.createdAt)} · {fmtMoney(o.total)}</span>
                  <span className="small msgrow__preview">{o.items.map(orderLine).join(' · ')}</span>
                  <span className="row gap-sm wrap mt8"><OrderPill status={o.status} /><Pay o={o} /></span>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : empty}
      {selected && (
        <Sheet title={t('shop.panel.orderTitle', { n: selected.number })} onClose={() => setOpen(null)}>
          <OrderDetail o={selected} />
        </Sheet>
      )}
    </>
  )
}

function OrderDetail({ o }) {
  const { t, fmtMoney, fmtInstant } = useI18n()
  const s = useStore()
  const base = useBase()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  const [readyNote, setReadyNote] = useState(null)
  const pay = payState(s, o)
  const first = o.name.split(/\s+/)[0]
  const next = nextStatus(o)
  const readyText = t('shop.panel.waReady', { name: first, n: o.number })
  const set = async (status) => {
    setBusy(true)
    const res = await setShopOrderStatus(o.id, status)
    setBusy(false)
    if (!res.ok) { toast(t(`errors.${res.code}`), 'error'); return }
    toast(t('shop.panel.statusSaved', { n: o.number, status: t(`shop.status.${status}`) }))
    if (status === 'listo') setReadyNote(res.balance > 0 ? fmtMoney(res.balance) : '')
  }
  const wa = waTo(o.phone, t('shop.panel.waHello', { name: first, n: o.number }))
  const waReady = waTo(o.phone, readyText)
  const mailReady = o.email ? `mailto:${o.email}?subject=${encodeURIComponent(t('shop.panel.mailSubject', { n: o.number }))}&body=${encodeURIComponent(readyText)}` : ''
  return (
    <div className="card msg orderdetail">
      <p className="row gap-sm wrap">
        <OrderPill status={o.status} />
        <StatusPill status={pay.status}>{t(`shop.panel.pay.${pay.key}`)}</StatusPill>
        <span className="small muted">{fmtInstant(o.createdAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
      </p>
      <ul className="list orderdetail__lines">
        {o.items.map((l, i) => (
          <li key={i} className="list__row">
            <span className="grow dtwo">
              <span className="list__title">{l.name} {l.color}</span>
              <span className="small muted">{t('shop.sizeShort', { size: l.size })} · ×{l.qty}{l.onOrder && <> · <span className="ordertag">{t('shop.onOrder')}</span></>}</span>
            </span>
            <strong>{fmtMoney(l.unit * l.qty)}</strong>
          </li>
        ))}
        <li className="list__row"><span className="grow list__title">{t('shop.cart.total')}</span><strong>{fmtMoney(o.total)}</strong></li>
      </ul>
      <p className="small muted mt12">{t('shop.panel.charges')}</p>
      <ul className="list">
        {pay.pays.map((p) => (
          <li key={p.id} className="list__row">
            <span className="grow small">{t(p.meta?.kind === 'shop_balance' ? 'shop.panel.balanceCharge' : 'shop.panel.firstCharge')}</span>
            <StatusPill status={p.status === 'paid' ? 'paid' : p.receiptStatus === 'review' ? 'review' : 'pending'}>
              {t(p.status === 'paid' ? 'shop.panel.pay.paid' : p.receiptStatus === 'review' ? 'shop.panel.pay.review' : p.meta?.payAtClub ? 'shop.panel.pay.club' : 'shop.panel.pay.pending')}
            </StatusPill>
            <strong>{fmtMoney(p.amount)}</strong>
          </li>
        ))}
      </ul>
      <Link className="link mt8" to={`${base}/direccion/cobros`}>{t('shop.panel.seeCobros')} →</Link>

      <ul className="msg__contact mt12">
        <li><Icon name="user" size={18} /><span>{o.name}</span></li>
        {o.phone && <li><Icon name="phone" size={18} /><a href={`tel:${o.phone.replace(/[^\d+]/g, '')}`}>{o.phone}</a></li>}
        {o.email && <li><Icon name="mail" size={18} /><a className="break" href={`mailto:${o.email}`}>{o.email}</a></li>}
      </ul>
      {readyNote !== null && (
        <div className="orderdetail__ready mt12" role="status">
          <p className="small"><strong>{t('shop.panel.ready', { name: first })}</strong>{readyNote ? ` ${t('shop.panel.balanceAdded', { amount: readyNote })}` : ''}</p>
          <div className="row gap-sm wrap">
            {waReady && <a className="btn btn--primary btn--sm" href={waReady} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> {t('shop.panel.notifyWa')}</a>}
            {mailReady && <a className="btn btn--slate btn--sm" href={mailReady}><Icon name="mail" size={18} /> {t('shop.panel.notifyMail')}</a>}
          </div>
        </div>
      )}
      <div className="row gap-sm wrap mt12">
        {next && <button type="button" className="btn btn--primary" disabled={busy} onClick={() => set(next)}><Icon name="check" size={18} /> {t(`shop.panel.next.${next}`)}</button>}
        {wa && readyNote === null && <a className="btn btn--slate" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> {t('shop.panel.whatsapp')}</a>}
      </div>
      {!['entregado', 'cancelado'].includes(o.status) && (
        <button type="button" className="link mt12" onClick={() => setAsking(true)}>{t('shop.panel.cancel')}</button>
      )}
      {asking && (
        <ConfirmDialog title={t('shop.panel.cancelAsk', { n: o.number })} text={t('shop.panel.cancelText')} confirmLabel={t('shop.panel.cancelYes')} cancelLabel={t('shop.panel.keep')}
          onConfirm={() => { setAsking(false); set('cancelado') }} onCancel={() => setAsking(false)} />
      )}
    </div>
  )
}

/* ───────── Productos ───────── */

const stockLine = (p) => (p.variants || []).map((v) => `${v.size} ${stockNum(v)}`).join(' · ')

function Products() {
  const { t, fmtMoney } = useI18n()
  const s = useStore()
  const desk = useDesktop()
  const toast = useToast()
  const q = useDeskSearch(t('shop.panel.searchProducts'))
  const [open, setOpen] = useState(null) // id | 'new' | { copy }
  const all = useMemo(() => [...(s.shopProducts || [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)), [s.shopProducts])
  const rows = all.filter((p) => !q || [p.name, p.colorName, p.model].some((v) => v?.toLowerCase().includes(q)))
  const toggle = async (p) => {
    const res = await setShopProductActive(p.id, p.active === false)
    if (!res.ok) toast(t(`errors.${res.code}`), 'error')
  }
  const Stock = ({ p }) => (
    <span className="small">{(p.variants || []).map((v, i) => <span key={v.size}>{i ? ' · ' : ''}{v.size} <b className={stockNum(v) === 0 ? 'shopadmin__zero' : ''}>{stockNum(v)}</b></span>)}</span>
  )
  const Active = ({ p }) => (
    <label className="switch" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" role="switch" checked={p.active !== false} onChange={() => toggle(p)} aria-label={t('shop.panel.editor.active')} />
      <span aria-hidden="true" />
    </label>
  )
  const columns = [
    { key: 'photo', sortable: false, label: t('shop.panel.cols.photo'), csvOnly: false, value: () => '', csv: (p) => (p.photos || []).length, render: (p) => <span className="shopadmin__thumb"><ShopThumb p={p} /></span> },
    { key: 'name', label: t('shop.panel.cols.product'), value: (p) => `${p.name} ${p.colorName}`, render: (p) => <span className="dtwo"><b>{p.name}</b><span className="small muted">{p.colorName}</span></span> },
    { key: 'category', label: t('shop.panel.cols.category'), value: (p) => t(`shop.cat.${p.category}`) },
    { key: 'price', align: 'right', label: t('shop.panel.cols.price'), value: (p) => p.promoPrice ?? p.price, csv: (p) => `${p.promoPrice ?? p.price} (${p.price})`, render: (p) => <span className="dtwo is-right"><b>{fmtMoney(p.promoPrice ?? p.price)}</b>{p.promoPrice != null && <s className="small muted">{fmtMoney(p.price)}</s>}</span> },
    { key: 'sticker', label: t('shop.panel.cols.sticker'), value: (p) => p.sticker, csv: (p) => t(`shop.sticker.${p.sticker}`), render: (p) => (p.sticker && p.sticker !== 'none' ? <span className={`sticker sticker--${{ inauguracion: 'mustard', promo: 'terracotta', nuevo: 'slate' }[p.sticker]}`}>{t(`shop.sticker.${p.sticker}`)}</span> : <span className="muted">—</span>) },
    { key: 'stock', label: t('shop.panel.cols.stock'), value: (p) => (p.variants || []).reduce((n, v) => n + stockNum(v), 0), csv: stockLine, render: (p) => <Stock p={p} /> },
    { key: 'active', label: t('shop.panel.cols.active'), value: (p) => (p.active === false ? 1 : 0), csv: (p) => (p.active === false ? 'no' : 'sí'), render: (p) => <Active p={p} /> },
  ]
  useDeskAction([
    { label: t('desk.export'), icon: 'download', onClick: () => exportCsv(`productos-${todayKey()}.csv`, columns, rows) },
    { label: t('shop.panel.newProduct'), icon: 'plus', onClick: () => setOpen('new') },
  ], [rows.length, q])
  const editing = open === 'new' ? null : open?.copy ? open.copy : open ? byId(all, open) : null
  return (
    <>
      {!desk && <button type="button" className="btn btn--primary btn--block" onClick={() => setOpen('new')}><Icon name="plus" size={18} /> {t('shop.panel.newProduct')}</button>}
      {desk ? (
        <DataTable columns={columns} rows={rows} onRow={(p) => setOpen(p.id)} selected={typeof open === 'string' ? open : null} empty={<Empty icon="hanger" title={t('shop.panel.empty.products')} />} />
      ) : (
        <ul className="card list">
          {rows.map((p) => (
            <li key={p.id} className="list__row msgrow">
              <button type="button" className="msgrow__btn" onClick={() => setOpen(p.id)} aria-label={`${p.name} ${p.colorName}`}>
                <span className="shopadmin__thumb"><ShopThumb p={p} /></span>
                <span className="grow">
                  <span className="list__title">{p.name}</span>
                  <span className="small muted">{p.colorName} · {fmtMoney(p.promoPrice ?? p.price)}</span>
                  <Stock p={p} />
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
              <Active p={p} />
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Sheet title={t(editing?.id ? 'shop.panel.editor.edit' : 'shop.panel.editor.new')} onClose={() => setOpen(null)}>
          <ProductEditor key={editing?.id || (open?.copy ? 'copy' : 'new')} product={editing} models={all} onDone={() => setOpen(null)}
            onDuplicate={(copy) => { setOpen({ copy }); toast(t('shop.panel.editor.duplicateDone')) }} />
        </Sheet>
      )}
    </>
  )
}

function ShopThumb({ p }) {
  const src = shopPhoto(p.photos?.[0])
  return src ? <img src={src} alt="" /> : <span className="shopadmin__sw" style={{ background: p.colorHex }} />
}

const BLANK = { id: null, model: '', name: '', colorName: '', colorHex: '#D5C7AD', category: 'pants', descriptionEs: '', descriptionEn: '', featuresEs: '', featuresEn: '',
  price: '', promoPrice: '', sticker: 'inauguracion', variants: [], takesOrders: false, photos: [], active: true }
const toForm = (p) => (p ? {
  id: p.id || null, model: p.model || '', name: p.name || '', colorName: p.colorName || '', colorHex: p.colorHex || '#D5C7AD', category: p.category || 'pants',
  descriptionEs: p.descriptionEs || '', descriptionEn: p.descriptionEn || '', featuresEs: (p.features?.es || []).join('\n'), featuresEn: (p.features?.en || []).join('\n'),
  price: p.price ?? '', promoPrice: p.promoPrice ?? '', sticker: p.sticker || 'none',
  variants: (p.variants || []).map((v) => ({ size: v.size, stock: stockNum(v), price: v.price ?? '' })), takesOrders: Boolean(p.takesOrders), photos: [...(p.photos || [])], active: p.active !== false,
} : { ...BLANK })
const slug = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** A photo for the shop: at most 1200 px tall, WebP (~80), resized in the browser before it goes up. */
async function resizePhoto(file) {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1200 / bmp.height, 1600 / bmp.width)
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale)
    c.height = Math.round(bmp.height * scale)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.8))
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }) : file
  } catch {
    return file
  }
}

/** Datos · Precio · Tallas · Fotos, one form; "Duplicar en otro color" copies everything but the color, the photos and the stock. */
function ProductEditor({ product, models, onDone, onDuplicate }) {
  const { t } = useI18n()
  const [f, setF, dirty] = useFormState(() => toForm(product))
  const [run, busy, error] = useSave()
  const [uploading, setUploading] = useState(0)
  const [drag, setDrag] = useState(null)
  const fileInput = useRef(null)
  const toast = useToast()
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  // The models already in the shop (their name is the first product's): picking one links this color to them.
  const modelList = useMemo(() => {
    const m = new Map()
    for (const p of models) if (p.model && !m.has(p.model)) m.set(p.model, p.name)
    return [...m.entries()]
  }, [models])
  const isNewModel = !modelList.some(([k]) => k === f.model)
  const pickModel = (e) => {
    const v = e.target.value
    if (v === '__new') { setF({ ...f, model: '' }); return }
    const name = modelList.find(([k]) => k === v)?.[1]
    setF({ ...f, model: v, name: f.name || name || '' })
  }
  const setVariant = (i, k, v) => setF({ ...f, variants: f.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })
  const addSize = (size = '') => { if (size && f.variants.some((v) => v.size === size)) return; setF({ ...f, variants: [...f.variants, { size, stock: 0, price: '' }] }) }
  const movePhoto = (from, to) => {
    if (to < 0 || to >= f.photos.length || from === to) return
    const photos = [...f.photos]
    const [x] = photos.splice(from, 1)
    photos.splice(to, 0, x)
    setF((cur) => ({ ...cur, photos }))
  }
  const addPhotos = async (files) => {
    const list = [...files].filter((x) => /^image\//.test(x.type))
    if (!list.length) return
    setUploading(list.length)
    const added = []
    for (const file of list) {
      const res = await uploadShopPhoto(await resizePhoto(file))
      if (res.ok) added.push(res.path)
      else toast(t(`errors.${res.code}`), 'error')
      setUploading((n) => n - 1)
    }
    setF((cur) => ({ ...cur, photos: [...cur.photos, ...added] }))
  }
  const payload = () => ({
    id: f.id, model: f.model.trim() || slug(f.name), name: f.name.trim(), colorName: f.colorName.trim(), colorHex: f.colorHex, category: f.category,
    descriptionEs: f.descriptionEs.trim(), descriptionEn: f.descriptionEn.trim(),
    features: { es: f.featuresEs.split('\n').map((x) => x.trim()).filter(Boolean), en: f.featuresEn.split('\n').map((x) => x.trim()).filter(Boolean) },
    price: f.price === '' ? null : Number(f.price), promoPrice: f.promoPrice === '' ? null : Number(f.promoPrice), sticker: f.sticker,
    photos: f.photos, takesOrders: f.takesOrders, active: f.active,
    variants: f.variants.filter((v) => String(v.size).trim()).map((v) => ({ size: String(v.size).trim(), stock: Number(v.stock) || 0, price: v.price === '' ? null : Number(v.price) })),
  })
  const preview = { ...payload(), slug: 'preview', price: Number(f.price) || 0, promoPrice: f.promoPrice === '' ? null : Number(f.promoPrice) }
  const submit = (e) => { e.preventDefault(); run(() => saveShopProduct(payload()), t('shop.panel.editor.saved'), onDone, { inline: true }) }
  const duplicate = () => onDuplicate({ ...payload(), id: null, colorName: '', colorHex: '#D5C7AD', photos: [], variants: payload().variants.map((v) => ({ ...v, stock: 0 })) })
  return (
    <form className="inline-form shopedit" onSubmit={submit}>
      <h3 className="shopedit__h">{t('shop.panel.editor.data')}</h3>
      <label className="field" htmlFor="se-model"><span>{t('shop.panel.editor.model')}</span>
        <select id="se-model" className="input" value={isNewModel ? '__new' : f.model} onChange={pickModel}>
          {modelList.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
          <option value="__new">{t('shop.panel.editor.modelNew')}</option>
        </select>
        <small className="muted">{t('shop.panel.editor.modelHint')}</small>
      </label>
      <label className="field" htmlFor="se-name"><span>{t('shop.panel.editor.name')}</span>
        <input id="se-name" className="input" required value={f.name} onChange={set('name')} />
      </label>
      <div className="grid2">
        <label className="field" htmlFor="se-color"><span>{t('shop.panel.editor.colorName')}</span>
          <input id="se-color" className="input" required value={f.colorName} onChange={set('colorName')} />
        </label>
        <label className="field" htmlFor="se-hex"><span>{t('shop.panel.editor.swatch')}</span>
          <input id="se-hex" className="input shopedit__color" type="color" value={f.colorHex} onChange={set('colorHex')} />
        </label>
      </div>
      <label className="field" htmlFor="se-cat"><span>{t('shop.panel.editor.category')}</span>
        <select id="se-cat" className="input" value={f.category} onChange={set('category')}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(`shop.cat.${c}`)}</option>)}
        </select>
      </label>
      <label className="field" htmlFor="se-des"><span>{t('shop.panel.editor.descEs')}</span><textarea id="se-des" className="input" rows={3} value={f.descriptionEs} onChange={set('descriptionEs')} /></label>
      <label className="field" htmlFor="se-den"><span>{t('shop.panel.editor.descEn')}</span><textarea id="se-den" className="input" rows={3} value={f.descriptionEn} onChange={set('descriptionEn')} /></label>
      <label className="field" htmlFor="se-fes"><span>{t('shop.panel.editor.featEs')}</span><textarea id="se-fes" className="input" rows={4} value={f.featuresEs} onChange={set('featuresEs')} /></label>
      <label className="field" htmlFor="se-fen"><span>{t('shop.panel.editor.featEn')}</span><textarea id="se-fen" className="input" rows={4} value={f.featuresEn} onChange={set('featuresEn')} /></label>

      <h3 className="shopedit__h">{t('shop.panel.editor.price')}</h3>
      <div className="grid2">
        <label className="field" htmlFor="se-price"><span>{t('shop.panel.editor.listPrice')}</span>
          <input id="se-price" className="input" type="number" inputMode="numeric" min={0} required value={f.price} onChange={set('price')} />
        </label>
        <label className="field" htmlFor="se-promo"><span>{t('shop.panel.editor.promoPrice')}</span>
          <input id="se-promo" className="input" type="number" inputMode="numeric" min={0} value={f.promoPrice} onChange={set('promoPrice')} />
          <small className="muted">{t('shop.panel.editor.promoHint')}</small>
        </label>
      </div>
      <div className="field"><span>{t('shop.panel.editor.sticker')}</span>
        <Segmented small value={f.sticker} onChange={(v) => setF({ ...f, sticker: v })} options={STICKERS.map((k) => ({ value: k, label: t(`shop.sticker.${k}`) }))} />
      </div>
      <div className="field shopedit__preview"><span>{t('shop.panel.editor.preview')}</span>
        <ProductCardPreview product={preview} />
      </div>

      <h3 className="shopedit__h">{t('shop.panel.editor.sizes')}</h3>
      <div className="shopedit__sizes">
        {f.variants.length > 0 && <div className="shopedit__row shopedit__row--head small muted"><span>{t('shop.panel.editor.size')}</span><span>{t('shop.panel.editor.stock')}</span><span>{t('shop.panel.editor.sizePrice')}</span><span /></div>}
        {f.variants.map((v, i) => (
          <div key={i} className="shopedit__row">
            <input className="input" aria-label={t('shop.panel.editor.size')} value={v.size} onChange={(e) => setVariant(i, 'size', e.target.value)} />
            <input className={`input ${Number(v.stock) === 0 ? 'shopadmin__zeroin' : ''}`} type="number" min={0} inputMode="numeric" aria-label={t('shop.panel.editor.stock')} value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} />
            <input className="input" type="number" min={0} inputMode="numeric" placeholder={t('shop.panel.editor.sizePriceHint')} aria-label={t('shop.panel.editor.sizePrice')} value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} />
            <button type="button" className="iconbtn" aria-label={t('shop.panel.editor.removeSize')} onClick={() => setF({ ...f, variants: f.variants.filter((_, j) => j !== i) })}><Icon name="x" size={18} /></button>
          </div>
        ))}
        <div className="row gap-sm wrap">
          <button type="button" className="btn btn--outline btn--sm" onClick={() => addSize('')}><Icon name="plus" size={16} /> {t('shop.panel.editor.addSize')}</button>
          {[...SIZE_CHIPS, ...KID_SIZES].filter((x) => !f.variants.some((v) => v.size === x)).map((x) => (
            <button key={x} type="button" className="chip" onClick={() => addSize(x)}>{KID_SIZES.includes(x) ? t('shop.panel.editor.girl', { n: x }) : x}</button>
          ))}
        </div>
      </div>
      <label className="list__row reminders__switch">
        <span className="grow"><span className="list__title">{t('shop.panel.editor.takesOrders')}</span><br /><span className="small muted">{t('shop.panel.editor.takesOrdersHint')}</span></span>
        <span className="switch"><input type="checkbox" role="switch" checked={f.takesOrders} onChange={set('takesOrders')} aria-label={t('shop.panel.editor.takesOrders')} /><span aria-hidden="true" /></span>
      </label>

      <h3 className="shopedit__h">{t('shop.panel.editor.photos')}</h3>
      <div className="dropzone shopedit__drop" onDragOver={(e) => { if (drag === null) e.preventDefault() }} onDrop={(e) => { if (drag !== null) return; e.preventDefault(); addPhotos(e.dataTransfer.files) }}>
        <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" className="dropzone__input" tabIndex={-1} aria-hidden="true" onChange={(e) => { const files = [...e.target.files]; e.target.value = ''; addPhotos(files) }} />
        <button type="button" className="dropzone__pick" onClick={() => fileInput.current?.click()} disabled={uploading > 0}>
          <span className="dropzone__icon" aria-hidden="true"><Icon name="camera" size={24} /></span>
          <span className="dropzone__title">{uploading ? t('shop.panel.editor.uploading') : t('shop.panel.editor.photosDrop')}</span>
          <span className="dropzone__hint">{t('shop.panel.editor.photosHint')}</span>
        </button>
      </div>
      {f.photos.length > 0 && (
        <ol className="shopedit__photos">
          {f.photos.map((ph, i) => (
            <li key={ph} draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)} onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (drag !== null) movePhoto(drag, i); setDrag(null) }} className={drag === i ? 'is-drag' : ''}>
              <img src={shopPhoto(ph)} alt="" />
              {i === 0 && <span className="shopedit__main">{t('shop.panel.editor.main')}</span>}
              <span className="shopedit__photobtns">
                <button type="button" className="iconbtn" disabled={i === 0} aria-label={t('shop.panel.editor.moveLeft')} onClick={() => movePhoto(i, i - 1)}><Icon name="chevronLeft" size={16} /></button>
                <button type="button" className="iconbtn" disabled={i === f.photos.length - 1} aria-label={t('shop.panel.editor.moveRight')} onClick={() => movePhoto(i, i + 1)}><Icon name="chevronRight" size={16} /></button>
                <button type="button" className="iconbtn" aria-label={t('shop.panel.editor.removePhoto')} onClick={() => setF({ ...f, photos: f.photos.filter((x) => x !== ph) })}><Icon name="x" size={16} /></button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <label className="list__row reminders__switch">
        <span className="grow list__title">{t('shop.panel.editor.active')}</span>
        <span className="switch"><input type="checkbox" role="switch" checked={f.active} onChange={set('active')} aria-label={t('shop.panel.editor.active')} /><span aria-hidden="true" /></span>
      </label>
      {f.id && <button type="button" className="btn btn--outline" onClick={duplicate}><Icon name="copy" size={18} /> {t('shop.panel.editor.duplicate')}</button>}
      <SaveBar busy={busy || uploading > 0} dirty={dirty} error={error} onCancel={onDone} />
    </form>
  )
}
