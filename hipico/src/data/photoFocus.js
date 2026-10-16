// Where the subject sits in each club photo, so a round crop shows the horse's head, not its neck.
// Keys are file names (any folder, any size suffix); the value is a CSS object-position.
const FOCUS = {
  'girl-horse-closeup': '50% 30%',
  'girl-horse-nose': '45% 40%',
  'horse-fence': '50% 25%',
  'horse-blaze': '50% 30%', // the whole head: ears, eye, blaze and nose
  'jump-bay': '55% 35%',
  'jump-grey': '50% 30%',
  'rider-buckskin': '50% 35%',
  'horse-rope-jungle': '50% 35%',
  'paddock-herd': '50% 55%',
}

/** The focal point of a photo URL; heads are usually in the upper part, so '50% 35%' when unknown. */
export function photoFocus(src) {
  const name = String(src || '').split('/').pop().replace(/-\d+\.(webp|jpe?g|png)$/i, '').replace(/\.(webp|jpe?g|png)$/i, '')
  return FOCUS[name] || '50% 35%'
}
