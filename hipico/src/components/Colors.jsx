// Color that means something: levels, riders and payment status, the same everywhere.
import { useI18n } from '../i18n/I18nProvider.jsx'
import { familyRiders, horsePhotoUrl, visiblePhotos } from '../data/store.js'
import { Icon } from './Icon.jsx'

/** Principiante · Intermedio · Avanzado · Competencia as a colored pill. */
export function LevelPill({ level }) {
  const { t } = useI18n()
  if (!level) return null
  return <span className={`lvl lvl--${level}`}>{t(`levels.${level}`)}</span>
}

// Five earthy tones: sage, terracotta, ochre, slate blue, plum.
export const RIDER_COLORS = ['#8A8E75', '#B5704F', '#C9A13B', '#5F7A8C', '#7D5A6B']
/** Each rider keeps a color by their place in the family (the first rider sage, the second terracotta…). */
export function riderColor(s, riderId) {
  const rider = s.riders.find((r) => r.id === riderId)
  if (!rider) return RIDER_COLORS[0]
  const i = familyRiders(s, rider.familyId, { includeInactive: true }).findIndex((r) => r.id === riderId)
  return RIDER_COLORS[Math.max(i, 0) % RIDER_COLORS.length]
}
export function RiderDot({ color, size = 10 }) {
  return <span className="riderdot" style={{ '--rc': color, width: size, height: size }} aria-hidden="true" />
}

/** Payment status as a small pill: paid · review · pending · overdue (never a whole card). */
export function StatusPill({ status, children }) {
  return <span className={`stpill stpill--${status}`}><span className="stpill__dot" aria-hidden="true" />{children}</span>
}

/** The horse's main photo (round), or its initial when there's none. */
export function HorseAvatar({ horse, size = 40 }) {
  if (!horse) return null
  const src = visiblePhotos(horse)[0]
  return src
    ? <img className="horseav" src={horsePhotoUrl(src)} alt="" width={size} height={size} style={{ width: size, height: size }} loading="lazy" />
    : <span className="horseav horseav--empty" style={{ width: size, height: size }} aria-hidden="true"><Icon name="horseHead" size={Math.round(size * 0.55)} /></span>
}

/** "🐴 Canela" with the photo: for class cards, the booking sheet and Hoy. */
export function HorseTag({ horse, own = false }) {
  const { t } = useI18n()
  if (!horse) return null
  return (
    <span className="horsetag">
      <HorseAvatar horse={horse} />
      <span><span className="horsetag__label">{t('horses.assigned')}</span><strong>{horse.name}</strong>{own ? ` · ${t('admin.today.own')}` : ''}</span>
    </span>
  )
}
