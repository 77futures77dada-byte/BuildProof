// Colour checks used by the palette tests (WCAG contrast, deuteranopia simulation).

type Rgb = [number, number, number]

const toLinear = (channel: number) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '')
  return [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16)) as Rgb
}

const linearRgb = (hex: string) => hexToRgb(hex).map(toLinear) as Rgb
const luminanceOf = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/** WCAG 2.x contrast ratio between two sRGB hex colours. */
export function contrastRatio(a: string, b: string): number {
  const la = luminanceOf(linearRgb(a)), lb = luminanceOf(linearRgb(b))
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// Machado, Oliveira & Fernandes (2009), deuteranopia at severity 1.0, linear RGB.
const DEUTERANOPIA = [
  [0.367322, 0.860646, -0.227968],
  [0.280085, 0.672501, 0.047413],
  [-0.01182, 0.04294, 0.968881],
]

function simulateDeuteranopia(hex: string): Rgb {
  const v = linearRgb(hex)
  return DEUTERANOPIA.map(row => Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2]))) as Rgb
}

function linearToLab([r, g, b]: Rgb): Rgb {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = luminanceOf([r, g, b])
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

/** CIE76 ΔE between two colours as seen with deuteranopia. */
export function deuteranopiaDistance(a: string, b: string): number {
  const la = linearToLab(simulateDeuteranopia(a)), lb = linearToLab(simulateDeuteranopia(b))
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2])
}
