/**
 * Colour theme (tokens.css): light / dark navy / as the system says.
 *
 * - The choice is per device (localStorage); nothing goes to the server.
 * - With no choice the theme follows the role: navy dark for the owner and the
 *   client (and signed-out pages), light for people on site — worker and
 *   foreman — because light reads better in sunlight (owner brief 2026-11-28).
 * - The last role is remembered so a worker reopening the app does not see a
 *   dark flash before the profile loads.
 * One theme for the whole product: it sits on <html>, so every screen, sheet
 * and modal (portals into #bp-root) get the same one.
 */
export type ThemePref = 'light' | 'dark' | 'system'
export type ThemeRole = 'gc' | 'foreman' | 'worker' | 'client' | null | undefined

const PREF_KEY = 'bp-theme'
const ROLE_KEY = 'bp-theme-role'
const PREFS: readonly ThemePref[] = ['light', 'dark', 'system']

function read(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) } catch { /* private mode: theme still applies for this visit */ }
}

export function storedThemePref(): ThemePref | null {
  const v = read(PREF_KEY)
  return PREFS.includes(v as ThemePref) ? (v as ThemePref) : null
}

export function rememberedRole(): ThemeRole {
  const v = read(ROLE_KEY)
  return v === 'gc' || v === 'foreman' || v === 'worker' || v === 'client' ? v : null
}

/** Default by role: people on site get light, everyone else navy dark. */
export function defaultTheme(role: ThemeRole): 'light' | 'dark' {
  return role === 'worker' || role === 'foreman' ? 'light' : 'dark'
}

/** What the switcher shows: the stored choice, else the role default. */
export function effectivePref(pref: ThemePref | null, role: ThemeRole): ThemePref {
  return pref ?? defaultTheme(role)
}

let systemListener: ((e: MediaQueryListEvent) => void) | null = null

/** Put the theme on <html> and keep the browser bar colour (theme-color) in step with --bg. */
export function applyTheme(pref: ThemePref | null = storedThemePref(), role: ThemeRole = rememberedRole()) {
  const html = document.documentElement
  const p = effectivePref(pref, role)
  if (p === 'system') delete html.dataset.theme
  else html.dataset.theme = p
  syncThemeColor()
  const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null
  if (mq && systemListener) mq.removeEventListener('change', systemListener)
  systemListener = null
  if (mq && p === 'system') {
    systemListener = () => syncThemeColor()
    mq.addEventListener('change', systemListener)
  }
}

export function setThemePref(pref: ThemePref, role: ThemeRole = rememberedRole()) {
  write(PREF_KEY, pref)
  applyTheme(pref, role)
}

/** Called when the profile is known: remember the role and re-apply if the user never chose. */
export function applyRoleTheme(role: ThemeRole) {
  write(ROLE_KEY, role ?? null)
  applyTheme(storedThemePref(), role)
}

function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  if (!bg) return
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
  metas.forEach((m, i) => {
    if (i === 0) { m.removeAttribute('media'); m.content = bg } else m.remove()
  })
}
