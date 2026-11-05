import { describe, expect, it } from 'vitest'
import { DEMO_OBJECTS, REVIEW_THRESHOLD, initialStageIndex, isPending, objectTotals } from './demoObjects'

describe('demo objects', () => {
  it('computes accepted and with-pending readiness from weights', () => {
    // Same figures as the hero card and the "how it works" step: 51% / 55%.
    expect(objectTotals(DEMO_OBJECTS.house.stages)).toEqual({ accepted: 51, withPending: 55 })
    expect(objectTotals(DEMO_OBJECTS.flat.stages)).toEqual({ accepted: 63, withPending: 68 })
    expect(objectTotals([])).toEqual({ accepted: 0, withPending: 0 })
  })

  it('marks only jumps above the threshold as pending', () => {
    const base = { id: 'x', weight: 1, state: 'part' as const }
    expect(isPending({ ...base, confirmed: 50, claimed: 50 + REVIEW_THRESHOLD })).toBe(false)
    expect(isPending({ ...base, confirmed: 50, claimed: 51 + REVIEW_THRESHOLD })).toBe(true)
  })

  it('opens each tab on its pending stage', () => {
    expect(DEMO_OBJECTS.house.stages[initialStageIndex(DEMO_OBJECTS.house)].id).toBe('r')
    expect(DEMO_OBJECTS.flat.stages[initialStageIndex(DEMO_OBJECTS.flat)].id).toBe('g')
  })

  it('weights add up to 100 per object', () => {
    for (const o of Object.values(DEMO_OBJECTS)) expect(o.stages.reduce((n, s) => n + s.weight, 0)).toBe(100)
  })
})
