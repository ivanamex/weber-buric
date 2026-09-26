// Applies database updates before a production build, so nobody pastes SQL by hand.
// Every file in supabase/migrations/ runs once, in name (date) order, each in its own transaction,
// and is recorded in the app_migrations table. If one fails, the build fails and the live site
// keeps the previous version.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const here = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(here, '..', 'supabase', 'migrations')
const log = (msg) => console.log(`[migrate] ${msg}`)
const env = process.env

if (env.VERCEL_ENV !== 'production' && env.MIGRATE !== '1') {
  log('skipped (only production builds update the database)')
  process.exit(0)
}
const raw = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL || env.DATABASE_URL
if (!raw) {
  log('skipped (no database connected: the app runs as a demo)')
  process.exit(0)
}

// TLS is verified against Supabase's root certificate (bundled next to this script).
const url = new URL(raw)
url.searchParams.delete('sslmode')
url.searchParams.delete('supa')
const ssl = env.MIGRATE_NO_SSL === '1'
  ? false
  : { ca: fs.readFileSync(path.join(here, 'supabase-ca.crt'), 'utf8'), rejectUnauthorized: true }

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const client = new pg.Client({ connectionString: url.toString(), ssl, connectionTimeoutMillis: 15000 })

try {
  await client.connect()
  await client.query(`create table if not exists public.app_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`)
  await client.query('alter table public.app_migrations enable row level security')
  let applied = 0
  for (const name of files) {
    await client.query('begin')
    try {
      // One deploy at a time: a second build waits here instead of running the same update twice.
      await client.query("select pg_advisory_xact_lock(hashtext('app_migrations'))")
      const done = await client.query('select 1 from public.app_migrations where name = $1', [name])
      if (done.rowCount) { await client.query('commit'); continue }
      await client.query(fs.readFileSync(path.join(dir, name), 'utf8'))
      await client.query('insert into public.app_migrations (name) values ($1)', [name])
      await client.query('commit')
      applied++
      log(`applied ${name}`)
    } catch (err) {
      await client.query('rollback').catch(() => {})
      throw new Error(`${name}: ${err.message}`)
    }
  }
  log(applied ? `${applied} update(s) applied` : 'database already up to date')
} catch (err) {
  console.error(`[migrate] FAILED — ${err.message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
