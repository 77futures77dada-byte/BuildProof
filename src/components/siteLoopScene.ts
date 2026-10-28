/**
 * Imperative scene for the landing hero animation (see SiteLoop.tsx).
 *
 * The static backdrop lives in JSX; this module builds the moving parts
 * (crew, window panes, report card…) into the `data-layer` groups of that
 * SVG and exposes a pure `render(t)` for a 15-second seamless loop. It owns
 * no clock — playback, pausing and reduced motion are the component's job.
 *
 * Names, times and percentages shown on the card are example data and are
 * labelled as such inside the scene.
 */

export const LOOP_SECONDS = 15
/** Frame shown when motion is reduced: report card at 100%, readiness chip in. */
export const STILL_FRAME = 12.4

const NS = 'http://www.w3.org/2000/svg'
const TAU = Math.PI * 2

type Attrs = Record<string, string | number>
type Pt = readonly [number, number]

const mk = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element) => {
  const e = document.createElementNS(NS, tag)
  for (const k in attrs) e.setAttribute(k, String(attrs[k]))
  parent?.appendChild(e)
  return e
}
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ease = (t: number) => t * t * (3 - 2 * t)
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const inR = (t: number, a: number, b: number) => t >= a && t < b
export const wrap = (t: number) => ((t % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS
const path = (t: number, pts: readonly Pt[]) => {
  if (t <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, v0] = pts[i - 1]
      const [t1, v1] = pts[i]
      return t1 === t0 ? v1 : lerp(v0, v1, (t - t0) / (t1 - t0))
    }
  }
  return pts[pts.length - 1][1]
}
const vel = (fx: (t: number) => number, t: number) => (fx(wrap(t + 0.03)) - fx(wrap(t - 0.03))) / 0.06
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => clamp(Math.round(c * (1 + k)), 0, 255)
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, '0')).join('')
}
const setLine = (l: SVGLineElement, x1: number, y1: number, x2: number, y2: number) => {
  l.setAttribute('x1', x1.toFixed(1))
  l.setAttribute('y1', y1.toFixed(1))
  l.setAttribute('x2', x2.toFixed(1))
  l.setAttribute('y2', y2.toFixed(1))
}

type Mood = 'flat' | 'smile' | 'worry'
interface Arms {
  f: number
  b: number
}
interface Pose {
  x: number
  v: number
  dir: number
  arms: Arms | null
  lean: number
  mood: Mood
  load?: boolean
  phone?: boolean
}
interface FigureOptions {
  y: number
  sc: number
  hat: string
  vest: string
  skin: string
  pants: string
  hammer?: boolean
  plan?: boolean
  barrow?: boolean
  phone?: boolean
}
interface Figure {
  y: number
  sc: number
  phase: number
  lastX: number
  aF: number
  aB: number
  lean: number
  g: SVGGElement
  body: SVGGElement
  upper: SVGGElement
  legF: SVGLineElement
  legB: SVGLineElement
  bootF: SVGEllipseElement
  bootB: SVGEllipseElement
  armF: SVGLineElement
  armB: SVGLineElement
  handF: SVGCircleElement
  handB: SVGCircleElement
  brow: SVGPathElement
  mS: SVGPathElement
  mO: SVGEllipseElement
  mF: SVGPathElement
  plan?: SVGGElement
  phone?: SVGGElement
  hammer?: SVGGElement
  load?: SVGGElement
}

export interface SiteLoopScene {
  /** Draws loop time `t` (seconds). `k` smooths limb motion: 1 snaps, <1 eases from the last frame. */
  render(t: number, k?: number): void
  /** Call with the rendered SVG width so the report card stays readable on narrow screens. */
  setWidth(px: number): void
  /** Removes everything the scene added, leaving the JSX backdrop as it was. */
  destroy(): void
}

const BUILT_LAYERS = ['crane', 'win2', 'openings', 'panesBack', 'actors', 'panes', 'fx', 'ui']

