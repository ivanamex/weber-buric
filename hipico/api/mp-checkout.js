// Card payments: GET says whether they're on (the club's Mercado Pago keys are in Vercel) and gives the public key
// for the card form inside the page;
// POST { paymentId } creates the Checkout Pro preference for that charge and returns where to send the visitor.
import { connect } from './_reminders.js'
import { createPreference, mpEnabled } from './_mp.js'
import es from '../src/i18n/es.json' with { type: 'json' }

const CLUB = 'Hípico Riviera Maya'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** "Plan 8 clases · Nico", "Clase muestra · Ale", "Pensión · octubre" … for the card statement. */
export function titleFor(p) {
  const m = p.meta || {}
  const who = p.riderName ? ` · ${p.riderName}` : ''
  if (p.service === 'plan') return m.kind === 'upgrade' ? `${es.services.planDiff.replace('{from}', m.from ?? '').replace('{to}', m.classes ?? '')}${who}` : `${es.plan.classesPlan.replace('{n}', m.classes ?? '')}${who}`
  if (p.service === 'class') return `${es.classKind[m.kind] || es.services.class}${who}`
  if (p.service === 'boarding') return `${es.services.boarding}${m.month ? ` · ${m.month}` : ''}`
  if (p.service === 'shop') return es.shop.orderTitle.replace('{n}', m.number ?? '')
  return `${es.services[p.service] || p.service} · ${CLUB}`
}

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ enabled: mpEnabled(), publicKey: mpEnabled() ? process.env.MP_PUBLIC_KEY || null : null })
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'network' })
  if (!mpEnabled()) return res.status(200).json({ ok: false, code: 'cardOff' })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  const paymentId = String(body?.paymentId || '')
  if (!UUID.test(paymentId)) return res.status(400).json({ ok: false, code: 'notFound' })
  let client
  try {
    client = await connect()
    if (!client) return res.status(503).json({ ok: false, code: 'network' })
    const { rows } = await client.query(
      `select p.id, p.service, p.amount, p.status, p.meta, f.email, r.name as rider_name
         from payments p join families f on f.id = p.family_id
         left join riders r on r.id::text = p.meta ->> 'riderId'
        where p.id = $1`, [paymentId])
    const p = rows[0]
    if (!p) return res.status(404).json({ ok: false, code: 'notFound' })
    if (p.status !== 'pending') return res.status(200).json({ ok: false, code: 'alreadyPaid' })
    if (!(p.amount > 0)) return res.status(200).json({ ok: false, code: 'notFound' })
    const pref = await createPreference({ paymentId, title: titleFor({ ...p, riderName: p.rider_name }), amount: p.amount, email: p.email, lang: body?.lang === 'en' ? 'en' : 'es' })
    await client.query(`update payments set meta = meta || jsonb_build_object('mpPreference', $2::text) where id = $1`, [paymentId, String(pref.id)])
    return res.status(200).json({ ok: true, url: pref.url })
  } catch (err) {
    console.error('[mp-checkout] failed', err)
    return res.status(500).json({ ok: false, code: 'network' })
  } finally {
    await client?.end().catch(() => {})
  }
}
