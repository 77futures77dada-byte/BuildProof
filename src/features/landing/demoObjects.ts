/**
 * Example objects for the landing page ("Пример объекта" and the hero
 * dashboard). Numbers only — names, people and notes are per language in
 * ./copy. Everything here is illustrative and labelled as an example on the
 * page; none of it comes from Supabase.
 *
 * Rules mirror buildproof-decisions.md §5:
 * - a report whose claim is more than REVIEW_THRESHOLD points above the
 *   confirmed value waits for the foreman ("ждёт проверки");
 * - readiness = Σ(weight × confirmed %) / Σ weight, and the second figure is
 *   the same over the claimed values.
 */

/** Default per-object review threshold, in percentage points. */
export const REVIEW_THRESHOLD = 25

/** ok = accepted, part = in progress, bad = no reports for a long time, none = not started. */
export type StageState = 'ok' | 'part' | 'bad' | 'none'

export interface DemoStage {
  id: string
  /** Share of the whole object, in the same units across one object. */
  weight: number
  /** Accepted or foreman-confirmed percent. */
  confirmed: number
  /** Percent claimed in the latest report. */
  claimed: number
  state: StageState
}

export type DemoObjectKey = 'house' | 'flat'

export interface DemoObject {
  key: DemoObjectKey
  stages: DemoStage[]
}

export const isPending = (s: DemoStage) => s.claimed - s.confirmed > REVIEW_THRESHOLD

export function objectTotals(stages: DemoStage[]): { accepted: number; withPending: number } {
  let weight = 0
  let confirmed = 0
  let claimed = 0
  for (const s of stages) {
    weight += s.weight
    confirmed += s.weight * s.confirmed
    claimed += s.weight * s.claimed
  }
  if (weight === 0) return { accepted: 0, withPending: 0 }
  return { accepted: Math.round(confirmed / weight), withPending: Math.round(claimed / weight) }
}

export const DEMO_OBJECTS: Record<DemoObjectKey, DemoObject> = {
  house: {
    key: 'house',
    stages: [
      { id: 'f', weight: 20, confirmed: 100, claimed: 100, state: 'ok' },
      { id: 'k', weight: 20, confirmed: 90, claimed: 90, state: 'part' },
      { id: 'r', weight: 12, confirmed: 60, claimed: 90, state: 'part' },
      { id: 'o', weight: 8, confirmed: 40, claimed: 40, state: 'part' },
      { id: 'e', weight: 10, confirmed: 0, claimed: 0, state: 'none' },
      { id: 'p', weight: 10, confirmed: 25, claimed: 25, state: 'bad' },
      { id: 'd', weight: 20, confirmed: 0, claimed: 0, state: 'none' },
    ],
  },
  flat: {
    key: 'flat',
    stages: [
      { id: 'a', weight: 25, confirmed: 100, claimed: 100, state: 'ok' },
      { id: 'b', weight: 20, confirmed: 70, claimed: 70, state: 'part' },
      { id: 'c', weight: 15, confirmed: 90, claimed: 90, state: 'part' },
      // 50 → 80: a 30-point jump, above the threshold (the prototype had 75,
      // which is exactly 25 and by the rule would not wait for review).
      { id: 'g', weight: 15, confirmed: 50, claimed: 80, state: 'part' },
      { id: 'h', weight: 15, confirmed: 20, claimed: 20, state: 'bad' },
      { id: 'i', weight: 10, confirmed: 0, claimed: 0, state: 'none' },
    ],
  },
}

/** Stage selected when a tab opens: the one waiting for review, so the rule is visible at once. */
export function initialStageIndex(object: DemoObject): number {
  const i = object.stages.findIndex(isPending)
  return i === -1 ? 0 : i
}

/** The object with no reports for days, shown first in the hero list. Not part of the interactive demo. */
export const HERO_STALE_OBJECT = { accepted: 31 }

