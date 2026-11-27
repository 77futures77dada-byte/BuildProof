import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { freshnessView, staleness } from './freshness'
import type { FreshnessInput } from './freshness'

const t = ((key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key)) as unknown as TFunction
const now = new Date('2026-11-27T12:00:00')
const base: FreshnessInput = { status: 'active', lastWorkerReportAt: null, lastMarkAt: null, lastMarkRole: null, peopleNames: [], createdAt: '2026-11-01T10:00:00' }

describe('freshnessView', () => {
  it('day 0 with the gate closed says «no marks yet», never «nobody invited»', () => {
    expect(freshnessView(base, t, { gateOpen: false, now })).toEqual({ label: 'reportStatus.noMarks' })
  })
  it('pause replaces freshness and never shows «report arrived»', () => {
    const v = freshnessView({ ...base, status: 'paused', lastWorkerReportAt: '2026-11-27T08:00:00' }, t, { gateOpen: false, now })
    expect(v).toEqual({ icon: 'paused', label: 'projectStatus.paused' })
  })
  it('own marks name the marker; stale shape from 3 days', () => {
    expect(freshnessView({ ...base, lastMarkAt: '2026-11-26T08:00:00', lastMarkRole: 'foreman' }, t, { gateOpen: false, now }).icon).toBeUndefined()
    const old = freshnessView({ ...base, lastMarkAt: '2026-11-20T08:00:00', lastMarkRole: 'gc' }, t, { gateOpen: false, now })
    expect(old.icon).toBe('stale')
    expect(old.label).toMatch(/^reportStatus.markedByOwner/)
  })
  it('worker reports: today, then N days', () => {
    expect(freshnessView({ ...base, lastWorkerReportAt: '2026-11-27T08:00:00' }, t, { gateOpen: false, now }).label).toBe('reportStatus.today')
    expect(freshnessView({ ...base, lastWorkerReportAt: '2026-11-19T08:00:00' }, t, { gateOpen: false, now }).icon).toBe('stale')
  })
  it('people on the project without reports are named', () => {
    expect(freshnessView({ ...base, peopleNames: ['Андрей'] }, t, { gateOpen: false, now }).label).toContain('Андрей')
  })
  it('staleness falls back to creation date', () => {
    expect(staleness(base, now)).toBe(26)
  })
})
