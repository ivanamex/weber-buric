// CSV import for the club's family list: parse, map columns (Spanish or English headers),
// validate each row, and build the payload management previews before saving.
import { todayKey } from './time.js'

/** Minimal RFC-4180 parser: quoted fields, escaped quotes, comma or semicolon delimiter. */
export function parseCsv(text) {
  const clean = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const firstLine = clean.split('\n', 1)[0]
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ','
  const rows = []
  let row = []; let field = ''; let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === delim) { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return { rows: rows.filter((r) => r.some((v) => v.trim())), delim }
}

const norm = (v) => (v || '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const HEADERS = {
  contact: ['nombre', 'name', 'contacto', 'contact', 'tutor', 'mama', 'papa', 'responsable'],
  family: ['familia', 'family'],
  email: ['correo', 'email', 'e-mail', 'mail'],
  phone: ['telefono', 'phone', 'celular', 'whatsapp', 'tel'],
  riders: ['jinetes', 'riders', 'jinete', 'rider', 'alumnos', 'ninos', 'hijos'],
  plan: ['plan', 'paquete', 'clases'],
  start: ['inicio', 'start', 'fecha', 'fecha de inicio', 'start date', 'desde'],
}

const LEVELS = {
  beginner: ['principiante', 'beginner', 'p', 'b', 'inicial', 'basico'],
  intermediate: ['intermedio', 'intermediate', 'i', 'medio'],
  advanced: ['avanzado', 'advanced', 'a', 'av'],
}
const levelOf = (v) => {
  const n = norm(v)
  if (!n) return 'beginner'
  return Object.keys(LEVELS).find((k) => LEVELS[k].includes(n)) || null
}

/** "Zara (intermedio); Mateo (principiante)" or "Zara:intermedio | Mateo" → riders. */
export function parseRiders(value, delim) {
  const parts = value.split(delim === ';' ? /[|/]/ : /[;|/]/).map((p) => p.trim()).filter(Boolean)
  return parts.map((p) => {
    const m = p.match(/^(.*?)\s*\(([^)]*)\)\s*$/) || p.match(/^(.*?)\s*[:\-–]\s*(.*)$/)
    const name = (m ? m[1] : p).trim()
    const level = levelOf(m ? m[2] : '')
    return { name, level }
  })
}

function parseDate(v) {
  const s = (v || '').trim()
  if (!s) return todayKey()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  let y; let mo; let d
  if (m) [, y, mo, d] = m
  else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) { [, d, mo, y] = m; if (y.length === 2) y = `20${y}` }
  else return null
  const date = new Date(Date.UTC(+y, +mo - 1, +d, 12))
  if (date.getUTCMonth() !== +mo - 1 || date.getUTCDate() !== +d) return null
  return date.toISOString().slice(0, 10)
}

/**
 * Turn CSV text into preview rows: { line, family, status: 'new'|'exists'|'error', error? }.
 * existingEmails: emails already in the club (they are skipped, never duplicated).
 */
export function buildImport(text, existingEmails, validPlans) {
  const { rows, delim } = parseCsv(text)
  if (rows.length < 2) return { error: 'empty', items: [] }
  const header = rows[0].map(norm)
  const col = Object.fromEntries(Object.entries(HEADERS).map(([k, names]) => [k, header.findIndex((h) => names.includes(h))]))
  if (col.email < 0 || col.contact < 0) return { error: 'columns', items: [] }
  const seen = new Set()
  const items = rows.slice(1).map((r, i) => {
    const get = (k) => (col[k] >= 0 ? (r[col[k]] || '').trim() : '')
    const email = get('email').toLowerCase()
    const riders = parseRiders(get('riders'), delim)
    const planRaw = get('plan').replace(/[^0-9]/g, '')
    const plan = planRaw ? Number(planRaw) : null
    const start = parseDate(get('start'))
    const family = { name: get('family'), contact: get('contact'), email, phone: get('phone'), plan, start, riders }
    let error = null
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) error = 'email'
    else if (!family.contact) error = 'contact'
    else if (!riders.length) error = 'riders'
    else if (riders.some((x) => !x.level)) error = 'level'
    else if (plan && !validPlans.includes(plan)) error = 'plan'
    else if (!start) error = 'date'
    let status = error ? 'error' : 'new'
    if (!error && (existingEmails.has(email) || seen.has(email))) status = 'exists'
    seen.add(email)
    return { line: i + 2, family, status, error }
  })
  return { items }
}

export const CSV_TEMPLATE = 'nombre,correo,telefono,jinetes,plan,inicio\n' +
  'Paola Hernández,paola@ejemplo.com,984 111 2233,"Valentina (intermedio); Mateo (principiante)",8,2026-10-01\n'
