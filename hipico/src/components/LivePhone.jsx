import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'

const SCREEN_W = 430 // the preview renders at a Pro Max width, then scales to the drawn screen
const STATUS_H = 54 // room for the island, like the real status bar

/** A phone drawn in CSS with the real app inside (the demo, in memory), touring Inicio → Reservar → Mi plan. */
export function LivePhone() {
  const { t, lang } = useI18n()
  const screen = useRef(null)
  const [scale, setScale] = useState(0.62)
  useEffect(() => {
    const el = screen.current
    const ro = new ResizeObserver(() => setScale(el.clientWidth / SCREEN_W))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div className="iphone-stage" aria-hidden="true">
      <div className="iphone">
        <span className="iphone__key iphone__key--action" />
        <span className="iphone__key iphone__key--up" />
        <span className="iphone__key iphone__key--down" />
        <span className="iphone__key iphone__key--power" />
        <div className="iphone__screen" ref={screen}>
          <iframe key={lang} src="/vista" title={t('landing.phoneTitle')} tabIndex={-1} loading="lazy"
            style={{ width: SCREEN_W, height: SCREEN_W * 2.17 - STATUS_H, top: STATUS_H * scale, transform: `scale(${scale})` }} />
          <span className="iphone__island" />
        </div>
      </div>
      <span className="iphone__ground" />
    </div>
  )
}
