export type Zone = 'landing' | 'app' | 'field'

const FIELD_ROUTES = [/^\/project\/[^/]+\/today\/?$/, /^\/review(\/|$)/]

/** Worker and foreman routes get the field zone (18 px / 500 base, 02-type §7.3). */
export function zoneForPath(pathname: string): Zone {
  if (pathname === '/') return 'landing'
  if (FIELD_ROUTES.some((re) => re.test(pathname))) return 'field'
  return 'app'
}

export const THEME_ROOT_ID = 'bp-root'

/** Portal target: the themed root, or body before it mounts (tests). */
export function portalTarget(): HTMLElement {
  return document.getElementById(THEME_ROOT_ID) ?? document.body
}
