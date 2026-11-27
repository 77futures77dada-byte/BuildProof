/**
 * Pure helpers for sign-in by e-mail code (03 §3.2–§3.5, residual Б4-М5).
 * Supabase OTP length is a project setting (6–10 digits), so the field takes
 * any length in that range and never says «6 цифр».
 */

export const CODE_MIN = 6
export const CODE_MAX = 10
export const RESEND_SECONDS = 60
const SENT_KEY = 'bp:codeSent'
const LAST_EMAIL_KEY = 'bp:lastEmail'

/** Keeps digits only (pasted «123 456», «123-456» or a whole sentence) and caps the length. */
export function normalizeCode(input: string): string {
  return input.replace(/\D+/g, '').slice(0, CODE_MAX)
}

export function isValidCode(code: string): boolean {
  return new RegExp(`^\\d{${CODE_MIN},${CODE_MAX}}$`).test(code)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

/** «pavel@gmail.com» → «p•••@gmail.com». */
export function maskEmail(email: string): string {
  const [name, domain] = email.trim().split('@')
  if (!name || !domain) return email
  return `${name[0]}•••@${domain}`
}

export interface CodeSent {
  email: string
  /** epoch ms of the last send, for the resend countdown */
  at: number
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
function store(kind: 'session' | 'local'): KV | null {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

/** «Код отправлен на {почта}» survives a reload / a trip to the mail app (sessionStorage). */
export function saveCodeSent(value: CodeSent, kv: KV | null = store('session')) {
  try { kv?.setItem(SENT_KEY, JSON.stringify(value)) } catch { /* private mode */ }
}

export function readCodeSent(kv: KV | null = store('session')): CodeSent | null {
  try {
    const raw = kv?.getItem(SENT_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<CodeSent>
    return typeof v.email === 'string' && typeof v.at === 'number' ? { email: v.email, at: v.at } : null
  } catch {
    return null
  }
}

export function clearCodeSent(kv: KV | null = store('session')) {
  try { kv?.removeItem(SENT_KEY) } catch { /* ignore */ }
}

export function readLastEmail(kv: KV | null = store('local')): string | null {
  try { return kv?.getItem(LAST_EMAIL_KEY) ?? null } catch { return null }
}

export function saveLastEmail(email: string, kv: KV | null = store('local')) {
  try { kv?.setItem(LAST_EMAIL_KEY, email.trim()) } catch { /* ignore */ }
}

/** Seconds left before another code may be requested (0 = may resend now). */
export function secondsLeft(sentAt: number, now: number, wait = RESEND_SECONDS): number {
  return Math.max(0, Math.ceil((sentAt + wait * 1000 - now) / 1000))
}

export type LinkError = 'expired' | 'otherBrowser'

/**
 * Error coming back on /login from an e-mail link (03 §3.5):
 * `#error=access_denied&error_code=otp_expired` (old or used link) and a PKCE
 * `?code=` that cannot be exchanged because the verifier lives in another
 * browser (the mail app's built-in one).
 */
export function parseLinkError(hash: string, search: string, pkceFailed = false): LinkError | null {
  const h = new URLSearchParams(hash.replace(/^#/, ''))
  if (h.get('error') || h.get('error_code')) return 'expired'
  const q = new URLSearchParams(search)
  if (q.get('error') || q.get('error_code')) return 'expired'
  if (pkceFailed && q.get('code')) return 'otherBrowser'
  return null
}

export type CodeSendError = 'retryAfter' | 'projectLimit' | 'sendFailed'

/** Maps a signInWithOtp error; unknown addresses are not an error on the public page (neutral text). */
export function codeSendError(err: unknown): CodeSendError {
  const e = (err ?? {}) as { code?: string; status?: number; message?: string }
  if (e.code === 'over_email_send_rate_limit') return 'projectLimit'
  if (e.status === 429 || e.code === 'over_request_rate_limit' || /security purposes|seconds/i.test(e.message ?? '')) return 'retryAfter'
  return 'sendFailed'
}
