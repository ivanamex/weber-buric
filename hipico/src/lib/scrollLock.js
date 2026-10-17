// One lock for the page underneath every lightbox, sheet and cart. It counts: the page scrolls again only when the
// last open one lets go, so two sheets (or one closing while the next opens) never leave it stuck.
let count = 0
let saved = null

/** Hold the page still; returns the release (safe to call more than once). */
export function lockScroll() {
  if (count++ === 0) {
    saved = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  let done = false
  return () => {
    if (done) return
    done = true
    count = Math.max(0, count - 1)
    if (count === 0) {
      document.body.style.overflow = saved || ''
      saved = null
    }
  }
}

/** True while any sheet or lightbox holds the page. */
export const isScrollLocked = () => count > 0
