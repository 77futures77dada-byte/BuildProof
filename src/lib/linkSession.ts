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

/** Draft owners of link pages start with this, so the signed-in app can tell them apart. */
export const LINK_OWNER_PREFIX = 'link:'

function newLocalId(): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
  return `${LINK_OWNER_PREFIX}${id}`
}

/** Stored value: the token (absent after forget) and the device-local owner id (kept). */
function parse(raw: string | null): { token: string | null; localId: string | null } {
  if (!raw) return { token: null, localId: null }
  try {
    const v = JSON.parse(raw) as { token?: unknown; localId?: unknown }
    return {
      token: typeof v.token === 'string' && TOKEN_RE.test(v.token) ? v.token : null,
      localId: typeof v.localId === 'string' && v.localId ? v.localId : null,
    }
  } catch {
    return { token: null, localId: null }
  }
}

export interface SessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * Resolve the session for a link page. A token in the fragment wins (a new
 * link replaces the old token on this device); otherwise the stored one is
 * used. The local id survives a new link and a forget, so unsent drafts of the
 * previous link stay visible and are sent with the new one (critic r1 4.3; a
 * stage from another object comes back `stage_not_found` and waits for the
 * worker). Pure apart from `storage`.
 */
export function resolveLinkSession(kind: LinkKind, hash: string, storage: SessionStorageLike | null): LinkSession | null {
  const fromHash = tokenFromHash(hash)
  let stored: ReturnType<typeof parse> = { token: null, localId: null }
  try { stored = parse(storage?.getItem(KEYS[kind]) ?? null) } catch { /* keep empty */ }
  const current = stored.token && stored.localId ? { token: stored.token, localId: stored.localId } : null
  if (!fromHash) return current
  if (current && current.token === fromHash) return current
  const next = { token: fromHash, localId: stored.localId ?? newLocalId() }
  try { storage?.setItem(KEYS[kind], JSON.stringify(next)) } catch { /* private mode: works for this visit */ }
  return next
}

function browserStorage(): SessionStorageLike | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

/** Read the link session for the current page and wipe the token from the address bar. */
export function takeLinkSession(kind: LinkKind): LinkSession | null {
  if (typeof window === 'undefined') return null
  const { pathname, search } = window.location
  // index.html already moved a `#t=` fragment into memory before the first paint (no token flash)
  const early = (window as Window & { __bpLinkHash?: string }).__bpLinkHash
  const hash = early ?? window.location.hash
  if (early !== undefined) delete (window as Window & { __bpLinkHash?: string }).__bpLinkHash
  const session = resolveLinkSession(kind, hash, browserStorage())
  if (tokenFromHash(hash) !== null || /(^#|&)t=/.test(hash)) {
    try { window.history.replaceState(window.history.state, '', `${pathname}${search}${hashWithoutToken(hash)}`) } catch { /* ignore */ }
  }
  return session
}

/**
 * Forget the token on this device (revoked / expired link: never keep a dead
 * credential). The local id stays so drafts on the phone are not orphaned.
 */
export function forgetLinkToken(kind: LinkKind, storage: SessionStorageLike | null = browserStorage()): void {
  try {
    const { localId } = parse(storage?.getItem(KEYS[kind]) ?? null)
    if (localId) storage?.setItem(KEYS[kind], JSON.stringify({ localId }))
    else storage?.removeItem(KEYS[kind])
  } catch { /* ignore */ }
}
