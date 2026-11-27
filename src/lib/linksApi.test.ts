import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }))

const { clampDays, errorKey, expiryIso, linkState, linkUrl, mergeVisibility } = await import('./linksApi')
const { isReportReviewOn, queuePercents } = await import('./reportReview')

const NOW = Date.parse('2026-11-27T10:00:00Z')
const DAY = 86400e3

describe('linkUrl', () => {
  it('puts the token in the fragment only', () => {
    expect(linkUrl('worker', 'abc_-1', 'https://x.ee')).toBe('https://x.ee/w#t=abc_-1')
    expect(linkUrl('client', 'tok', 'https://x.ee')).toBe('https://x.ee/c#t=tok')
    expect(linkUrl('worker', 'tok', 'https://x.ee')).not.toContain('?')
  })
})

describe('linkState', () => {
  it('revoked wins, then expiry', () => {
    expect(linkState({ expires_at: new Date(NOW + DAY).toISOString(), revoked_at: null }, NOW)).toBe('active')
    expect(linkState({ expires_at: new Date(NOW - 1).toISOString(), revoked_at: null }, NOW)).toBe('expired')
    expect(linkState({ expires_at: new Date(NOW + DAY).toISOString(), revoked_at: new Date(NOW).toISOString() }, NOW)).toBe('revoked')
  })
})

describe('expiry', () => {
  it('clamps to 1…90, default 30', () => {
    expect(clampDays(0)).toBe(1)
    expect(clampDays(500)).toBe(90)
    expect(clampDays(Number.NaN)).toBe(30)
    expect(clampDays(14.4)).toBe(14)
  })
  it('stays inside the server 90-day window', () => {
    expect(Date.parse(expiryIso(30, NOW))).toBe(NOW + 30 * DAY)
    expect(Date.parse(expiryIso(90, NOW))).toBeLessThan(NOW + 90 * DAY)
  })
})

describe('errorKey', () => {
  it('maps known codes and falls back to generic', () => {
    expect(errorKey('worker_link_limit')).toBe('links.error.worker_link_limit')
    expect(errorKey('client_link_limit')).toBe('links.error.client_link_limit')
    expect(errorKey('link_create_failed')).toBe('links.error.generic')
    expect(errorKey(undefined)).toBe('links.error.generic')
  })
})

describe('mergeVisibility', () => {
  it('a stage in the preview is visible; photos on when the preview has them', () => {
    const preview = {
      project_id: 'p', project_name: 'P', disclaimer: '',
      stages: [
        { stage_id: 's1', name: 'A', confirmed_percent: 10, updated_at: null, photos: [] },
        { stage_id: 's2', name: 'B', confirmed_percent: 20, updated_at: null, photos: [{ path: 'x', url: 'u' }] },
      ],
    }
    const out = mergeVisibility({ s1: { visible: false, photos: false }, s3: { visible: true, photos: true } }, preview)
    expect(out).toEqual({ s1: { visible: true, photos: false }, s2: { visible: true, photos: true }, s3: { visible: true, photos: true } })
  })
})

describe('report review', () => {
  it('K15 is on unless explicitly off', () => {
    expect(isReportReviewOn({})).toBe(true)
    expect(isReportReviewOn({ VITE_REPORT_REVIEW: 'true' })).toBe(true)
    expect(isReportReviewOn({ VITE_REPORT_REVIEW: 'false' })).toBe(false)
  })
  it('queue percents: link reports use claimed pair, account reports old/new', () => {
    expect(queuePercents({ previous_confirmed_percent: 30, claimed_percent: 60, old_percent: 30, new_percent: 60 })).toEqual({ from: 30, to: 60 })
    expect(queuePercents({ old_percent: 10, new_percent: 50, previous_confirmed_percent: null, claimed_percent: null })).toEqual({ from: 10, to: 50 })
  })
})
