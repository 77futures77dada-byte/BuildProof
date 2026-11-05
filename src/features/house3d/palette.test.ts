import { describe, expect, it } from 'vitest'
import { CONTOUR_COLOR, HOUSE_BG, OTHER_STAGE_COLOR, STAGE_COLORS, stageColor } from './palette'
import { contrastRatio, deuteranopiaDistance } from './colorMath'
import { STAGE_PARTS } from './types'

const colors = STAGE_PARTS.map(part => STAGE_COLORS[part])

describe('stage palette', () => {
  it('has exactly seven unique colours, one per stage, distinct from the neutral tones', () => {
    expect(Object.keys(STAGE_COLORS).sort()).toEqual([...STAGE_PARTS].sort())
    expect(new Set(colors.map(color => color.toLowerCase())).size).toBe(7)
    expect(colors).not.toContain(OTHER_STAGE_COLOR)
    expect(colors).not.toContain(CONTOUR_COLOR)
  })

  it('is pinned (changing a colour is a deliberate, reviewed change)', () => {
    expect(STAGE_COLORS).toEqual({
      foundation: '#e3cba8', frame: '#ff9f40', roof: '#ff6b6b', windows: '#5eead4',
      electric: '#fff176', plumbing: '#60a5fa', finish: '#f0abfc',
    })
  })

  it('gives every stage colour at least 3:1 WCAG contrast on the model background', () => {
    for (const color of colors) expect(contrastRatio(color, HOUSE_BG)).toBeGreaterThanOrEqual(3)
  })

  it('keeps every pair apart under simulated deuteranopia (ΔE ≥ 15)', () => {
    for (let a = 0; a < colors.length; a += 1) for (let b = a + 1; b < colors.length; b += 1) {
      expect(deuteranopiaDistance(colors[a], colors[b]), `${STAGE_PARTS[a]} vs ${STAGE_PARTS[b]}`).toBeGreaterThanOrEqual(15)
    }
  })

  it('computes WCAG contrast correctly on known values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })

  it('falls back to the neutral colour for stages without geometry', () => {
    expect(stageColor('other')).toBe(OTHER_STAGE_COLOR)
    expect(stageColor('roof')).toBe(STAGE_COLORS.roof)
  })
})
