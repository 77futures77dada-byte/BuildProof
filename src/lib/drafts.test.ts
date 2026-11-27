import { describe, expect, it } from 'vitest'
import {
  decideBeforeSend, effectiveSeenPercent, expireEditing, flushQueue, memoryStore, nextRetryDelay,
  overLimit, resolveStale, DRAFT_LIMIT, EDITING_TTL_MS,
} from './drafts'
import type { Draft, DraftError, DraftTransport } from './drafts'

let seq = 0
function draft(p: Partial<Draft> = {}): Draft {
  seq += 1
  const id = p.draftId ?? `d${seq}`
  return {
    draftId: id, userId: 'u1', projectId: 'p1', stageId: 's1', stageName: 'Кровля',
    seenPercent: 40, newPercent: 50, reason: null, photo: new Blob(['x']),
    storagePath: `p1/${p.stageId ?? 's1'}/${id}.jpg`, state: 'queued', createdAt: seq,
    attempts: 0, lastAttemptAt: null, lastError: null, stalePercent: null, ...p,
  }
}

class Fail extends Error {
  code: DraftError
  constructor(code: DraftError) { super(code); this.code = code }
}

function transport(percents: Record<string, number>, failFor: Record<string, DraftError> = {}) {
  const submitted: { stageId: string; percent: number; reason: string | null; paths: string[] }[] = []
  const t: DraftTransport = {
    async currentPercent(stageId) { return percents[stageId] ?? 0 },
    async upload(path) { const code = Object.entries(failFor).find(([k]) => path.includes(k))?.[1]; if (code) throw new Fail(code) },
    async reportIdForPath() { return null },
    async submit(stageId, percent, reason, paths) { submitted.push({ stageId, percent, reason, paths }) },
    classify(err) { return err instanceof Fail ? err.code : 'other' },
  }
  return { t, submitted }
}

describe('decideBeforeSend — decrease rule (residual Б4-М1)', () => {
  it('sends a decrease as is when the stage did not move', () => {
    expect(decideBeforeSend({ seenPercent: 60, newPercent: 50 }, 60)).toEqual({ kind: 'send', percent: 50 })
  })
  it('never changes a decrease automatically when the stage moved up', () => {
    expect(decideBeforeSend({ seenPercent: 60, newPercent: 50 }, 70)).toEqual({ kind: 'stale', percent: 70 })
  })
  it('never turns a decrease into «photo added» even if the stage is already lower', () => {
    expect(decideBeforeSend({ seenPercent: 60, newPercent: 50 }, 40)).toEqual({ kind: 'stale', percent: 40 })
    expect(decideBeforeSend({ seenPercent: 60, newPercent: 50 }, 50)).toEqual({ kind: 'stale', percent: 50 })
  })
  it('increase: stage already at/above the claim → photo with current %', () => {
    expect(decideBeforeSend({ seenPercent: 40, newPercent: 50 }, 50)).toEqual({ kind: 'stageAhead', percent: 50 })
    expect(decideBeforeSend({ seenPercent: 40, newPercent: 50 }, 80)).toEqual({ kind: 'stageAhead', percent: 80 })
  })
  it('increase: stage moved but still below the claim → manual choice', () => {
    expect(decideBeforeSend({ seenPercent: 40, newPercent: 60 }, 50)).toEqual({ kind: 'stale', percent: 50 })
  })
  it('photo only never goes stale', () => {
    expect(decideBeforeSend({ seenPercent: 40, newPercent: 40 }, 90)).toEqual({ kind: 'send', percent: 90 })
  })
})

