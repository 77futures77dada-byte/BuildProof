import { HOUSE_BOUNDS, HOUSE_LINES, type HouseLine, type HousePart as GeometryPart, type Point3 } from './houseGeometry'
import { STAGE_PARTS, type StagePart } from './types'

/** Which stage each piece of geometry belongs to. The door is part of the windows stage. */
export const GEOMETRY_STAGE: Record<GeometryPart, StagePart | null> = {
  foundation: 'foundation', frame: 'frame', roof: 'roof', windows: 'windows', door: 'windows',
  electric: 'electric', plumbing: 'plumbing', finish: 'finish', handover: null,
}

/**
 * vertical: progress = built height, grows bottom-up.
 * count: progress = number of finished elements, they appear one by one.
 */
export type StageKind = 'vertical' | 'count'
export const STAGE_KIND: Record<StagePart, StageKind> = {
  foundation: 'vertical', frame: 'vertical', roof: 'vertical', windows: 'count',
  electric: 'count', plumbing: 'count', finish: 'vertical',
}

/** Selected stage slides out by this many metres along its normal. */
export const EXPLODE_DISTANCE = 1.3
/** Whole-part direction, or 'element' = each element along its own wall normal; null = stays in place. */
export const EXPLODE_DIRECTION: Record<StagePart, Point3 | 'element' | null> = {
  foundation: [0, -1, 0], frame: null, roof: [0, 1, 0], windows: 'element',
  electric: null, plumbing: null, finish: null,
}

export interface CameraView { azimuth: number; elevation: number; zoom: number }
/** Default orbit; the azimuth is kept from the current (auto-rotated) position. */
export const DEFAULT_VIEW = { elevation: 25, zoom: 1 } as const
/** Best angle per stage, in degrees. Azimuth 0 looks at the front (door) facade. */
export const STAGE_VIEWS: Record<StagePart, CameraView> = {
  foundation: { azimuth: 35, elevation: -14, zoom: 1 },
  frame: { azimuth: 35, elevation: 22, zoom: 1 },
  roof: { azimuth: 35, elevation: 52, zoom: 1 },
  windows: { azimuth: 18, elevation: 8, zoom: 1 },
  electric: { azimuth: 22, elevation: 14, zoom: .86 },
  plumbing: { azimuth: 22, elevation: 14, zoom: .86 },
  finish: { azimuth: 22, elevation: 14, zoom: .86 },
}

export interface StageElement { lines: HouseLine[]; normal: Point3; minY: number }
export interface StageGroup { part: StagePart; kind: StageKind; lines: HouseLine[]; elements: StageElement[]; minY: number; maxY: number }

const ys = (lines: HouseLine[]) => lines.flatMap(line => line.points.map(([, y]) => y))
const WALL_X = (HOUSE_BOUNDS.max[0] - .5), WALL_Z = (HOUSE_BOUNDS.max[2] - .5)

/** Outward normal of the exterior wall an element lies on, or zero when it is not on one. */
function wallNormal(lines: HouseLine[]): Point3 {
  const points = lines.flatMap(line => line.points)
  const on = (axis: 0 | 2, wall: number) => points.every(point => Math.abs(Math.abs(point[axis]) - wall) < .01)
  if (on(2, WALL_Z)) return [0, 0, Math.sign(points[0][2])]
  if (on(0, WALL_X)) return [Math.sign(points[0][0]), 0, 0]
  return [0, 0, 0]
}

export function buildStageGroups(lines: readonly HouseLine[] = HOUSE_LINES): Record<StagePart, StageGroup> {
  const groups = {} as Record<StagePart, StageGroup>
  for (const part of STAGE_PARTS) {
    const own = lines.filter(line => GEOMETRY_STAGE[line.part] === part)
    const byElement = new Map<string, HouseLine[]>()
    for (const line of own) {
      const key = `${line.part}:${line.element}`
      byElement.set(key, [...(byElement.get(key) ?? []), line])
    }
    const elements = [...byElement.values()]
      .map(items => ({ lines: items, normal: wallNormal(items), minY: Math.min(...ys(items)) }))
      .sort((a, b) => a.minY - b.minY) // stable: ground floor first, then up
    const all = ys(own)
    groups[part] = { part, kind: STAGE_KIND[part], lines: own, elements, minY: Math.min(...all), maxY: Math.max(...all) }
  }
  return groups
}

/** Finished elements out of `total` at `percent` (rounded down: 50% of 8 windows = 4). */
export function doneCount(total: number, percent: number): number {
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))
  return Math.floor(total * p / 100 + 1e-9)
}

/** Envelope of the model with every stage pulled out at once — the camera fit never clips it. */
export const EXPLODED_BOUNDS = {
  min: [HOUSE_BOUNDS.min[0] - EXPLODE_DISTANCE, HOUSE_BOUNDS.min[1] - EXPLODE_DISTANCE, HOUSE_BOUNDS.min[2] - EXPLODE_DISTANCE] as Point3,
  max: [HOUSE_BOUNDS.max[0] + EXPLODE_DISTANCE, HOUSE_BOUNDS.max[1] + EXPLODE_DISTANCE, HOUSE_BOUNDS.max[2] + EXPLODE_DISTANCE] as Point3,
}
