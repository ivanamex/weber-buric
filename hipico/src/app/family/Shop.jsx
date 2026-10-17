import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, moduleOn, placeShopOrder, sendWishlist } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { SectionTitle } from '../../components/ui.jsx'
import { PayDialog } from '../../components/PayDialog.jsx'
import { useToast } from '../../components/Toast.jsx'
import { useBase } from '../Backend.jsx'
import { ShopCatalog, CartDrawer, OrderPill, productTitle, ShopQuiet, ShopIcons, WishDrawer } from '../../site/shop/ShopParts.jsx'
import { cartApi, orderItems } from '../../site/shop/shopApi.js'
import { orderLine, wishText } from '../../data/shop.js'

/**
 * Tienda in the family app: the same grid, product window and cart as the website, without the hero. "Pagar" places
 * the order with the family's own details and opens the payment window (Tarjeta · Transferencia · En el club); the
 * charge shows in Pagos like any other, and the order in "Mis pedidos" at the bottom.
 */
export default function FamilyShop() {
  const { t, lang } = useI18n()
  const s = useStore()
  const base = useBase()
  const toast = useToast()
  const [paying, setPaying] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  if (!moduleOn(s, 'moduleShop')) return <Navigate to={`${base}/familia`} replace />
  const products = (s.shopProducts || []).filter((p) => p.active !== false)

  const me = (s.families || []).find((f) => f.id === s.session?.familyId)
  const sendList = async (p) => ({ ...(await sendWishlist(p)), name: me?.contact || '' })

  const pay = async (lines, _totals, close) => {
    setBusy(true)
    setError(null)
    const res = await placeShopOrder({ items: orderItems(lines), lang })
    setBusy(false)
    if (!res.ok) {
      if (res.code === 'out_of_stock') {
        const l = lines.find((x) => x.slug === res.line?.product && x.size === res.line?.size && (!res.line?.color || (x.color || '') === res.line.color))
        setError(t('shop.checkout.gone', { size: res.line?.size || '', product: l?.product ? productTitle(l.product) : '' }))
      } else setError(t(`errors.${res.code}`))
      return
    }
    cartApi.clear()
    close()
    toast(t('shop.app.placed', { n: res.number }), 'success')
    setPaying(res.payment_id)
  }

  return (
    <div className="page shop shop--app">
      <h1 className="page__title">{t('shop.nav')}</h1>
      <div className="shopband">
        <Icon name="hanger" size={22} />
        <span className="grow">{t('shop.app.band')}</span>
        <ShopIcons inApp />
      </div>
      <ShopCatalog products={products} inApp />
      <MyOrders onPay={setPaying} />
      <ShopQuiet />
      <CartDrawer products={products} inApp onPay={pay} payBusy={busy} payError={error} />
      <WishDrawer inApp onSend={sendList} />
      {paying && <PayDialog paymentId={paying} onClose={() => setPaying(null)} />}
    </div>
  )
}

/** Mis pedidos: the lists sent to Mara still waiting for her price, then the orders (number, date, what's in it, the
 *  status, and "Pagar" while a charge of it is pending). */
function MyOrders({ onPay }) {
  const { t, fmtDate, fmtMoney } = useI18n()
  const s = useStore()
  const mine = (s.shopOrders || []).filter((o) => o.familyId === s.session.familyId && o.status !== 'cancelado')
  const lists = (s.shopWishlists || []).filter((w) => w.familyId === s.session.familyId && ['nueva', 'cotizada'].includes(w.status))
  if (!mine.length && !lists.length) return null
  const day = (iso) => fmtDate(iso.slice(0, 10), { day: 'numeric', month: 'short' })
  return (
    <section className="myorders">
      <SectionTitle icon="bag">{t('shop.app.myOrders')}</SectionTitle>
      {lists.map((w) => (
        <article key={w.id} className="card myorder myorder--wish">
          <div className="myorder__top">
            <b>{t('shop.wish.listOf', { number: w.number, date: day(w.createdAt) })}</b>
            <span className="opill opill--wish">{t('shop.wish.waiting')}</span>
          </div>
          <p className="myorder__items">{(w.items || []).map((l) => wishText(l, t('shop.wish.sizeWord'))).join(' · ')}</p>
          <div className="myorder__top"><span>{t('shop.wish.total')} <b>{fmtMoney(w.totalEstimate)}</b></span></div>
        </article>
      ))}
      {mine.map((o) => {
        const due = s.payments.find((p) => p.service === 'shop' && p.meta?.order === o.id && p.status === 'pending' && p.receiptStatus !== 'review')
        return (
          <article key={o.id} className="card myorder">
            <div className="myorder__top">
              <b>{t('shop.app.orderOf', { n: o.number, date: day(o.createdAt) })}</b>
              <OrderPill status={o.status} family />
            </div>
            <p className="myorder__items">{o.items.map(orderLine).join(' · ')}</p>
            <div className="myorder__top">
              <span>{t('shop.cart.total')} <b>{fmtMoney(o.total)}</b></span>
              {due && <button type="button" className="btn btn--primary btn--sm" onClick={() => onPay(due.id)}>{t('shop.app.pay', { amount: fmtMoney(due.amount) })}</button>}
            </div>
          </article>
        )
      })}
    </section>
  )
}
