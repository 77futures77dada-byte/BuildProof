import type { HousePart, StagePart } from './types'

/** Scene background; every stage colour is validated against it (palette.test.ts). */
export const HOUSE_BG = '#0b2a4a'

/**
 * Colour = stage. Single source for the 3D lines, the stage list and the legend.
 * Hues follow the brief; foundation, frame, electric and finish were lightened or
 * shifted so that no pair merges under simulated deuteranopia (min ΔE ≥ 15).
 */
export const STAGE_COLORS: Record<StagePart, string> = {
  foundation: '#e3cba8', // sand
  frame: '#ff9f40', // orange
  roof: '#ff6b6b', // coral
  windows: '#5eead4', // turquoise
  electric: '#fff176', // yellow
  plumbing: '#60a5fa', // blue
  finish: '#f0abfc', // orchid
}

/** Stages that do not map onto the model (no geometry) use a neutral tone. */
export const OTHER_STAGE_COLOR = '#94a3b8'
/** Whole-house contour once all seven stages are at 100%. */
export const CONTOUR_COLOR = '#ffffff'

/** State = brightness, never hue. */
export const HOUSE_OPACITY = {
  ghost: 0.12,
  glow: 0.28,
  dimmed: 0.2,
} as const
export const GLOW_WIDTH = 4

export function stageColor(part: HousePart): string {
  return part in STAGE_COLORS ? STAGE_COLORS[part as StagePart] : OTHER_STAGE_COLOR
}
