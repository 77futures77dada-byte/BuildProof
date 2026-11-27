import { describe, expect, it } from 'vitest'
import { forgetLinkToken, hashWithoutToken, LINK_OWNER_PREFIX, resolveLinkSession, tokenFromHash } from './linkSession'

const TOKEN = 'A'.repeat(43)
const OTHER = 'b_-'.repeat(15)

function mem() {
  const m = new Map<string, string>()
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) } }
}

describe('token from the fragment', () => {
  it('reads #t= and rejects short or odd tokens', () => {
    expect(tokenFromHash(`#t=${TOKEN}`)).toBe(TOKEN)
    expect(tokenFromHash(`#x=1&t=${TOKEN}`)).toBe(TOKEN)
    expect(tokenFromHash('#t=short')).toBeNull()
    expect(tokenFromHash(`#t=${TOKEN}!`)).toBeNull()
    expect(tokenFromHash('')).toBeNull()
  })
  it('strips only t from the hash', () => {
    expect(hashWithoutToken(`#t=${TOKEN}`)).toBe('')
    expect(hashWithoutToken(`#x=1&t=${TOKEN}`)).toBe('#x=1')
  })
})

describe('resolveLinkSession', () => {
  it('stores a new token and reuses it without the fragment (bookmark, next day)', () => {
    const s = mem()
    const first = resolveLinkSession('worker', `#t=${TOKEN}`, s)
    expect(first?.token).toBe(TOKEN)
    expect(resolveLinkSession('worker', '', s)).toEqual(first)
    expect(resolveLinkSession('worker', `#t=${TOKEN}`, s)).toEqual(first)
  })
  it('a different link replaces the token but keeps the local id (drafts are not orphaned)', () => {
    const s = mem()
    const a = resolveLinkSession('worker', `#t=${TOKEN}`, s)!
    expect(a.localId.startsWith(LINK_OWNER_PREFIX)).toBe(true)
    const b = resolveLinkSession('worker', `#t=${OTHER}`, s)!
    expect(b.token).toBe(OTHER)
    expect(b.localId).toBe(a.localId)
  })
  it('forget drops the token only; the next link reuses the local id', () => {
    const s = mem()
    const a = resolveLinkSession('worker', `#t=${TOKEN}`, s)!
    forgetLinkToken('worker', s)
    expect(resolveLinkSession('worker', '', s)).toBeNull()
    expect(s.m.get('bp-link-worker')).not.toContain(TOKEN)
    expect(resolveLinkSession('worker', `#t=${OTHER}`, s)?.localId).toBe(a.localId)
  })
  it('worker and client links are kept apart; nothing stored → null', () => {
    const s = mem()
    resolveLinkSession('worker', `#t=${TOKEN}`, s)
    expect(resolveLinkSession('client', '', s)).toBeNull()
  })
  it('works without storage (private mode) and ignores garbage', () => {
    expect(resolveLinkSession('client', `#t=${TOKEN}`, null)?.token).toBe(TOKEN)
    const s = mem()
    s.setItem('bp-link-worker', '{oops')
    expect(resolveLinkSession('worker', '', s)).toBeNull()
  })
})