describe('flushQueue — independent drafts (residual Б4-М2)', () => {
  it('a stuck draft does not block the others; each keeps its own reason', async () => {
    const a = draft({ draftId: 'stuck', stageId: 's1' })
    const b = draft({ draftId: 'ok', stageId: 's2', seenPercent: 10, newPercent: 20 })
    const c = draft({ draftId: 'dec', stageId: 's3', seenPercent: 60, newPercent: 50, reason: 'Переделка' })
    const store = memoryStore([a, b, c])
    const { t, submitted } = transport({ s1: 40, s2: 10, s3: 60 }, { stuck: 'network' })
    const out = await flushQueue(store, t, 'u1', () => 1000)
    expect(out.map((o) => o.result)).toEqual(['failed', 'sent', 'sent'])
    expect(submitted).toEqual([
      { stageId: 's2', percent: 20, reason: null, paths: ['p1/s2/ok.jpg'] },
      { stageId: 's3', percent: 50, reason: 'Переделка', paths: ['p1/s3/dec.jpg'] },
    ])
    const left = await store.all()
    expect(left).toHaveLength(1)
    expect(left[0]).toMatchObject({ draftId: 'stuck', state: 'queued', lastError: 'network', attempts: 1, lastAttemptAt: 1000 })
  })

  it('a stale draft waits for the worker and the next one still goes', async () => {
    const dec = draft({ draftId: 'dec', seenPercent: 60, newPercent: 50, reason: 'Снос' })
    const next = draft({ draftId: 'n', stageId: 's2', seenPercent: 0, newPercent: 10 })
    const store = memoryStore([dec, next])
    const { t, submitted } = transport({ s1: 70, s2: 0 })
    const out = await flushQueue(store, t, 'u1')
    expect(out[0]).toEqual({ draftId: 'dec', result: 'stale', percent: 70 })
    expect(submitted).toHaveLength(1)
    expect(store.rows.get('dec')).toMatchObject({ state: 'stale', stalePercent: 70, newPercent: 50, reason: 'Снос' })
    // a second flush does not touch the stale draft
    expect(await flushQueue(store, t, 'u1')).toEqual([])
  })

  it('timeout → unknown; next try checks the photo first and reports «дошло раньше»', async () => {
    const d = draft({ draftId: 'x' })
    const store = memoryStore([d])
    const { t } = transport({ s1: 40 }, { x: 'timeout' })
    await flushQueue(store, t, 'u1')
    expect(store.rows.get('x')?.state).toBe('unknown')
    const t2: DraftTransport = { ...t, reportIdForPath: async () => 'r1' }
    expect(await flushQueue(store, t2, 'u1')).toEqual([{ draftId: 'x', result: 'sentEarlier' }])
    expect(store.rows.size).toBe(0)
  })

  it('only own drafts are sent; auth failure stops the loop but keeps drafts', async () => {
    const mine1 = draft({ draftId: 'm1' })
    const mine2 = draft({ draftId: 'm2', stageId: 's2' })
    const other = draft({ draftId: 'o', userId: 'u2' })
    const store = memoryStore([mine1, mine2, other])
    const { t } = transport({ s1: 40, s2: 40 }, { m1: 'auth' })
    const out = await flushQueue(store, t, 'u1')
    expect(out).toEqual([{ draftId: 'm1', result: 'failed', error: 'auth' }])
    expect(store.rows.size).toBe(3)
  })

  it('increase already reached sends the photo with the current %', async () => {
    const store = memoryStore([draft({ draftId: 'a', seenPercent: 40, newPercent: 50 })])
    const { t, submitted } = transport({ s1: 60 })
    expect(await flushQueue(store, t, 'u1')).toEqual([{ draftId: 'a', result: 'stageAhead', percent: 60 }])
    expect(submitted[0]).toMatchObject({ percent: 60, reason: null })
  })
})

describe('helpers', () => {
  it('resolveStale re-bases on the current % and keeps the reason only for a decrease', () => {
    const d = draft({ state: 'stale', seenPercent: 60, newPercent: 50, reason: 'Снос', stalePercent: 70 })
    expect(resolveStale(d, 60, 'Снос')).toMatchObject({ seenPercent: 70, newPercent: 60, reason: 'Снос', state: 'queued', stalePercent: null })
    expect(resolveStale(d, 80, 'Снос')).toMatchObject({ newPercent: 80, reason: null })
  })
  it('«было» counts own unsent drafts', () => {
    const ds = [draft({ newPercent: 50, createdAt: 1 }), draft({ newPercent: 60, createdAt: 2 }), draft({ userId: 'u2', newPercent: 90, createdAt: 3 })]
    expect(effectiveSeenPercent(ds, 'u1', 's1', 40)).toBe(60)
    expect(effectiveSeenPercent([], 'u1', 's1', 40)).toBe(40)
  })
  it('limit applies only offline and counts own unsent', () => {
    const ds = Array.from({ length: DRAFT_LIMIT }, () => draft())
    expect(overLimit(ds, 'u1', false)).toBe(true)
    expect(overLimit(ds, 'u1', true)).toBe(false)
    expect(overLimit(ds, 'u2', false)).toBe(false)
  })
  it('editing older than 24 h becomes queued', () => {
    const old = draft({ state: 'editing', createdAt: 0 })
    const fresh = draft({ state: 'editing', createdAt: EDITING_TTL_MS })
    expect(expireEditing([old, fresh], EDITING_TTL_MS + 1).map((d) => [d.draftId, d.state])).toEqual([[old.draftId, 'queued']])
  })
  it('retry backoff 15/30/60/120 s, stop after 30 min', () => {
    expect([0, 1, 2, 3, 9].map((s) => nextRetryDelay(s, 0, 0))).toEqual([15_000, 30_000, 60_000, 120_000, 120_000])
    expect(nextRetryDelay(0, 0, 30 * 60 * 1000)).toBeNull()
  })
})
