import { useI18n } from '../i18n/I18nProvider.jsx'

export function LangToggle({ light = false }) {
  const { lang, setLang, t } = useI18n()
  return (
    <div className={`lang ${light ? 'lang--light' : ''}`} role="group" aria-label={t('common.language')}>
      {['es', 'en'].map((l) => (
        <button key={l} type="button" className={lang === l ? 'is-active' : ''} aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
