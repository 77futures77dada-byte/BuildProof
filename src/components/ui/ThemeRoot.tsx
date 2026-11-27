import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { THEME_ROOT_ID, zoneForPath } from './theme'

/**
 * The one themed root of the product. Tokens live on :root (tokens.css); this
 * element carries the route zone, and every portal (Modal, Sheet) mounts inside
 * it so dialogs inherit theme and zone (03-wireframes Ж8).
 */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <div id={THEME_ROOT_ID} data-zone={zoneForPath(pathname)}>{children}</div>
}
