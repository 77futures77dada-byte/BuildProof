import { describe, expect, it } from 'vitest'
import { routeAfterSignIn } from './roleRoute'
import {
  codeSendError, isValidCode, isValidEmail, maskEmail, normalizeCode, parseLinkError,
  readCodeSent, saveCodeSent, secondsLeft,
} from './authCode'
import { isEmailGateOpen } from './emailGate'

describe('routeAfterSignIn', () => {
  it('worker with one site goes to today', () => {
    expect(routeAfterSignIn('worker', ['p1'])).toBe('/project/p1/today')
  })
  it('worker with several or no sites goes to the list', () => {
    expect(routeAfterSignIn('worker', ['p1', 'p2'])).toBe('/dashboard')
    expect(routeAfterSignIn('worker', [])).toBe('/dashboard')
  })
  it('foreman and client with one site go to the overview', () => {
    expect(routeAfterSignIn('foreman', ['p1'])).toBe('/project/p1')
    expect(routeAfterSignIn('client', ['p1'])).toBe('/project/p1')
  })
  it('owner always goes to the list', () => {
    expect(routeAfterSignIn('gc', ['p1'])).toBe('/dashboard')
  })
  it('keeps the page the person was sent away from', () => {
    expect(routeAfterSignIn('worker', ['p1'], '/project/p2/photos')).toBe('/project/p2/photos')
    expect(routeAfterSignIn('worker', ['p1'], '/login')).toBe('/project/p1/today')
    expect(routeAfterSignIn('worker', ['p1'], '/dashboard')).toBe('/project/p1/today')
  })
})

describe('code field', () => {
  it('accepts 6 to 10 digits', () => {
    expect(isValidCode('12345')).toBe(false)
    expect(isValidCode('123456')).toBe(true)
    expect(isValidCode('1234567890')).toBe(true)
    expect(isValidCode('12345678901')).toBe(false)
    expect(isValidCode('12345a')).toBe(false)
  })
  it('cleans a pasted code', () => {
    expect(normalizeCode(' 123 456 ')).toBe('123456')
    expect(normalizeCode('Ваш код: 12-34-56')).toBe('123456')
    expect(normalizeCode('123456789012')).toBe('1234567890')
  })
  it('validates and masks e-mail', () => {
    expect(isValidEmail('a@b.ee')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(maskEmail('pavel@gmail.com')).toBe('p•••@gmail.com')
  })
})

describe('code sent state', () => {
  it('round-trips through storage', () => {
    const m = new Map<string, string>()
    const kv = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
    saveCodeSent({ email: 'a@b.ee', at: 5 }, kv)
    expect(readCodeSent(kv)).toEqual({ email: 'a@b.ee', at: 5 })
  })
  it('counts the resend wait down in seconds', () => {
    expect(secondsLeft(0, 0)).toBe(60)
    expect(secondsLeft(0, 59_500)).toBe(1)
    expect(secondsLeft(0, 61_000)).toBe(0)
  })
  it('maps send errors', () => {
    expect(codeSendError({ status: 429, message: 'For security purposes, you can only request this after 41 seconds.' })).toBe('retryAfter')
    expect(codeSendError({ code: 'over_email_send_rate_limit', status: 429 })).toBe('projectLimit')
    expect(codeSendError(new TypeError('Failed to fetch'))).toBe('sendFailed')
  })
})

describe('link errors and gate', () => {
  it('reads expired links and PKCE in another browser', () => {
    expect(parseLinkError('#error=access_denied&error_code=otp_expired', '')).toBe('expired')
    expect(parseLinkError('', '?code=abc', true)).toBe('otherBrowser')
    expect(parseLinkError('', '?code=abc', false)).toBeNull()
    expect(parseLinkError('', '')).toBeNull()
  })
  it('gate is closed unless the flag is exactly true', () => {
    expect(isEmailGateOpen({})).toBe(false)
    expect(isEmailGateOpen({ VITE_EMAIL_GATE_OPEN: '1' })).toBe(false)
    expect(isEmailGateOpen({ VITE_EMAIL_GATE_OPEN: 'true' })).toBe(true)
  })
})
