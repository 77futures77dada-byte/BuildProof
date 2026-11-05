import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { Locale } from '../../i18n'

const SiteLoop = lazy(() => import('../../components/SiteLoop').then((m) => ({ default: m.SiteLoop })))

/** Start fetching the animation chunk this far before the box scrolls into view. */
const PRELOAD_MARGIN = '600px 0px'

/**
 * The SiteLoop animation, loaded only when its box nears the viewport. Until
 * then (and while the chunk downloads) a still poster with the same 16:9 box
 * and control-bar height holds the space, so nothing shifts. Pausing off-screen
 * and reduced motion are handled by SiteLoop itself.
 */
export function LazySiteLoop({ locale, loadingLabel }: { locale: Locale; loadingLabel: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = boxRef.current
    if (!el || near) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [near])

  const poster = (
    <div aria-hidden="true">
      <img className="poster" src="/landing/site-loop-poster.jpg" width={1280} height={720} alt="" loading="lazy" decoding="async" />
      <div className="poster-bar">{loadingLabel}</div>
    </div>
  )

  return (
    <div ref={boxRef} className="loopbox">
      {near ? (
        <Suspense fallback={poster}>
          <SiteLoop lang={locale} />
        </Suspense>
      ) : (
        poster
      )}
    </div>
  )
}
