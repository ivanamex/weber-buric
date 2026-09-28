import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { Icon } from './Icon.jsx'

export const DESK_QUERY = '(min-width: 1024px)'

/** True on screens of 1024 px and more: management gets the desktop layout there. Phones never change. */
export function useDesktop() {
  const [wide, setWide] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(DESK_QUERY).matches : false))
  useEffect(() => {
    const mq = window.matchMedia?.(DESK_QUERY)
    if (!mq) return undefined
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

/** The desktop top bar: the search text and the page's main action, set by the page on screen. */
export const DeskContext = createContext({ desk: false, query: '', setQuery: () => {}, setAction: () => {}, setSearchable: () => {} })
export const useDesk = () => useContext(DeskContext)

/** A page offers a main action in the top bar ("+ Nueva clase"…) while it's on screen (desktop only). */
export function useDeskAction(action, deps = []) {
  const { desk, setAction } = useDesk()
  useEffect(() => {
    if (!desk) return undefined
    setAction(action)
    return () => setAction(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desk, ...deps])
}

/** A page that filters by the top bar's search box. Returns the text typed (desktop), or '' on phones. */
export function useDeskSearch(placeholder) {
  const { desk, query, setSearchable } = useDesk()
  useEffect(() => {
    if (!desk) return undefined
    setSearchable(placeholder)
    return () => setSearchable(null)
  }, [desk, placeholder, setSearchable])
  return desk ? query.trim().toLowerCase() : ''
}

/**
 * A table with sortable columns and clickable rows.
 * columns: [{ key, label, value?: (row) => sortable, render?: (row) => node, align?: 'right', nowrap?, csvOnly?, csv?: (row) => text }]
 */
export function DataTable({ columns: allColumns, rows, rowKey = (r) => r.id, onRow, selected, empty, defaultSort }) {
  const { t } = useI18n()
  const [sort, setSort] = useState(defaultSort || null) // { key, dir: 1 | -1 }
  const columns = allColumns.filter((c) => !c.csvOnly) // csvOnly columns go to the export, not on screen
  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = allColumns.find((c) => c.key === sort.key)
    const val = col?.value || ((r) => r[sort.key])
    return [...rows].sort((a, b) => {
      const x = val(a)
      const y = val(b)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true })) * sort.dir
    })
  }, [rows, sort, allColumns])
  const toggle = (key) => setSort(sort?.key === key ? { key, dir: -sort.dir } : { key, dir: 1 })
  if (!rows.length) return empty || <p className="muted small">{t('desk.noRows')}</p>
  return (
    <div className="dtable__wrap">
      <table className="dtable">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'is-right' : ''} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                {c.sortable === false ? c.label : (
                  <button type="button" className="dtable__sort" onClick={() => toggle(c.key)} title={t('desk.sortBy', { col: c.label })}>
                    {c.label}
                    <Icon name={sort?.key === c.key ? (sort.dir === 1 ? 'chevronUp' : 'chevronDown') : 'chevronDown'} size={14} className={sort?.key === c.key ? '' : 'is-faint'} />
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} className={`${onRow ? 'is-clickable' : ''} ${selected === rowKey(r) ? 'is-selected' : ''}`} tabIndex={onRow ? 0 : undefined}
              onClick={onRow ? () => onRow(r) : undefined} onKeyDown={onRow ? (e) => { if (e.key === 'Enter') onRow(r) } : undefined}>
              {columns.map((c) => <td key={c.key} className={`${c.align === 'right' ? 'is-right' : ''} ${c.nowrap ? 'is-nowrap' : ''}`}>{c.render ? c.render(r) : c.value ? c.value(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Download rows as a CSV that opens straight in Excel (UTF-8 with BOM, comma separated). */
export function exportCsv(filename, columns, rows) {
  const cell = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map((c) => cell(c.label)), ...rows.map((r) => columns.map((c) => cell(c.csv ? c.csv(r) : c.value ? c.value(r) : r[c.key])))]
  const blob = new Blob([`﻿${lines.map((l) => l.join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
