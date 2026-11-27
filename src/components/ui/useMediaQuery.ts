import { useSyncExternalStore } from 'react'

/**
 * `true` while the media query matches. For mounting heavy blocks only where they
 * are shown (e.g. the 3D model from 1024 px): `hidden lg:block` would still mount
 * them and load their chunk on a phone.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    () => false,
  )
}

/** Tailwind `lg` (1024 px): desktop layout of the overview. */
export const LG_QUERY = '(min-width: 1024px)'
