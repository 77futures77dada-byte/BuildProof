import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTOUR_COLOR, HOUSE_BG, OTHER_STAGE_COLOR, STAGE_COLORS, STAGE_VARS, resolveColor, stageColor } from './palette'
import { contrastRatio, deuteranopiaDistance } from './colorMath'
import { STAGE_PARTS } from './types'

// The model colours are tokens (src/styles/tokens.css, light :root block, same in both themes).
const tokens = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8')
const token = (name: string) => {
  const m = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`))
  if (!m) throw new Error(`token ${name} not found`)
  return m[1].toLowerCase()
}
const bg = token('--house-bg')
const colors = STAGE_PARTS.map(part => token(STAGE_VARS[part]))

describe('stage palette', () => {
  it('has exactly seven unique colours, one per stage, distinct from the neutral tones', () => {
    expect(Object.keys(STAGE_COLORS).sort()).toEqual([...STAGE_PARTS].sort())
    expect(new Set(colors).size).toBe(7)
    expect(colors).not.toContain(token('--house-other'))
    expect(colors).not.toContain(token('--house-contour'))
  })

  it('is pinned (changing a colour is a deliberate, reviewed change)', () => {
    expect(Object.fromEntries(STAGE_PARTS.map((part, i) => [part, colors[i]]))).toEqual({
      foundation: '#e3cba8', frame: '#ff9f40', roof: '#ff6b6b', windows: '#5eead4',
      electric: '#fff176', plumbing: '#60a5fa', finish: '#f0abfc',
    })
    expect(bg).toBe('#0b2a4a')
  })

  it('gives every stage colour at least 3:1 WCAG contrast on the model background', () => {
    for (const color of colors) expect(contrastRatio(color, bg)).toBeGreaterThanOrEqual(3)
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

  it('uses CSS variables, never literal colours', () => {
    for (const c of [HOUSE_BG, CONTOUR_COLOR, OTHER_STAGE_COLOR, ...Object.values(STAGE_COLORS)]) expect(c).toMatch(/^var\(--house-[\w-]+\)$/)
  })

  it('falls back to the neutral colour for stages without geometry', () => {
    expect(stageColor('other')).toBe(OTHER_STAGE_COLOR)
    expect(stageColor('roof')).toBe(STAGE_COLORS.roof)
  })

  it('passes non-variable colours through resolveColor unchanged', () => {
    expect(resolveColor('rgb(1, 2, 3)', {} as Element)).toBe('rgb(1, 2, 3)')
  })
})
