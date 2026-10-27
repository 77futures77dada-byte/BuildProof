import * as THREE from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { HOUSE, HOUSE_BOUNDS, HOUSE_LINES, type HouseLine } from './houseGeometry'
import { DEFAULT_VIEW, EXPLODE_DIRECTION, EXPLODE_DISTANCE, STAGE_VIEWS, buildStageGroups, doneCount, type StageGroup } from './stageElements'
import { CONTOUR_COLOR, GLOW_WIDTH, HOUSE_BG, HOUSE_OPACITY, STAGE_COLORS } from './palette'
import { STAGE_PARTS, type HouseRendererSnapshot, type StagePart } from './types'

export const TIMING = {
  select: 700, grow: 900, stagger: 60, playback: 6000, autorotateResume: 3000, hover: 180,
} as const
const AUTOROTATE_SPEED = .07 / 1000 // rad per ms
const DRAG_SPEED = .008 // rad per px
const TAP_SLOP = 6 // px a pointer may travel and still count as a tap
const PICK_RADIUS = { mouse: 6, touch: 18 } // px around the pointer
const deg = THREE.MathUtils.degToRad
const ease = (k: number) => (k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2) // ease-in-out cubic
const clamp01 = (k: number) => Math.min(1, Math.max(0, k))

/** One animated scalar on the shared timeline. */
class Tween {
  private from: number; private to: number; private start = 0; private duration = 0
  constructor(value: number) { this.from = value; this.to = value }
  set(to: number, now: number, duration: number) { this.from = this.get(now); this.to = to; this.start = now; this.duration = duration }
  jump(value: number) { this.from = value; this.to = value; this.duration = 0 }
  get(now: number) {
    if (this.duration <= 0 || now >= this.start + this.duration) return this.to
    return this.from + (this.to - this.from) * ease((now - this.start) / this.duration)
  }
  active(now: number) { return this.duration > 0 && now < this.start + this.duration }
  get target() { return this.to }
}

interface ElementView { root: THREE.Group; done: THREE.LineSegments; ghost: THREE.LineSegments; glow: LineSegments2; normal: THREE.Vector3 }
interface PartView {
  group: StageGroup
  root: THREE.Group
  done: THREE.LineBasicMaterial; ghost: THREE.LineBasicMaterial; glow: LineMaterial
  /** vertical stages: one object per layer, cut at the built height by two clip planes. */
  layers?: { done: THREE.LineSegments; ghost: THREE.LineSegments; glow: LineSegments2 }
  donePlane: THREE.Plane; ghostPlane: THREE.Plane
  elements: ElementView[]
  percent: number
  dim: Tween; explode: Tween; hover: Tween
}

export interface HouseSceneOptions {
  interactive: boolean
  initialAngle: number
  reducedMotion: boolean
  /** A tap/click picked a stage (null = background). */
  onPick: (part: StagePart | null) => void
  /** Playback moved on to a stage; null once it ends or is interrupted. */
  onPlaybackStage: (part: StagePart | null) => void
  onContextLost: () => void
}

export interface HouseScene {
  setProgress: (percents: Partial<Record<StagePart, number>>) => void
  select: (part: StagePart | null) => void
  play: (order: StagePart[]) => void
  stopPlayback: () => void
  setReducedMotion: (reduced: boolean) => void
  dispose: () => HouseRendererSnapshot
}

