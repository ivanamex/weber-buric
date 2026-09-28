// Runs every morning (Vercel cron, see vercel.json): payment reminders to families.
import { connect, makeSender, runReminders } from './_reminders.js'

export default async function handler(req, res) {
  // With CRON_SECRET set in Vercel, only the scheduler can run it. Either way a run never sends the same reminder twice.
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false })
  }
  let client
  try {
    client = await connect()
    if (!client) return res.status(200).json({ ok: false, reason: 'no database' })
    const summary = await runReminders(client, await makeSender())
    return res.status(200).json({ ok: true, ...summary })
  } catch (err) {
    console.error('[reminders] run failed', err)
    return res.status(500).json({ ok: false })
  } finally {
    await client?.end().catch(() => {})
  }
}
