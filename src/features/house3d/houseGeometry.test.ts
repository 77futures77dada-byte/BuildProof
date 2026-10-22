import { describe, expect, it } from 'vitest'
import { HOUSE, HOUSE_BOUNDS, HOUSE_LINES } from './houseGeometry'

const parts = (part: string) => HOUSE_LINES.filter(line => line.part === part)
const vertices = (part: string) => parts(part).flatMap(line => line.points)

describe('house geometry in meters', () => {
  it('uses the specified body, slab, and gable envelope', () => {
    expect(HOUSE.width).toBe(10); expect(HOUSE.depth).toBe(7); expect(HOUSE.wallHeight).toBe(6)
    expect(HOUSE.foundationWidth).toBe(10.6); expect(HOUSE.foundationDepth).toBe(7.6); expect(HOUSE.foundationHeight).toBe(.4)
    expect(HOUSE_BOUNDS).toEqual({ min: [-5.5,-.4,-4], max: [5.5,8.8,4] })
    expect(vertices('foundation').some(([,y]) => y === 0)).toBe(true)
    expect(vertices('foundation').some(([,y]) => y === -.4)).toBe(true)
  })

  it('keeps every window and door vertex inside the body and on its wall plane', () => {
    const windows = parts('windows')
    expect(windows).toHaveLength(64) // 16 rectangular windows × four edges
    expect(parts('door')).toHaveLength(4)
    for (const point of [...vertices('windows'), ...vertices('door')]) {
      const [x,y,z] = point
      expect(x).toBeGreaterThanOrEqual(-5); expect(x).toBeLessThanOrEqual(5)
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(6)
      expect(z).toBeGreaterThanOrEqual(-3.5); expect(z).toBeLessThanOrEqual(3.5)
    }
    for (const point of vertices('windows')) {
      const [x,,z] = point
      expect(Math.min(Math.abs(Math.abs(z)-3.5), Math.abs(Math.abs(x)-5))).toBeLessThanOrEqual(.01)
    }
    expect(vertices('door').every(([, , z]) => z === 3.5)).toBe(true)
    for (const window of windows.filter((_, index) => index % 4 === 0)) {
      const rect = windows.slice(windows.indexOf(window), windows.indexOf(window) + 4).flatMap(item => item.points)
      const xs = rect.map(([x]) => x), ys = rect.map(([,y]) => y), zs = rect.map(([, ,z]) => z)
      expect(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs))).toBeCloseTo(1.2)
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(1.4)
      expect([.9,3.9]).toContain(Math.min(...ys))
    }
    const door = vertices('door')
    expect(Math.max(...door.map(([x]) => x)) - Math.min(...door.map(([x]) => x))).toBe(1)
    expect(Math.max(...door.map(([,y]) => y))).toBe(2.1)
  })

  it('keeps roof/electrical vertices within the envelope and roof supports at wall-top height', () => {
    for (const part of ['roof','electric']) for (const [x,y,z] of vertices(part)) {
      expect(x).toBeGreaterThanOrEqual(HOUSE_BOUNDS.min[0]); expect(x).toBeLessThanOrEqual(HOUSE_BOUNDS.max[0])
      expect(y).toBeGreaterThanOrEqual(HOUSE_BOUNDS.min[1]); expect(y).toBeLessThanOrEqual(HOUSE_BOUNDS.max[1])
      expect(z).toBeGreaterThanOrEqual(HOUSE_BOUNDS.min[2]); expect(z).toBeLessThanOrEqual(HOUSE_BOUNDS.max[2])
    }
    const roof = vertices('roof')
    expect(roof.some(([x,y,z]) => x === -5 && y === 6 && z === -3.5)).toBe(true)
    expect(roof.some(([x,y,z]) => x === -5 && y === 6 && z === 3.5)).toBe(true)
    expect(vertices('electric').every(([x,y,z]) => Math.abs(x) <= 5 && y >= 0 && y <= 6 && Math.abs(z) <= 3.5)).toBe(true)
  })

  it('keeps every generated segment in the declared envelope and avoids detached contour posts', () => {
    for (const line of HOUSE_LINES) for (const [x,y,z] of line.points) {
      expect(x).toBeGreaterThanOrEqual(HOUSE_BOUNDS.min[0]); expect(x).toBeLessThanOrEqual(HOUSE_BOUNDS.max[0])
      expect(y).toBeGreaterThanOrEqual(HOUSE_BOUNDS.min[1]); expect(y).toBeLessThanOrEqual(HOUSE_BOUNDS.max[1])
      expect(z).toBeGreaterThanOrEqual(HOUSE_BOUNDS.min[2]); expect(z).toBeLessThanOrEqual(HOUSE_BOUNDS.max[2])
    }
    const contourPosts = parts('handover').filter(line => line.points.every(([, ,z]) => Math.abs(z) === 3.5) && line.points.every(([,y]) => y === 0 || y === 6))
    expect(contourPosts.every(line => line.points.every(([x]) => Math.abs(x) === 5))).toBe(true)
  })
})
