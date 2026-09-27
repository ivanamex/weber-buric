import { useId } from 'react'

/** Line pictogram beside the greeting: a sun rising (morning), a sun half-set (afternoon), a crescent moon with a star (evening). */
export function GreetingMark({ time }) {
  const clip = useId()
  if (time === 'evening') {
    return (
      <svg className="greetmark greetmark--evening" viewBox="0 0 32 24" aria-hidden="true">
        <path className="greetmark__body" d="M20.5 15.6A8.2 8.2 0 1 1 11.4 5.1a6.4 6.4 0 0 0 9.1 10.5z" />
        <path className="greetmark__star" d="M25.5 3.2v5M23 5.7h5" />
      </svg>
    )
  }
  const horizon = time === 'afternoon' ? 17 : 19
  return (
    <svg className={`greetmark greetmark--${time}`} viewBox="0 0 32 24" aria-hidden="true">
      <clipPath id={clip}><rect x="0" y="-8" width="32" height={horizon + 8} /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <g className="greetmark__body">
          {time === 'afternoon' ? (
            <>
              <circle cx="16" cy="17" r="5.5" />
              <path d="M16 8.2v-2M9.6 11.2 8.3 9.9M22.4 11.2l1.3-1.3" />
            </>
          ) : (
            <>
              <circle cx="16" cy="14" r="5" />
              <path d="M16 6V3.8M10.3 8.3 8.8 6.8M21.7 8.3l1.5-1.5M8 14H5.8M24 14h2.2" />
            </>
          )}
        </g>
      </g>
      <path className="greetmark__horizon" d={`M3 ${horizon}h26`} />
    </svg>
  )
}
