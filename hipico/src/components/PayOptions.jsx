import { useRef, useState } from 'react'

/**
 * How to pay, as option cards (radio cards, not pills): icon, title, one line. One row of three on a computer,
 * stacked on phones. Selected = mustard 2 px border, light mustard tint and a check in the corner. A disabled card
 * (card payments before the keys are in) stays visible, greyed, with its badge ("Muy pronto").
 * Shared by the website's payment step and the app's PayDialog.
 * methods: [{ key, title, text, icon: node, disabled?, badge? }]
 */
export function MethodCards({ methods, value, onChange, label, check }) {
  return (
    <div className="paycards" role="radiogroup" aria-label={label}>
      {methods.map((m) => (
        <button key={m.key} type="button" role="radio" aria-checked={value === m.key} aria-disabled={m.disabled || undefined} disabled={m.disabled}
          className={`paycard ${value === m.key ? 'is-active' : ''} ${m.disabled ? 'is-off' : ''}`} onClick={() => !m.disabled && onChange(m.key)}>
          <span className="paycard__icon" aria-hidden="true">{m.icon}</span>
          <span className="paycard__title">{m.title}{m.badge && <em className="paycard__badge">{m.badge}</em>}</span>
          <span className="paycard__text">{m.text}</span>
          {value === m.key && <span className="paycard__check" aria-hidden="true">{check}</span>}
        </button>
      ))}
    </div>
  )
}

/**
 * The receipt as a drop zone, not a button: a dashed sand box ("Sube tu comprobante", "Foto o PDF · hasta 10 MB ·
 * toca o arrastra"); once a file is chosen, its name with a thumbnail and a "Cambiar" link.
 */
export function DropZone({ file, onFile, accept, title, hint, changeLabel, icon, fileIcon, disabled }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const pick = (f) => { if (f) onFile(f) }
  const thumb = file && /^image\/(jpeg|png|webp|gif)$/.test(file.type) ? URL.createObjectURL(file) : null
  return (
    <div className={`dropzone ${over ? 'is-over' : ''} ${file ? 'has-file' : ''}`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) pick(e.dataTransfer.files?.[0]) }}>
      <input ref={input} type="file" accept={accept} className="dropzone__input" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; pick(f) }} />
      {file ? (
        <div className="dropzone__file">
          {thumb ? <img className="dropzone__thumb" src={thumb} alt="" onLoad={() => URL.revokeObjectURL(thumb)} /> : <span className="dropzone__thumb dropzone__thumb--doc" aria-hidden="true">{fileIcon}</span>}
          <span className="dropzone__name">{file.name}</span>
          <button type="button" className="dropzone__change" onClick={() => input.current?.click()} disabled={disabled}>{changeLabel}</button>
        </div>
      ) : (
        <button type="button" className="dropzone__pick" onClick={() => input.current?.click()} disabled={disabled}>
          <span className="dropzone__icon" aria-hidden="true">{icon}</span>
          <span className="dropzone__title">{title}</span>
          <span className="dropzone__hint">{hint}</span>
        </button>
      )}
    </div>
  )
}
