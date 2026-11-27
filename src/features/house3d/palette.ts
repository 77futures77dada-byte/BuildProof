import type { HousePart, StagePart } from './types'

/**
 * Colours of the 3D object model live in src/styles/tokens.css (`--house-*`),
 * like every other colour of the product; nothing here is a literal colour.
 * DOM (legend, stage rows, cards) uses `var(--house-…)` directly; three.js
 * cannot read CSS variables, so the scene resolves them once with
 * `resolveColor()` when it is built. The model sits on a fixed navy stage in
 * both themes; in the dark navy theme it matches the card surface.
 * Stage hues are pinned and checked (contrast on --house-bg ≥ 3:1, ΔE under
 * deuteranopia ≥ 15) by palette.test.ts and scripts/check-contrast.mjs.
 */
const v = (name: string) => `var(${name})`

/** Scene background. */
export const HOUSE_BG = v('--house-bg')
export const HOUSE_GRID = v('--house-grid')
export const HOUSE_GRID_SUB = v('--house-grid-sub')

/** CSS variable per stage: colour = stage. Single source for the 3D lines, the stage list and the legend. */
export const STAGE_VARS: Record<StagePart, string> = {
  foundation: '--house-foundation',
  frame: '--house-frame',
  roof: '--house-roof',
  windows: '--house-windows',
  electric: '--house-electric',
  plumbing: '--house-plumbing',
  finish: '--house-finish',
}
export const STAGE_COLORS = Object.fromEntries(
  Object.entries(STAGE_VARS).map(([part, name]) => [part, v(name)]),
) as Record<StagePart, string>

/** Stages that do not map onto the model (no geometry) use a neutral tone. */
export const OTHER_STAGE_COLOR = v('--house-other')
/** Whole-house contour once all seven stages are at 100%. */
export const CONTOUR_COLOR = v('--house-contour')

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

/** `var(--x)` → the computed value on <html> (for three.js); other strings pass through. */
export function resolveColor(color: string, el: Element = document.documentElement): string {
  const m = color.match(/^var\((--[\w-]+)\)$/)
  if (!m) return color
  return getComputedStyle(el).getPropertyValue(m[1]).trim()
}