/** Throws when WebGL is unavailable. */
export function createHouseScene(root: HTMLElement, options: HouseSceneOptions): HouseScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setClearColor(HOUSE_BG)
  renderer.localClippingEnabled = true
  root.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, .1, 100)
  const target = new THREE.Vector3(0, HOUSE.centerY, 0)
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  const glowMaterials: LineMaterial[] = []
  const pickables: THREE.Object3D[] = []

  const segments = (lines: readonly HouseLine[]) => {
    const positions = lines.flatMap(line => line.points.flatMap(point => [...point]))
    const lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const glowGeometry = new LineSegmentsGeometry(); glowGeometry.setPositions(positions)
    geometries.push(lineGeometry, glowGeometry)
    return { lineGeometry, glowGeometry }
  }
  const lineMaterial = (color: string, opacity: number, clippingPlanes: THREE.Plane[] = []) => {
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, clippingPlanes })
    materials.push(material); return material
  }
  const glowMaterial = (color: string, clippingPlanes: THREE.Plane[] = []) => {
    const material = new LineMaterial({ color, transparent: true, opacity: HOUSE_OPACITY.glow, linewidth: GLOW_WIDTH, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes })
    materials.push(material); glowMaterials.push(material); return material
  }

  // Build every stage once; progress later only moves clip planes and toggles elements.
  const groups = buildStageGroups()
  const parts = {} as Record<StagePart, PartView>
  for (const part of STAGE_PARTS) {
    const group = groups[part], color = STAGE_COLORS[part]
    const donePlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0) // keeps y ≤ built height
    const ghostPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) // keeps y ≥ built height
    const vertical = group.kind === 'vertical'
    const view: PartView = {
      group, root: new THREE.Group(),
      done: lineMaterial(color, 1, vertical ? [donePlane] : []),
      ghost: lineMaterial(color, HOUSE_OPACITY.ghost, vertical ? [ghostPlane] : []),
      glow: glowMaterial(color, vertical ? [donePlane] : []),
      donePlane, ghostPlane, elements: [], percent: 0,
      dim: new Tween(1), explode: new Tween(0), hover: new Tween(0),
    }
    if (vertical) {
      const { lineGeometry, glowGeometry } = segments(group.lines)
      view.layers = { done: new THREE.LineSegments(lineGeometry, view.done), ghost: new THREE.LineSegments(lineGeometry, view.ghost), glow: new LineSegments2(glowGeometry, view.glow) }
      view.root.add(view.layers.ghost, view.layers.done, view.layers.glow)
      view.layers.ghost.userData.part = part; pickables.push(view.layers.ghost)
    } else {
      for (const element of group.elements) {
        const { lineGeometry, glowGeometry } = segments(element.lines)
        const item: ElementView = {
          root: new THREE.Group(), done: new THREE.LineSegments(lineGeometry, view.done), ghost: new THREE.LineSegments(lineGeometry, view.ghost),
          glow: new LineSegments2(glowGeometry, view.glow), normal: new THREE.Vector3(...element.normal),
        }
        item.root.add(item.ghost, item.done, item.glow); view.root.add(item.root)
        item.ghost.userData.part = part; pickables.push(item.ghost)
        view.elements.push(item)
      }
    }
    scene.add(view.root)
    parts[part] = view
  }

  const contour = segments(HOUSE_LINES.filter(line => line.part === 'handover'))
  const contourLine = lineMaterial(CONTOUR_COLOR, 1), contourGlow = glowMaterial(CONTOUR_COLOR)
  const contourRoot = new THREE.Group()
  contourRoot.add(new THREE.LineSegments(contour.lineGeometry, contourLine), new LineSegments2(contour.glowGeometry, contourGlow))
  scene.add(contourRoot)
  const contourDim = new Tween(1)

  const grid = new THREE.GridHelper(18, 36, '#24516f', '#173e5e'); grid.position.y = -.42; scene.add(grid)

  // --- state on the shared timeline ---
  let reduced = options.reducedMotion
  let selected: StagePart | null = null
  let hovered: StagePart | null = null
  let growStart: number | null = null
  let playback: { order: StagePart[]; start: number; index: number } | null = null
  let resumeAt = 0
  const azimuth = new Tween(deg(options.initialAngle)), elevation = new Tween(deg(DEFAULT_VIEW.elevation)), zoom = new Tween(DEFAULT_VIEW.zoom)
  const duration = (ms: number) => (reduced ? 0 : ms)

  /** 0..1: how much of the stage's current percent is shown right now. */
  const reveal = (part: StagePart, now: number) => {
    if (playback) {
      const slot = TIMING.playback / playback.order.length, index = playback.order.indexOf(part)
      if (index < 0) return 1
      const k = clamp01((now - playback.start - index * slot) / slot)
      return reduced ? (k > 0 ? 1 : 0) : ease(k)
    }
    if (part !== selected || growStart === null) return 1
    const view = parts[part]
    const span = view.group.kind === 'vertical' ? TIMING.grow : Math.max(1, doneCount(view.elements.length, view.percent) * staggerOf(view))
    const k = clamp01((now - growStart) / span)
    return view.group.kind === 'vertical' ? ease(k) : k
  }
  /** 60 ms between elements, compressed so the whole run fits in the grow time. */
  const staggerOf = (view: PartView) => Math.min(TIMING.stagger, TIMING.grow / Math.max(1, doneCount(view.elements.length, view.percent)))

  const offset = new THREE.Vector3()
  const applyParts = (now: number) => {
    let allComplete = true
    for (const part of STAGE_PARTS) {
      const view = parts[part], shown = reveal(part, now)
      const dim = view.dim.get(now), hover = view.hover.get(now), isSelected = selected === part
      view.done.opacity = dim
      view.ghost.opacity = (HOUSE_OPACITY.ghost + .2 * hover + (isSelected ? .1 : 0)) * dim
      view.glow.opacity = (HOUSE_OPACITY.glow + .25 * hover + (isSelected ? .15 : 0)) * dim
      const distance = reduced ? 0 : view.explode.get(now) * EXPLODE_DISTANCE
      const direction = EXPLODE_DIRECTION[part]
      if (Array.isArray(direction)) view.root.position.fromArray(direction).multiplyScalar(distance)
      if (view.layers) {
        const fraction = view.percent / 100 * shown
        const span = view.group.maxY - view.group.minY
        // Nudge past the extremes so lines lying exactly on minY/maxY classify cleanly.
        const height = fraction <= 0 ? view.group.minY - 1 : fraction >= 1 ? view.group.maxY + 1 : view.group.minY + span * fraction
        const worldHeight = height + view.root.position.y
        view.donePlane.constant = worldHeight; view.ghostPlane.constant = -worldHeight
        view.layers.done.visible = view.layers.glow.visible = fraction > 0
      } else {
        const visibleDone = Math.floor(doneCount(view.elements.length, view.percent) * shown + 1e-9)
        view.elements.forEach((item, index) => {
          const done = index < visibleDone
          item.done.visible = item.glow.visible = done; item.ghost.visible = !done
          item.root.position.copy(direction === 'element' ? offset.copy(item.normal).multiplyScalar(distance) : offset.set(0, 0, 0))
        })
      }
      if (view.percent < 100 || shown < 1) allComplete = false
    }
    contourRoot.visible = allComplete
    const contourOpacity = contourDim.get(now)
    contourLine.opacity = contourOpacity; contourGlow.opacity = HOUSE_OPACITY.glow * 1.4 * contourOpacity
  }

  const right = new THREE.Vector3(), up = new THREE.Vector3(), corner = new THREE.Vector3()
  const applyCamera = (now: number) => {
    const az = azimuth.get(now), el = elevation.get(now)
    camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(20).add(target)
    camera.up.set(0, 1, 0); camera.lookAt(target)
    // Fit the orthographic frustum to the envelope including any part currently pulled out.
    camera.updateMatrixWorld(); right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1)
    const out = (part: StagePart) => (reduced ? 0 : parts[part].explode.get(now) * EXPLODE_DISTANCE)
    const sideOut = out('windows')
    const min = [HOUSE_BOUNDS.min[0] - sideOut, HOUSE_BOUNDS.min[1] - out('foundation'), HOUSE_BOUNDS.min[2] - sideOut]
    const max = [HOUSE_BOUNDS.max[0] + sideOut, HOUSE_BOUNDS.max[1] + out('roof'), HOUSE_BOUNDS.max[2] + sideOut]
    let halfX = 0, halfY = 0
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
      corner.set(x, y, z).sub(target)
      halfX = Math.max(halfX, Math.abs(corner.dot(right))); halfY = Math.max(halfY, Math.abs(corner.dot(up)))
    }
    const aspect = root.clientWidth / Math.max(root.clientHeight, 1)
    const halfHeight = Math.max(halfY, halfX / aspect) * 1.08 / zoom.get(now)
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight
    camera.updateProjectionMatrix()
  }

  // --- render on demand: one rAF loop that stops when nothing moves ---
  let visible = true, pageVisible = !document.hidden, raf = 0, last = 0, resumeTimer = 0, disposed = false
  let pointer: { id: number; x: number; startX: number; startY: number; type: string; dragging: boolean; swallow: boolean } | null = null
  const autorotating = (now: number) => options.interactive && !reduced && !selected && !playback && !pointer?.dragging && now >= resumeAt
  const frame = (now: number) => {
    raf = 0
    const dt = last ? Math.min(now - last, 100) : 0
    last = now
    if (autorotating(now) && !azimuth.active(now)) azimuth.jump(azimuth.get(now) + dt * AUTOROTATE_SPEED)
    if (playback) {
      const index = Math.min(playback.order.length - 1, Math.floor((now - playback.start) / (TIMING.playback / playback.order.length)))
      if (now - playback.start >= TIMING.playback) { playback = null; options.onPlaybackStage(null) }
      else if (index !== playback.index) { playback.index = index; options.onPlaybackStage(playback.order[index]) }
    }
    applyParts(now); applyCamera(now)
    renderer.render(scene, camera)
    const growing = growStart !== null && now - growStart < TIMING.grow + 50
    const animating = growing || !!playback || autorotating(now) || contourDim.active(now) || azimuth.active(now) || elevation.active(now) || zoom.active(now)
      || STAGE_PARTS.some(part => parts[part].dim.active(now) || parts[part].explode.active(now) || parts[part].hover.active(now))
    if (animating) { invalidate(); return }
    last = 0
    // Idle until auto-rotation is due again, without spinning the loop meanwhile.
    if (options.interactive && !reduced && !selected && now < resumeAt) {
      window.clearTimeout(resumeTimer); resumeTimer = window.setTimeout(invalidate, resumeAt - now)
    }
  }
  const invalidate = () => { if (!raf && !disposed && visible && pageVisible) raf = requestAnimationFrame(frame) }

  const resize = () => {
    const width = root.clientWidth, height = root.clientHeight
    renderer.setSize(width, height, false)
    glowMaterials.forEach(material => material.resolution.set(width, height))
    invalidate()
  }
  resize()
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root)
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) invalidate() }); intersection.observe(root)
  const onVisibility = () => { pageVisible = !document.hidden; last = 0; invalidate() }
  document.addEventListener('visibilitychange', onVisibility)

  // --- picking ---
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), projected = new THREE.Vector3()
  const pick = (clientX: number, clientY: number, pointerType: string): StagePart | null => {
    const rect = root.getBoundingClientRect()
    ndc.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1)
    const radius = pointerType === 'mouse' ? PICK_RADIUS.mouse : PICK_RADIUS.touch
    raycaster.params.Line = { threshold: radius * (camera.top - camera.bottom) / camera.zoom / Math.max(rect.height, 1) }
    raycaster.setFromCamera(ndc, camera)
    scene.updateMatrixWorld()
    let best: StagePart | null = null, bestScore = Infinity
    for (const hit of raycaster.intersectObjects(pickables, false)) {
      const part = hit.object.userData.part as StagePart
      projected.copy(hit.point).project(camera)
      const px = Math.hypot((projected.x - ndc.x) * rect.width / 2, (projected.y - ndc.y) * rect.height / 2)
      // Small items (windows, sockets, pipes) win ties against the big frame lines behind them.
      const score = px - (parts[part].group.kind === 'count' ? 4 : 0)
      if (score < bestScore) { bestScore = score; best = part }
    }
    return best
  }
  const setHover = (part: StagePart | null) => {
    if (part === hovered) return
    const now = performance.now()
    if (hovered) parts[hovered].hover.set(0, now, duration(TIMING.hover))
    hovered = part
    if (part) parts[part].hover.set(1, now, duration(TIMING.hover))
    root.style.cursor = part ? 'pointer' : ''
    invalidate()
  }

  const onDown = (event: PointerEvent) => {
    pointer = { id: event.pointerId, x: event.clientX, startX: event.clientX, startY: event.clientY, type: event.pointerType, dragging: false, swallow: !!playback }
    if (playback) stopPlayback()
  }
  const onMove = (event: PointerEvent) => {
    if (pointer && pointer.id === event.pointerId) {
      const dx = event.clientX - pointer.x
      if (!pointer.dragging && options.interactive && Math.abs(event.clientX - pointer.startX) > TAP_SLOP) {
        pointer.dragging = true
        try { root.setPointerCapture(event.pointerId) } catch { /* pointer already released */ }
      }
      if (pointer.dragging) {
        azimuth.jump(azimuth.get(performance.now()) - dx * DRAG_SPEED)
        resumeAt = performance.now() + TIMING.autorotateResume
        invalidate()
      }
      pointer.x = event.clientX
    } else if (event.pointerType === 'mouse') setHover(pick(event.clientX, event.clientY, 'mouse'))
  }
  const onUp = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return
    const tap = !pointer.dragging && !pointer.swallow && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) <= TAP_SLOP * 2
    if (pointer.dragging) resumeAt = performance.now() + TIMING.autorotateResume
    const type = pointer.type
    pointer = null
    if (tap) options.onPick(pick(event.clientX, event.clientY, type))
    invalidate()
  }
  const onCancel = () => { pointer = null; invalidate() }
  const onLeave = () => setHover(null)
  root.addEventListener('pointerdown', onDown); root.addEventListener('pointermove', onMove); root.addEventListener('pointerup', onUp)
  root.addEventListener('pointercancel', onCancel); root.addEventListener('pointerleave', onLeave)
  const onContextLost = (event: Event) => { event.preventDefault(); options.onContextLost() }
  renderer.domElement.addEventListener('webglcontextlost', onContextLost)

  // --- public API ---
  const setProgress = (percents: Partial<Record<StagePart, number>>) => {
    for (const part of STAGE_PARTS) parts[part].percent = Math.max(0, Math.min(100, percents[part] ?? 0))
    invalidate()
  }
  const select = (part: StagePart | null) => {
    if (part === selected) return
    const now = performance.now(), ms = duration(TIMING.select)
    selected = part
    for (const each of STAGE_PARTS) {
      parts[each].dim.set(part === null || each === part ? 1 : HOUSE_OPACITY.dimmed, now, ms)
      parts[each].explode.set(each === part ? 1 : 0, now, ms)
    }
    contourDim.set(part ? HOUSE_OPACITY.dimmed : 1, now, ms)
    const view = part ? STAGE_VIEWS[part] : { ...DEFAULT_VIEW, azimuth: null }
    if (view.azimuth !== null) {
      // Turn the short way round from wherever auto-rotation left the camera.
      const current = azimuth.get(now), goal = deg(view.azimuth)
      azimuth.set(goal + Math.PI * 2 * Math.round((current - goal) / (Math.PI * 2)), now, ms)
    }
    elevation.set(deg(view.elevation), now, ms); zoom.set(view.zoom, now, ms)
    growStart = part && !reduced ? now : null
    if (!part) resumeAt = now + TIMING.autorotateResume
    invalidate()
  }
  const play = (order: StagePart[]) => {
    if (!order.length) return
    select(null)
    const now = performance.now()
    playback = { order, start: now, index: 0 }
    options.onPlaybackStage(order[0])
    invalidate()
  }
  function stopPlayback() {
    if (!playback) return
    playback = null
    options.onPlaybackStage(null)
    resumeAt = performance.now() + TIMING.autorotateResume
    invalidate()
  }
  const setReducedMotion = (value: boolean) => {
    reduced = value
    if (reduced) {
      // Jump every running transition to its end state.
      for (const part of STAGE_PARTS) for (const tween of [parts[part].dim, parts[part].explode, parts[part].hover]) tween.jump(tween.target)
      for (const tween of [azimuth, elevation, zoom, contourDim]) tween.jump(tween.target)
      growStart = null
    }
    invalidate()
  }
  const dispose = (): HouseRendererSnapshot => {
    disposed = true
    if (raf) cancelAnimationFrame(raf)
    window.clearTimeout(resumeTimer)
    resizeObserver.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', onVisibility)
    root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerup', onUp)
    root.removeEventListener('pointercancel', onCancel); root.removeEventListener('pointerleave', onLeave)
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
    root.style.cursor = ''
    const snapshot = { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0 }
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose())
    grid.geometry.dispose(); (grid.material as THREE.Material).dispose()
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    return snapshot
  }

  return { setProgress, select, play, stopPlayback, setReducedMotion, dispose }
}
