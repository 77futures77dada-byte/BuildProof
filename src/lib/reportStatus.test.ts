import { describe, expect, it } from 'vitest'
import { getReportStatus } from './reportStatus'

const now = new Date(2026, 10, 10, 9, 0)
const daysAgo = (n: number, hour = 18) => new Date(2026, 10, 10 - n, hour, 0).toISOString()

describe('getReportStatus', () => {
  it('has no reports', () => {
    expect(getReportStatus(null, { now })).toEqual({ kind: 'none', days: null, tone: 'neutral' })
    expect(getReportStatus('not a date', { now }).kind).toBe('none')
  })

  it('counts calendar days, not 24 h windows', () => {
    expect(getReportStatus(daysAgo(0, 7), { now }).kind).toBe('today')
    // 15 hours ago but on the previous date → yesterday
    expect(getReportStatus(daysAgo(1, 18), { now })).toMatchObject({ kind: 'yesterday', days: 1, tone: 'neutral' })
  })

  it('warns from 2 days and alerts from 5', () => {
    expect(getReportStatus(daysAgo(2), { now })).toMatchObject({ kind: 'late', days: 2, tone: 'warn' })
    expect(getReportStatus(daysAgo(4), { now })).toMatchObject({ kind: 'late', days: 4 })
    expect(getReportStatus(daysAgo(5), { now })).toMatchObject({ kind: 'overdue', days: 5, tone: 'alert' })
    expect(getReportStatus(daysAgo(40), { now })).toMatchObject({ kind: 'overdue', days: 40 })
  })

  it('stays neutral for a paused or finished project', () => {
    expect(getReportStatus(daysAgo(3), { now, active: false }).tone).toBe('neutral')
    expect(getReportStatus(daysAgo(9), { now, active: false }).tone).toBe('neutral')
  })

  it('treats a future timestamp (clock skew) as today', () => {
    expect(getReportStatus(new Date(2026, 10, 11).toISOString(), { now }).kind).toBe('today')
  })
})
