import { describe, expect, it } from 'vitest'
import { HOUSE_LINES } from './houseGeometry'
import { EXPLODED_BOUNDS, EXPLODE_DIRECTION, EXPLODE_DISTANCE, GEOMETRY_STAGE, STAGE_KIND, STAGE_VIEWS, buildStageGroups, doneCount } from './stageElements'
import { STAGE_PARTS } from './types'

const groups = buildStageGroups()

describe('geometry → stage mapping', () => {
  it('assigns every geometry part to one of the seven stages, door to windows, contour to none', () => {
    expect(GEOMETRY_STAGE.door).toBe('windows')
    expect(GEOMETRY_STAGE.handover).toBeNull()
    for (const line of HOUSE_LINES) if (line.part !== 'handover') expect(STAGE_PARTS).toContain(GEOMETRY_STAGE[line.part])
  })

  it('gives every stage geometry, a kind and a camera view', () => {
    for (const part of STAGE_PARTS) {
      expect(groups[part].lines.length).toBeGreaterThan(0)
      expect(['vertical', 'count']).toContain(STAGE_KIND[part])
      expect(STAGE_VIEWS[part]).toBeDefined()
    }
    const owned = STAGE_PARTS.reduce((sum, part) => sum + groups[part].lines.length, 0)
    expect(owned).toBe(HOUSE_LINES.filter(line => line.part !== 'handover').length)
  })
})

describe('countable elements', () => {
  it('counts 16 windows + 1 door, 16 cable runs and 10 pipe sections', () => {
    expect(groups.windows.elements).toHaveLength(17)
    expect(groups.windows.elements.filter(element => element.lines.length === 4)).toHaveLength(17)
    expect(groups.electric.elements).toHaveLength(16)
    expect(groups.plumbing.elements).toHaveLength(10)
  })

  it('rounds finished elements down: 4 of 8 windows at 50%', () => {
    expect(doneCount(8, 50)).toBe(4)
    expect(doneCount(8, 49)).toBe(3)
    expect(doneCount(8, 100)).toBe(8)
    expect(doneCount(8, 0)).toBe(0)
    expect(doneCount(8, 130)).toBe(8)
    expect(doneCount(8, Number.NaN)).toBe(0)
    expect(doneCount(groups.windows.elements.length, 50)).toBe(8)
  })

  it('orders elements bottom-up so they appear floor by floor', () => {
    for (const part of ['windows', 'electric', 'plumbing'] as const) {
      const ys = groups[part].elements.map(element => element.minY)
      expect(ys).toEqual([...ys].sort((a, b) => a - b))
    }
  })
})

describe('explode', () => {
  it('pushes every window and the door straight out of its wall plane', () => {
    for (const element of groups.windows.elements) {
      const [nx, ny, nz] = element.normal
      expect(Math.abs(nx) + Math.abs(nz)).toBe(1); expect(ny).toBe(0)
      for (const [x, , z] of element.lines.flatMap(line => line.points)) expect(x * nx + z * nz).toBeGreaterThan(0)
    }
    expect(EXPLODE_DIRECTION.windows).toBe('element')
    expect(EXPLODE_DIRECTION.roof).toEqual([0, 1, 0])
    expect(EXPLODE_DIRECTION.foundation).toEqual([0, -1, 0])
    for (const part of ['electric', 'plumbing', 'finish'] as const) expect(EXPLODE_DIRECTION[part]).toBeNull()
    expect(EXPLODE_DISTANCE).toBeGreaterThanOrEqual(1.2); expect(EXPLODE_DISTANCE).toBeLessThanOrEqual(1.5)
  })

  it('keeps every exploded vertex inside the camera-fit envelope', () => {
    for (const part of STAGE_PARTS) {
      const direction = EXPLODE_DIRECTION[part]
      for (const element of groups[part].elements) {
        const normal = direction === 'element' ? element.normal : direction ?? [0, 0, 0]
        for (const point of element.lines.flatMap(line => line.points)) {
          for (const axis of [0, 1, 2]) {
            const moved = point[axis] + normal[axis] * EXPLODE_DISTANCE
            expect(moved).toBeGreaterThanOrEqual(EXPLODED_BOUNDS.min[axis])
            expect(moved).toBeLessThanOrEqual(EXPLODED_BOUNDS.max[axis])
          }
        }
      }
    }
  })
})
