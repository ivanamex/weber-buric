import { Component } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'

function ErrorCard() {
  const { t } = useI18n()
  const reload = () => { try { sessionStorage.removeItem('hipico.reloadedFor') } catch { /* no storage */ } window.location.reload() }
  return (
    <div className="screenerr" role="alert">
      <p className="screenerr__title">{t('update.loadFailed')}</p>
      <p className="small muted">{t('update.loadFailedText')}</p>
      <button type="button" className="btn btn--primary" onClick={reload}>{t('update.reload')}</button>
    </div>
  )
}

/** A screen that can't load (its files are gone and one reload didn't help): a card with "Recargar", never a blank page. */
export class ScreenBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error('[hipico] screen failed', err) }
  render() { return this.state.failed ? <ErrorCard /> : this.props.children }
}
