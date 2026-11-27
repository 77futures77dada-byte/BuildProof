import { describe, expect, it } from 'vitest'
import type { Draft } from './drafts'
import { classifyLinkError, fetchWorkerReports, linkDraftErrorKey, linkLoadErrorKey, LinkApiError, submitBodyFor, workerLinkTransport } from './linkTransport'
import type { FetchLike } from './linkTransport'

const TOKEN = 'T'.repeat(43)

function draft(p: Partial<Draft> = {}): Draft {
  return {
    draftId: '00000000-0000-4000-8000-000000000001', userId: 'link', projectId: 'p', stageId: 's1', stageName: 'Кровля',
    seenPercent: 40, newPercent: 50, reason: null, photo: null, storagePath: '', state: 'queued', createdAt: 0,
    attempts: 0, lastAttemptAt: null, lastError: null, stalePercent: null,
    photos: [new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })], takenAt: null, deviceTime: '2026-11-27T10:00:00.000Z', ...p,
  }
}

function fake(status: number, body: unknown, seen: { url: string; init?: RequestInit }[] = []): FetchLike {
  return async (url, init) => { seen.push({ url, init }); return new Response(JSON.stringify(body), { status }) }
}

describe('error codes → draft errors and texts', () => {
  it('maps contract codes', () => {
    expect(classifyLinkError(new LinkApiError('invalid_worker_link', 401))).toBe('auth')
    expect(classifyLinkError(new LinkApiError('worker_link_rate_limit', 429))).toBe('rate_limit')
    expect(classifyLinkError(new LinkApiError('total_photo_size_exceeded', 413))).toBe('photo_invalid')
    expect(classifyLinkError(new LinkApiError('decrease_reason_required', 400))).toBe('comment_required')
    expect(classifyLinkError(new LinkApiError('photo_upload_failed', 500))).toBe('network')
    expect(classifyLinkError(new LinkApiError('request_failed', 400))).toBe('other')
  })
  it('invalid link → «ask the owner for a new one» text', () => {
    expect(linkDraftErrorKey('auth')).toBe('linkPage.error.invalidLink')
    expect(linkLoadErrorKey('invalid_worker_link')).toBe('linkPage.error.invalidLink')
    expect(linkLoadErrorKey('invalid_client_link')).toBe('linkPage.error.invalidLink')
    expect(linkDraftErrorKey('rate_limit')).toBe('linkPage.error.rateLimit')
    expect(linkDraftErrorKey(null)).toBeNull()
  })
})

describe('submit body and transport', () => {
  it('builds the contract body: client_request_id = draft id, reason code, base64 photos', async () => {
    const b = await submitBodyFor(draft({ seenPercent: 60, newPercent: 50 }), 50, 'rework')
    expect(b).toMatchObject({ stage_id: 's1', claimed_percent: 50, client_request_id: '00000000-0000-4000-8000-000000000001', decrease_reason: 'rework', taken_at: null, device_time: '2026-11-27T10:00:00.000Z' })
    expect(b.photos).toEqual([{ content_type: 'image/jpeg', base64: '/9j/' }])
    expect((await submitBodyFor(draft(), 50, 'Переделка')).decrease_reason).toBeNull()
  })
  it('sends the bearer token and throws the API code', async () => {
    const seen: { url: string; init?: RequestInit }[] = []
    const t = workerLinkTransport(TOKEN, fake(429, { error: 'worker_link_rate_limit' }, seen))
    await expect(t.submitDraft!(draft(), 50, null)).rejects.toMatchObject({ code: 'worker_link_rate_limit', status: 429 })
    expect(seen[0].url).toBe('/api/worker-link-submit')
    expect((seen[0].init!.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`)
  })
  it('currentPercent reads the stage list; network failure → network', async () => {
    const t = workerLinkTransport(TOKEN, fake(200, { project_id: 'p', worker_name: 'W', stages: [{ id: 's1', name: 'A', progress_percent: 70 }] }))
    expect(await t.currentPercent('s1')).toBe(70)
    const down = workerLinkTransport(TOKEN, async () => { throw new TypeError('Failed to fetch') })
    await expect(down.currentPercent('s1')).rejects.toMatchObject({ code: 'network' })
  })
  it('reports: bare photo paths become {path,url:null}', async () => {
    const r = await fetchWorkerReports(TOKEN, 20, fake(200, { reports: [{ id: 'r', stage_id: 's1', claimed_percent: 50, status: 'pending', created_at: '', taken_at: null, device_time: null, uploaded_at: null, photos: ['a/b.jpg'] }] }))
    expect(r[0].photos).toEqual([{ path: 'a/b.jpg', url: null }])
  })
})
