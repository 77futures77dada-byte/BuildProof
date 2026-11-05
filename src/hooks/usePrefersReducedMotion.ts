import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Tracks the OS "reduce motion" setting, including changes while the page is open. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(QUERY).matches === true,
  )

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const onChange = () => setReduced(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