export function createSiteLoopScene(svg: SVGSVGElement): SiteLoopScene {
  const layer = (name: string) => {
    const el = svg.querySelector<SVGGElement>(`[data-layer="${name}"]`)
    if (!el) throw new Error(`SiteLoop: missing layer "${name}"`)
    return el
  }

  /* ---------- static extras ---------- */
  const craneG = layer('crane')
  mk('line', { x1: 414, y1: 140, x2: 414, y2: 610 }, craneG)
  mk('line', { x1: 428, y1: 140, x2: 428, y2: 610 }, craneG)
  let zig = 'M414 610'
  for (let y = 610, s = 0; y > 150; y -= 22, s ^= 1) zig += ` L${s ? 414 : 428} ${y - 22}`
  mk('path', { d: zig }, craneG)
  mk('line', { x1: 220, y1: 150, x2: 640, y2: 150 }, craneG)
  mk('line', { x1: 250, y1: 164, x2: 620, y2: 164 }, craneG)
  let jz = 'M250 164'
  for (let x = 250, s = 0; x < 620; x += 26, s ^= 1) jz += ` L${x + 13} ${s ? 164 : 150}`
  mk('path', { d: jz }, craneG)
  mk('rect', { x: 216, y: 150, width: 28, height: 28, fill: '#123e69' }, craneG)
  mk('rect', { x: 432, y: 120, width: 24, height: 24, fill: '#123e69' }, craneG)

  const win2 = layer('win2')
  for (const x of [645, 780, 915]) {
    mk('rect', { x, y: 375, width: 70, height: 60, fill: '#5eead4', 'fill-opacity': 0.3, stroke: '#cfe9ff', 'stroke-width': 3 }, win2)
    mk('line', { x1: x + 35, y1: 375, x2: x + 35, y2: 435, stroke: '#cfe9ff', 'stroke-width': 2 }, win2)
    mk('line', { x1: x, y1: 405, x2: x + 70, y2: 405, stroke: '#cfe9ff', 'stroke-width': 2 }, win2)
  }
  const OPEN = { A: 680, B: 775, C: 950 }
  const OPEN_Y = 530
  const opn = layer('openings')
  for (const cx of Object.values(OPEN)) {
    mk('rect', { x: cx - 35, y: 500, width: 70, height: 60, fill: '#071d34', stroke: '#7dd3fc', 'stroke-opacity': 0.7, 'stroke-dasharray': '5 4', 'stroke-width': 2 }, opn)
  }

  /* ---------- figures ---------- */
  const actorsG = layer('actors')
  const panesG = layer('panes')
  const panesBack = layer('panesBack')
  const fxG = layer('fx')
  const uiG = layer('ui')

  function makeFigure(o: FigureOptions): Figure {
    const g = mk('g', {}, actorsG)
    mk('ellipse', { cx: 0, cy: 2, rx: 17, ry: 4.5, fill: '#02101f', opacity: 0.38 }, g)
    const body = mk('g', {}, g)
    const legB = mk('line', { stroke: shade(o.pants, -0.3), 'stroke-width': 7.5, 'stroke-linecap': 'round' }, body)
    const bootB = mk('ellipse', { rx: 6, ry: 3.4, fill: '#2b2118' }, body)
    const legF = mk('line', { stroke: o.pants, 'stroke-width': 7.5, 'stroke-linecap': 'round' }, body)
    const bootF = mk('ellipse', { rx: 6, ry: 3.4, fill: '#3a2b1f' }, body)
    let load: SVGGElement | undefined
    if (o.barrow) {
      const b = mk('g', {}, body)
      mk('line', { x1: 16, y1: -50, x2: 34, y2: -24, stroke: '#9fb4c9', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, b)
      mk('polygon', { points: '24,-34 66,-34 58,-14 32,-14', fill: '#e0a526', stroke: '#7a5a10', 'stroke-width': 1.5 }, b)
      load = mk('g', {}, b)
      for (const [x, y] of [[28, -42], [40, -42], [52, -42], [34, -50], [46, -50]]) {
        mk('rect', { x, y: y + 8, width: 11, height: 7, rx: 1, fill: '#c2563b', stroke: '#7d3320' }, load)
      }
      mk('circle', { cx: 66, cy: -9, r: 9, fill: '#1b2a3d', stroke: '#9fb4c9', 'stroke-width': 3 }, b)
      mk('line', { x1: 36, y1: -14, x2: 32, y2: 0, stroke: '#9fb4c9', 'stroke-width': 3 }, b)
    }
    const up = mk('g', {}, body)
    const armB = mk('line', { stroke: '#2f5a8c', 'stroke-width': 7, 'stroke-linecap': 'round' }, up)
    const handB = mk('circle', { r: 3.8, fill: o.skin }, up)
    let plan: SVGGElement | undefined
    if (o.plan) {
      plan = mk('g', {}, up)
      mk('rect', { x: -4, y: -13, width: 15, height: 22, fill: '#f4f7fb', stroke: '#7dd3fc', 'stroke-width': 1 }, plan)
      mk('path', { d: 'M-1 -8h9M-1 -3h9M-1 2h6', stroke: '#2f6aa8', 'stroke-width': 1 }, plan)
    }
    mk('rect', { x: -10.5, y: -70, width: 21, height: 35, rx: 7, fill: o.vest }, up)
    mk('rect', { x: -10.5, y: -58, width: 21, height: 3.6, fill: '#fff', opacity: 0.88 }, up)
    mk('rect', { x: -10.5, y: -48, width: 21, height: 3.6, fill: '#fff', opacity: 0.88 }, up)
    mk('rect', { x: -2, y: -70, width: 4, height: 35, fill: shade(o.vest, -0.18), opacity: 0.6 }, up)
    const armF = mk('line', { stroke: '#3b6fa8', 'stroke-width': 7, 'stroke-linecap': 'round' }, up)
    const handF = mk('circle', { r: 3.8, fill: o.skin }, up)
    let phone: SVGGElement | undefined
    if (o.phone) {
      phone = mk('g', { opacity: 0 }, up)
      mk('rect', { x: -4.5, y: -8, width: 9, height: 15, rx: 2, fill: '#0f1722', stroke: '#cfe9ff', 'stroke-width': 1.2 }, phone)
      mk('circle', { cx: 0, cy: -4.5, r: 1.6, fill: '#7dd3fc' }, phone)
    }
    let hammer: SVGGElement | undefined
    if (o.hammer) {
      hammer = mk('g', {}, up)
      mk('line', { x1: 0, y1: 0, x2: 0, y2: 14, stroke: '#a67c52', 'stroke-width': 3, 'stroke-linecap': 'round' }, hammer)
      mk('rect', { x: -6, y: 12, width: 12, height: 6, rx: 1.5, fill: '#9fb4c9' }, hammer)
    }
    mk('circle', { cx: 0, cy: -80, r: 9.2, fill: o.skin }, up)
    mk('circle', { cx: 3.6, cy: -81.5, r: 1.35, fill: '#1b2433' }, up)
    mk('circle', { cx: 7.4, cy: -81.5, r: 1.35, fill: '#1b2433' }, up)
    const brow = mk('path', { d: 'M2 -85 L5 -84 M6 -84.2 L9 -85.4', stroke: '#2b1a10', 'stroke-width': 1.2, fill: 'none', 'stroke-linecap': 'round' }, up)
    const mS = mk('path', { d: 'M4 -76.5 q3 3 6 0', stroke: '#6b2b1f', 'stroke-width': 1.4, fill: 'none', 'stroke-linecap': 'round' }, up)
    const mO = mk('ellipse', { cx: 7, cy: -75.5, rx: 1.8, ry: 2.3, fill: '#5a1f16', opacity: 0 }, up)
    const mF = mk('path', { d: 'M4.5 -75.8 h5', stroke: '#6b2b1f', 'stroke-width': 1.4, fill: 'none', 'stroke-linecap': 'round', opacity: 0 }, up)
    mk('path', { d: 'M-11 -83 A11 11 0 0 1 11 -83 Z', fill: o.hat, stroke: shade(o.hat, -0.25), 'stroke-width': 1 }, up)
    mk('rect', { x: -11.5, y: -84.5, width: 25, height: 3.6, rx: 1.8, fill: shade(o.hat, -0.1) }, up)
    mk('path', { d: 'M-1.5 -93.5 v9 M2.5 -93.5 v9', stroke: shade(o.hat, -0.2), 'stroke-width': 1.2, fill: 'none' }, up)
    return {
      y: o.y, sc: o.sc, phase: Math.random() * 6, lastX: 0, aF: 0.3, aB: 0.3, lean: 0,
      g, body, upper: up, legF, legB, bootF, bootB, armF, armB, handF, handB, brow, mS, mO, mF,
      plan, phone, hammer, load,
    }
  }

  function updateFig(f: Figure, st: Pose, k: number) {
    const { sc } = f
    f.g.setAttribute('transform', `translate(${st.x.toFixed(1)} ${f.y}) scale(${(st.dir * sc).toFixed(3)} ${sc})`)
    const dx = Math.abs(st.x - f.lastX)
    f.lastX = st.x
    if (dx < 40) f.phase += dx / 8
    const sp = clamp(Math.abs(st.v) / 170)
    const a = Math.sin(f.phase) * 0.74 * sp
    f.body.setAttribute('transform', `translate(0 ${(-Math.abs(Math.sin(f.phase)) * 2.7 * sp).toFixed(2)})`)
    const L = 37
    const fx = Math.sin(a) * L + 2.5, fy = -37 + Math.cos(a) * L
    const bx = Math.sin(-a) * L - 2.5, by = -37 + Math.cos(a) * L
    setLine(f.legF, 1, -37, fx, fy)
    setLine(f.legB, -1, -37, bx, by)
    f.bootF.setAttribute('cx', (fx + 2).toFixed(1))
    f.bootF.setAttribute('cy', (fy + 1).toFixed(1))
    f.bootB.setAttribute('cx', (bx + 2).toFixed(1))
    f.bootB.setAttribute('cy', (by + 1).toFixed(1))
    const tF = st.arms ? st.arms.f : a * 1.4 + 0.12
    const tB = st.arms ? st.arms.b : -a * 1.4 + 0.12
    f.aF += (tF - f.aF) * k
    f.aB += (tB - f.aB) * k
    f.lean += (st.lean - f.lean) * k
    f.upper.setAttribute('transform', `rotate(${(f.lean * 57.3).toFixed(1)} 0 -37)`)
    const hf = [Math.sin(f.aF) * 26, -66 + Math.cos(f.aF) * 26]
    const hb = [Math.sin(f.aB) * 26, -66 + Math.cos(f.aB) * 26]
    setLine(f.armF, 0, -66, hf[0], hf[1])
    setLine(f.armB, 0, -66, hb[0], hb[1])
    f.handF.setAttribute('cx', hf[0].toFixed(1))
    f.handF.setAttribute('cy', hf[1].toFixed(1))
    f.handB.setAttribute('cx', hb[0].toFixed(1))
    f.handB.setAttribute('cy', hb[1].toFixed(1))
    f.plan?.setAttribute('transform', `translate(${hb[0].toFixed(1)} ${hb[1].toFixed(1)})`)
    if (f.phone) {
      f.phone.setAttribute('transform', `translate(${hf[0].toFixed(1)} ${(hf[1] - 5).toFixed(1)})`)
      f.phone.setAttribute('opacity', st.phone ? '1' : '0')
    }
    f.hammer?.setAttribute('transform', `translate(${hf[0].toFixed(1)} ${hf[1].toFixed(1)}) rotate(${(-f.aF * 57.3 + 180).toFixed(1)})`)
    f.load?.setAttribute('opacity', st.load ? '1' : '0')
    const m = st.mood
    f.mS.setAttribute('opacity', m === 'smile' ? '1' : '0')
    f.mO.setAttribute('opacity', m === 'worry' ? '1' : '0')
    f.mF.setAttribute('opacity', m === 'flat' ? '1' : '0')
    f.brow.setAttribute('opacity', m === 'worry' ? '1' : '0')
  }

  /* ---------- the crew (drawn back to front) ---------- */
  const F = {
    w7: makeFigure({ y: 340, sc: 0.6, hat: '#ffd23f', vest: '#ff8a3d', skin: '#d9a47c', pants: '#4f7fb5', hammer: true }),
    w3: makeFigure({ y: 607, sc: 0.96, hat: '#ffd23f', vest: '#ff8a3d', skin: '#a96f4f', pants: '#6b7f99' }),
    w1: makeFigure({ y: 620, sc: 1, hat: '#ffd23f', vest: '#ff8a3d', skin: '#f1c9a5', pants: '#4f7fb5' }),
    w2: makeFigure({ y: 628, sc: 1, hat: '#f4f7fb', vest: '#ffb02e', skin: '#d9a47c', pants: '#4f7fb5' }),
    w4: makeFigure({ y: 636, sc: 1.03, hat: '#f4f7fb', vest: '#d6f23a', skin: '#f6d4b8', pants: '#3f5f86', plan: true }),
    w5: makeFigure({ y: 654, sc: 1.08, hat: '#ffd23f', vest: '#ff8a3d', skin: '#a96f4f', pants: '#4f7fb5', barrow: true }),
    w6: makeFigure({ y: 658, sc: 1.1, hat: '#f4f7fb', vest: '#ff8a3d', skin: '#f1c9a5', pants: '#4f7fb5', phone: true }),
  }
  type Who = keyof typeof F

  const FX1 = (t: number) => path(t, [[0, 285], [0.6, 285], [2.5, 640], [3.4, 640], [5, 285], [5.5, 285], [8, 905], [12, 905], [15, 285]])
  const FX2 = (t: number) => path(t, [[0, 335], [3.3, 335], [5.2, 730], [6.1, 730], [8.2, 335], [15, 335]])
  const FX3 = (t: number) => path(t, [[0, 725], [3.4, 725], [4.6, 820], [6.1, 820], [7.4, 995], [12, 995], [15, 725]])
  const FX4 = (t: number) => 440 + 55 * Math.sin((TAU * t) / 3)
  const FX5 = (t: number) => 510 - 110 * Math.cos((TAU * t) / 3)
  const FX6 = (t: number) => path(t, [[0, 1360], [6.8, 1360], [8.8, 1120], [12, 1120], [14.2, 1360], [15, 1360]])
  const reach: Arms = { f: 0.95, b: 0.95 }
  const carry: Arms = { f: 1.1, b: 1.1 }
  const place: Arms = { f: 2.55, b: 2.5 }

  const poses: Record<Who, (t: number) => Pose> = {
    w1(t) {
      const x = FX1(t), v = vel(FX1, t)
      const dir = Math.abs(v) > 12 ? Math.sign(v) : t < 1 || inR(t, 5, 5.6) ? -1 : 1
      let arms: Arms | null = null, lean = 0, mood: Mood = 'flat'
      if (t < 0.6 || inR(t, 5, 5.5)) { arms = reach; lean = 0.32 }
      else if (inR(t, 0.6, 2.6) || inR(t, 5.5, 8.1)) { arms = carry; lean = 0.14; mood = 'worry' }
      else if (inR(t, 2.6, 3.4) || inR(t, 8.1, 8.9)) { arms = place; mood = 'worry' }
      else if (inR(t, 9.2, 10.3)) { arms = { f: 3, b: 2.7 }; mood = 'smile' }
      return { x, v, dir, arms, lean, mood }
    },
    w2(t) {
      const x = FX2(t), v = vel(FX2, t)
      const dir = Math.abs(v) > 12 ? Math.sign(v) : t < 3.4 || t > 8.1 ? -1 : 1
      let arms: Arms | null = null, lean = 0, mood: Mood = 'flat'
      const w = 0.7 + 0.5 * Math.sin(TAU * 1.2 * t)
      if (t < 2.8 || t >= 8.2) { arms = { f: w, b: 1.2 - w * 0.6 }; lean = 0.24 }
      else if (t < 3.3) { arms = reach; lean = 0.32 }
      else if (t < 5.3) { arms = carry; lean = 0.14; mood = 'worry' }
      else if (t < 6.1) { arms = place; mood = 'worry' }
      return { x, v, dir, arms, lean, mood }
    },
    w3(t) {
      const x = FX3(t), v = vel(FX3, t)
      const dir = Math.abs(v) > 12 ? Math.sign(v) : -1
      let arms: Arms | null = null, mood: Mood = 'flat'
      if (t < 2) arms = { f: 2.05, b: 0.4 }
      else if (inR(t, 2, 2.6) || inR(t, 4.6, 5.3) || inR(t, 7.4, 8.1)) arms = { f: 1.25, b: 1.25 }
      else if (inR(t, 2.6, 3.4) || inR(t, 5.3, 6.1) || inR(t, 8.1, 8.9)) { arms = place; mood = 'worry' }
      else if (inR(t, 8.9, 12)) { arms = { f: 1.3, b: 0.5 }; mood = 'smile' }
      return { x, v, dir, arms, lean: 0, mood }
    },
    w4(t) {
      const x = FX4(t), v = vel(FX4, t), m = t % 3
      let f = 0.5
      if (m >= 0.9 && m < 1.5) f = 2.15
      else if (m >= 2.25 && m < 2.85) f = 1.55
      return { x, v, dir: v >= 0 ? 1 : -1, arms: { f, b: 0.95 }, lean: 0.1, mood: 'worry' }
    },
    w5(t) {
      const x = FX5(t), v = vel(FX5, t)
      return { x, v, dir: v >= 0 ? 1 : -1, arms: { f: 0.75, b: 0.75 }, lean: 0.22, mood: 'flat', load: v >= 0 }
    },
    w6(t) {
      const x = FX6(t), v = vel(FX6, t)
      const dir = Math.abs(v) > 12 ? Math.sign(v) : -1
      let arms: Arms | null = null, phone = false, mood: Mood = 'flat'
      if (inR(t, 9, 10.5)) { arms = { f: 1.5, b: 1.45 }; phone = true }
      else if (inR(t, 10.5, 12)) { arms = { f: 2.7, b: 0.3 }; mood = 'smile' }
      return { x, v, dir, arms, lean: 0, mood, phone }
    },
    w7(t) {
      return { x: 705, v: 0, dir: 1, arms: { f: 1 + 0.95 * Math.sin(TAU * 3 * t), b: 1.35 }, lean: 0.15, mood: 'flat' }
    },
  }

  /* ---------- windows ---------- */
  function makePane() {
    const g = mk('g', { opacity: 1 }, panesG)
    mk('rect', { x: -25, y: -22, width: 50, height: 44, fill: '#bfe9ff', stroke: '#e8f6ff', 'stroke-width': 3 }, g)
    mk('rect', { x: -21, y: -18, width: 42, height: 36, fill: '#5eead4', 'fill-opacity': 0.5 }, g)
    mk('line', { x1: 0, y1: -18, x2: 0, y2: 18, stroke: '#e8f6ff', 'stroke-width': 2 }, g)
    mk('line', { x1: -21, y1: 0, x2: 21, y2: 0, stroke: '#e8f6ff', 'stroke-width': 2 }, g)
    mk('path', { d: 'M-17 -14 L-8 -14 L-17 -5 Z', fill: '#fff', opacity: 0.35 }, g)
    return g
  }
  const PANES = (
    [
      { tp: 0.6, who: 'w1', ti0: 2.6, ti1: 3.3, tx: OPEN.A, rx: 150 },
      { tp: 3.3, who: 'w2', ti0: 5.3, ti1: 6.0, tx: OPEN.B, rx: 190 },
      { tp: 5.5, who: 'w1', ti0: 8.1, ti1: 8.8, tx: OPEN.C, rx: 230 },
    ] as const
  ).map((p) => ({
    ...p,
    el: makePane(),
    ring: mk('circle', { fill: 'none', stroke: '#bfe9ff', 'stroke-width': 3, opacity: 0 }, fxG),
  }))
  const hand = (who: Who, fig: Figure, t: number) => {
    const p = poses[who](wrap(t))
    return { x: p.x + p.dir * fig.sc * 30, y: fig.y - fig.sc * 54 - 2 * Math.abs(Math.sin(TAU * 4 * t)) }
  }

  /* ---------- UI overlay: stage strip, report card, chip, bubbles, viewfinder, flash ---------- */
  const STAGE_COLORS = ['#e3cba8', '#ff9f40', '#ff6b6b', '#5eead4', '#fff176', '#60a5fa', '#f0abfc']
  const strip = mk('g', {}, uiG)
  mk('text', { x: 40, y: 50, class: 't-mono', 'font-size': 12, fill: '#8fb0cf', 'letter-spacing': 1 }, strip).textContent = 'ЭТАП 4 ИЗ 7  ·  ОКНА'
  const stripFill = STAGE_COLORS.map((c, i) => {
    mk('rect', { x: 40 + i * 42, y: 62, width: 36, height: 9, rx: 2, fill: c, opacity: 0.16 }, strip)
    return mk('rect', { x: 40 + i * 42, y: 62, width: 0, height: 9, rx: 2, fill: c }, strip)
  })

  function thumbIcon(parent: Element, w: number, h: number) {
    const g = mk('g', {}, parent)
    mk('rect', { width: w, height: h, rx: 4, fill: '#123e69', stroke: '#7dd3fc', 'stroke-opacity': 0.8 }, g)
    mk('rect', { y: h * 0.72, width: w, height: h * 0.28, fill: '#0b2a4a' }, g)
    mk('polygon', { points: `${w * 0.18},${h * 0.42} ${w * 0.5},${h * 0.14} ${w * 0.82},${h * 0.42}`, fill: '#1d5188' }, g)
    mk('rect', { x: w * 0.22, y: h * 0.42, width: w * 0.56, height: h * 0.3, fill: '#16477a' }, g)
    for (const x of [0.27, 0.46, 0.65]) mk('rect', { x: w * x, y: h * 0.5, width: w * 0.11, height: h * 0.14, fill: '#5eead4' }, g)
    return g
  }
  const shadow = 'url(#site-loop-shadow)'
  const card = mk('g', { opacity: 0, filter: shadow }, uiG)
  mk('rect', { width: 350, height: 156, rx: 14, fill: '#0d2f50', stroke: '#7dd3fc', 'stroke-opacity': 0.55 }, card)
  mk('circle', { cx: 30, cy: 34, r: 12, fill: '#5eead4' }, card)
  mk('path', { d: 'M24 34 l5 5 l9 -10', stroke: '#0b2a4a', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, card)
  mk('text', { x: 52, y: 41, class: 't-sans', 'font-size': 21, 'font-weight': 600, fill: '#e8f4ff' }, card).textContent = 'Окна'
  const pct = mk('text', { x: 330, y: 46, 'text-anchor': 'end', class: 't-sans', 'font-size': 36, 'font-weight': 600, fill: '#5eead4' }, card)
  mk('rect', { x: 20, y: 64, width: 310, height: 10, rx: 5, fill: '#1c476f' }, card)
  const barFill = mk('rect', { x: 20, y: 64, width: 0, height: 10, rx: 5, fill: '#5eead4' }, card)
  const cardThumbHolder = mk('g', { transform: 'translate(20 92)', opacity: 0 }, card)
  thumbIcon(cardThumbHolder, 46, 34)
  mk('text', { x: 78, y: 106, class: 't-sans', 'font-size': 14, 'font-weight': 500, fill: '#cfe3f5' }, card).textContent = 'Фото прикреплено'
  mk('text', { x: 78, y: 124, class: 't-mono', 'font-size': 12, fill: '#8fb0cf' }, card).textContent = 'Иван · 14:32'
  mk('text', { x: 330, y: 144, 'text-anchor': 'end', class: 't-mono', 'font-size': 10, fill: '#6f93b5', 'letter-spacing': 1.2 }, card).textContent = 'ПРИМЕР ДАННЫХ'

  const chip = mk('g', { opacity: 0, filter: shadow }, uiG)
  mk('rect', { width: 350, height: 46, rx: 12, fill: '#0d2f50', stroke: '#7dd3fc', 'stroke-opacity': 0.55 }, chip)
  mk('text', { x: 18, y: 29, class: 't-sans', 'font-size': 15, fill: '#cfe3f5' }, chip).textContent = 'Общая готовность'
  const gain = mk('text', { x: 256, y: 29, 'text-anchor': 'end', class: 't-mono', 'font-size': 13, fill: '#5eead4' }, chip)
  gain.textContent = '▲ +6'
  const overall = mk('text', { x: 332, y: 31, 'text-anchor': 'end', class: 't-sans', 'font-size': 20, 'font-weight': 600, fill: '#e8f4ff' }, chip)

  const flight = mk('g', { opacity: 0 }, uiG)
  thumbIcon(flight, 46, 34)
  const finder = mk('g', { opacity: 0, stroke: '#fff', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, uiG)
  for (const [x, y, sx, sy] of [[598, 232, 1, 1], [1034, 232, -1, 1], [598, 622, 1, -1], [1034, 622, -1, -1]]) {
    mk('path', { d: `M${x} ${y + 34 * sy} V${y} H${x + 34 * sx}` }, finder)
  }
  mk('rect', { x: 733, y: 494, width: 84, height: 72, rx: 2, stroke: '#ffd23f', 'stroke-width': 2 }, finder)
  const flash = mk('rect', { width: 1280, height: 720, fill: '#fff', opacity: 0 }, uiG)

  function bubble(text: string, w: number) {
    const g = mk('g', { opacity: 0 }, uiG)
    mk('rect', { x: -w / 2, y: -28, width: w, height: 26, rx: 9, fill: '#f4f7fb' }, g)
    mk('polygon', { points: '-6,-3 6,-3 0,6', fill: '#f4f7fb' }, g)
    mk('text', { x: 0, y: -10, 'text-anchor': 'middle', class: 't-sans', 'font-size': 13, 'font-weight': 600, fill: '#0b2a4a' }, g).textContent = text
    return g
  }
  const bub1 = bubble('Давай!', 72)
  const bub2 = bubble('Почти всё!', 100)
  const sweat = mk('path', { d: 'M0 -4 C3 1 4 3 0 5 C-4 3 -3 1 0 -4Z', fill: '#9fe0ff', opacity: 0 }, uiG)

  const clouds = layer('clouds')
  const hook = layer('hook')

  /* narrow screens: enlarge the report card so it stays readable */
  let S = 1

  /* ---------- render ---------- */
  function render(t: number, k = 1) {
    const P = {} as Record<Who, Pose>
    for (const id of Object.keys(poses) as Who[]) P[id] = poses[id](t)
    for (const id of Object.keys(F) as Who[]) updateFig(F[id], P[id], k)

    // windows
    for (const p of PANES) {
      const fig = F[p.who]
      let x: number, y: number, s = 0.8, op = 1
      if (t >= 14.8) { x = p.rx; y = 572; op = seg(t, 14.8, 15) }
      else if (t < p.tp) { x = p.rx; y = 572 }
      else if (t < p.ti0) {
        const h = hand(p.who, fig, t), e = ease(seg(t, p.tp, p.tp + 0.28))
        x = lerp(p.rx, h.x, e); y = lerp(572, h.y, e); s = lerp(0.8, 1, e)
      } else if (t < p.ti1) {
        const h = hand(p.who, fig, p.ti0), e = ease(seg(t, p.ti0, p.ti1))
        x = lerp(h.x, p.tx, e); y = lerp(h.y, OPEN_Y, e); s = lerp(1, 1.4, e)
      } else { x = p.tx; y = OPEN_Y; s = 1.4; op = 1 - seg(t, 14, 14.8) }
      const settled = t >= p.ti1 && t < 14.8
      const want = settled ? panesBack : panesG
      if (p.el.parentNode !== want) want.appendChild(p.el)
      p.el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`)
      p.el.setAttribute('opacity', op.toFixed(2))
      const rp = seg(t, p.ti1, p.ti1 + 0.55)
      p.ring.setAttribute('cx', String(p.tx))
      p.ring.setAttribute('cy', String(OPEN_Y))
      p.ring.setAttribute('r', lerp(26, 66, rp).toFixed(1))
      p.ring.setAttribute('opacity', (rp > 0 && rp < 1 ? (1 - rp) * 0.8 : 0).toFixed(2))
    }

    // reported progress strip: stages 1-3 done, 4 = last reported value
    const reported = t < 11 ? 0.67 : t < 14 ? lerp(0.67, 1, ease(seg(t, 11, 11.7))) : lerp(1, 0.67, ease(seg(t, 14, 14.8)))
    stripFill.forEach((r, i) => r.setAttribute('width', (36 * (i < 3 ? 1 : i === 3 ? reported : 0)).toFixed(1)))

    // viewfinder + flash
    finder.setAttribute('opacity', (seg(t, 9.05, 9.3) * (1 - seg(t, 9.65, 9.8))).toFixed(2))
    flash.setAttribute('opacity', (t >= 9.7 && t < 10.15 ? 0.55 * (1 - seg(t, 9.7, 10.15)) : 0).toFixed(2))

    // photo flies to the card
    const fp = seg(t, 10.1, 10.8), fe = ease(fp)
    const sx = P.w6.x - 28, sy = F.w6.y - 66 * F.w6.sc
    const ex = 1240 - 350 * S + (20 + 23) * S, ey = 36 + (92 + 17) * S
    const cx = lerp(sx, ex, fe), cy = lerp(sy, ey, fe) - Math.sin(fp * Math.PI) * 90
    const fs = lerp(0.55, S, fe)
    flight.setAttribute('transform', `translate(${(cx - 23 * fs).toFixed(1)} ${(cy - 17 * fs).toFixed(1)}) scale(${fs.toFixed(3)})`)
    flight.setAttribute('opacity', fp > 0 && fp < 1 ? '1' : '0')

    // report card
    const ci = ease(seg(t, 10.7, 11.2)), co = 1 - seg(t, 13.7, 14.3)
    card.setAttribute('transform', `translate(${(1240 - 350 * S).toFixed(1)} ${(36 - (1 - ci) * 24).toFixed(1)}) scale(${S})`)
    card.setAttribute('opacity', (ci * co).toFixed(2))
    const val = Math.round(lerp(67, 100, ease(seg(t, 11, 11.7))))
    pct.textContent = val + '%'
    barFill.setAttribute('width', ((310 * val) / 100).toFixed(1))
    cardThumbHolder.setAttribute('opacity', seg(t, 10.8, 11.1).toFixed(2))

    const ki = ease(seg(t, 11.9, 12.4)), ko = 1 - seg(t, 13.7, 14.3)
    chip.setAttribute('transform', `translate(${(1240 - 350 * S).toFixed(1)} ${(36 + 156 * S + 12 - (1 - ki) * 14).toFixed(1)}) scale(${S})`)
    chip.setAttribute('opacity', (ki * ko).toFixed(2))
    overall.textContent = 58 + Math.round(6 * ease(seg(t, 12.1, 12.7))) + '%'
    gain.setAttribute('opacity', seg(t, 12.5, 12.8).toFixed(2))

    // foreman bubbles + sweat
    const fx = P.w4.x, fy = F.w4.y - 108 * F.w4.sc
    const bo = (a: number, b: number) => (seg(t, a, a + 0.15) * (1 - seg(t, b - 0.15, b))).toFixed(2)
    bub1.setAttribute('transform', `translate(${fx.toFixed(1)} ${fy.toFixed(1)})`)
    bub1.setAttribute('opacity', bo(1.0, 2.0))
    bub2.setAttribute('transform', `translate(${fx.toFixed(1)} ${fy.toFixed(1)})`)
    bub2.setAttribute('opacity', bo(6.3, 7.3))
    const sw = (t % 1.5) / 1.5
    sweat.setAttribute('transform', `translate(${(fx + 13).toFixed(1)} ${(F.w4.y - 98 * F.w4.sc + sw * 16).toFixed(1)})`)
    sweat.setAttribute('opacity', ((1 - sw) * 0.9).toFixed(2))

    // ambient: clouds drift, crane hook sways (periods divide 15 s)
    clouds.setAttribute('transform', `translate(${(26 * Math.sin((TAU * t) / 15)).toFixed(1)} 0)`)
    hook.setAttribute('transform', `rotate(${(2.6 * Math.sin((TAU * t) / 5)).toFixed(2)} 540 164)`)
  }

  return {
    render,
    setWidth(px) {
      S = px < 640 ? 1.3 : 1
    },
    destroy() {
      for (const name of BUILT_LAYERS) layer(name).replaceChildren()
      clouds.removeAttribute('transform')
      hook.removeAttribute('transform')
    },
  }
}
