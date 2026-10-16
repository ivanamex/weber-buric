// How each monthly plan looks on its card (website and app): its own accent color, a pictogram and one short fact.
// "Mejor precio por clase" goes to whichever plan is cheapest per class with the live prices.
const LOOK = {
  4: { color: 'slate', icon: 'horseshoe', fact: 'start' },
  8: { color: 'sage', icon: 'rosette', fact: 'steady' },
  12: { color: 'mustard', icon: 'trophy', fact: 'more' },
}
export const planLook = (classes) => LOOK[classes] || { color: 'sage', icon: 'horseshoe', fact: null }

/** The plan with the lowest price per class (classes count), or null when no prices are known. */
export function bestValue(plans) {
  let best = null
  for (const p of plans) if (p.price > 0 && (!best || p.price / p.classes < best.price / best.classes)) best = p
  return best?.classes ?? null
}

/** The fact line's key (under `planCard.`) for a plan, given the best-value plan. */
export const planFact = (classes, best) => (classes === best ? 'best' : planLook(classes).fact)
