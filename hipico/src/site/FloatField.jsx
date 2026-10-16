import { cloneElement, useId } from 'react'

/**
 * A field with its label inside: pale text while empty, floating up to the top edge (12 px) on focus or once it has a
 * value; the text sits below it. A real <label for>, not a placeholder. `more` is extra text shown only while the label
 * sits inside the empty field ("Correo · con él entras a la app"). `float` keeps it up (the date always has a value).
 * The line under the field is kept for its error or hint, so an error never moves the layout (`keepLine`).
 */
export function FloatField({ label, more, error, hint, float, keepLine = true, className = '', children }) {
  const id = useId()
  const field = cloneElement(children, { id: children.props.id || id, placeholder: ' ', 'aria-invalid': error ? true : children.props['aria-invalid'] })
  const line = error || hint || ''
  return (
    <div className={`cfield ffield ${float ? 'is-float' : ''} ${className}`}>
      <div className="ffield__box">
        {field}
        <label htmlFor={children.props.id || id} className="ffield__label">{label}{more && <span className="ffield__more"> · {more}</span>}</label>
      </div>
      {(keepLine || line) && <small className={error ? 'efield__err' : 'efield__hint'} role={error ? 'alert' : undefined}>{line}</small>}
    </div>
  )
}
