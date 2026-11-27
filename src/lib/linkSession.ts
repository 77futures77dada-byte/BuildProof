/**
 * Link token for the public pages `/w` (worker) and `/c` (client).
 *
 * The token arrives only in the URL fragment `#t=<token>` (the fragment never
 * reaches the server or its logs). It is stored on this device so the page
 * opens again tomorrow or from a bookmark, and the fragment is wiped from the
 * address bar right away. The token is never logged or shown.
 */
export type LinkKind = 'worker' | 'client'

export interface LinkSession {
  token: string
  /** Random id of this link on this device; owns the drafts in IndexedDB. Not the token. */
  localId: string
}

const KEYS: Record<LinkKind, string> = { worker: 'bp-link-worker', client: 'bp-link-client' }
/** API tokens are 32 random bytes, URL-safe base64 (43 chars); the API accepts 32–128. */
const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/

/** Token from a location hash like `#t=abc`, or null. */
export function tokenFromHash(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  const t = new URLSearchParams(raw).get('t')
  return t && TOKEN_RE.test(t) ? t : null
}

/** Hash without the `t` parameter (other parameters kept). */
export function hashWithoutToken(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(raw)
  params.delete('t')
  const rest = params.toString()
  return rest ? `#${rest}` : ''
}

function newLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

function parse(raw: string | null): LinkSession | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<LinkSession>
    return typeof v.token === 'string' && TOKEN_RE.test(v.token) && typeof v.localId === 'string' && v.localId
      ? { token: v.token, localId: v.localId }
      : null
  } catch {
    return null
  }
}

export interface SessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * Resolve the session for a link page. A token in the fragment wins (a new
 * link replaces the old one on this device and gets a new localId); otherwise
 * the stored one is used. Pure apart from `storage`.
 */
export function resolveLinkSession(kind: LinkKind, hash: string, storage: SessionStorageLike | null): LinkSession | null {
  const fromHash = tokenFromHash(hash)
  let stored: LinkSession | null = null
  try { stored = parse(storage?.getItem(KEYS[kind]) ?? null) } catch { stored = null }
  if (!fromHash) return stored
  if (stored && stored.token === fromHash) return stored
  const next = { token: fromHash, localId: newLocalId() }
  try { storage?.setItem(KEYS[kind], JSON.stringify(next)) } catch { /* private mode: works for this visit */ }
  return next
}

function browserStorage(): SessionStorageLike | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

/** Read the link session for the current page and wipe the token from the address bar. */
export function takeLinkSession(kind: LinkKind): LinkSession | null {
  if (typeof window === 'undefined') return null
  const { hash, pathname, search } = window.location
  const session = resolveLinkSession(kind, hash, browserStorage())
  if (tokenFromHash(hash) !== null || /(^#|&)t=/.test(hash)) {
    try { window.history.replaceState(window.history.state, '', `${pathname}${search}${hashWithoutToken(hash)}`) } catch { /* ignore */ }
  }
  return session
}

/** Forget the stored link on this device. */
export function forgetLinkSession(kind: LinkKind): void {
  try { browserStorage()?.removeItem(KEYS[kind]) } catch { /* ignore */ }
}
