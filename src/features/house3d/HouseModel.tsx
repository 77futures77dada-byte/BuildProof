import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import type { HouseRendererSnapshot, MappedStage } from './types'
import { HOUSE, HOUSE_BOUNDS, HOUSE_LINES, type HousePart } from './houseGeometry'
import { houseStrings as t } from './strings'

export function HouseModel({ stages, height, interactive = true, initialAngle = 35, onRendererDispose }: { stages: MappedStage[]; height?: number; interactive?: boolean; initialAngle?: number; onRendererDispose?: (snapshot: HouseRendererSnapshot) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const onRendererDisposeRef = useRef(onRendererDispose)
  useEffect(() => { onRendererDisposeRef.current = onRendererDispose }, [onRendererDispose])
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const root = host.current
    if (!root) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' }) } catch { queueMicrotask(() => setFailed(true)); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setClearColor('#0b2a4a')
    root.appendChild(renderer.domElement)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b2a4a')
    const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, .1, 100)
    const group = new THREE.Group(); group.position.y = -HOUSE.centerY; scene.add(group)
    const mats: THREE.Material[] = []
    const geometries: THREE.BufferGeometry[] = []
    const glowMaterials: LineMaterial[] = []
    const percent = (part: HousePart) => stages.find(s => s.part === (part === 'door' ? 'windows' : part))?.percent ?? 0
    const byPart = new Map<HousePart, typeof HOUSE_LINES[number][]>()
    for (const item of HOUSE_LINES) byPart.set(item.part, [...(byPart.get(item.part) ?? []), item])
    for (const [part, entries] of byPart) {
      const p = percent(part), completePositions: number[] = [], workingPositions: number[] = [], ghostPositions: number[] = []
      entries.forEach((entry, index) => {
        const complete = p >= 100 || (p > 0 && index < Math.floor(entries.length * p / 100))
        const target = complete ? completePositions : p > 0 ? workingPositions : ghostPositions
        for (const point of entry.points) target.push(...point)
      })
      const addLines = (positions: number[], color: string, opacity: number) => {
        if (!positions.length) return
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometries.push(geometry)
        const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false }); mats.push(material)
        const object = new THREE.LineSegments(geometry, material); object.userData.key = part; group.add(object)
      }
      addLines(completePositions, '#ffffff', 1)
      addLines(workingPositions, '#fbbf24', .72)
      addLines(ghostPositions, '#7dd3fc', .18)
      if (completePositions.length) {
        const glowGeometry = new LineSegmentsGeometry(); glowGeometry.setPositions(completePositions); geometries.push(glowGeometry)
        const material = new LineMaterial({ color: '#ffffff', transparent: true, opacity: .25, linewidth: 3, blending: THREE.AdditiveBlending, depthWrite: false })
        material.resolution.set(root.clientWidth, root.clientHeight); glowMaterials.push(material); mats.push(material)
        const object = new LineSegments2(glowGeometry, material); object.userData.key = part; group.add(object)
      }
    }
    const grid = new THREE.GridHelper(18, 36, '#24516f', '#173e5e'); grid.position.y = -.42 - HOUSE.centerY; scene.add(grid)
    const aspectFit = (aspect: number) => {
      const az = THREE.MathUtils.degToRad(initialAngle), el = THREE.MathUtils.degToRad(25)
      const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az))
      const up = new THREE.Vector3(-Math.sin(az) * Math.sin(el), Math.cos(el), -Math.cos(az) * Math.sin(el))
      let halfX = 0, halfY = 0
      for (const x of [HOUSE_BOUNDS.min[0], HOUSE_BOUNDS.max[0]]) for (const y of [HOUSE_BOUNDS.min[1], HOUSE_BOUNDS.max[1]]) for (const z of [HOUSE_BOUNDS.min[2], HOUSE_BOUNDS.max[2]]) {
        const point = new THREE.Vector3(x, y - HOUSE.centerY, z)
        halfX = Math.max(halfX, Math.abs(point.dot(right))); halfY = Math.max(halfY, Math.abs(point.dot(up)))
      }
      const halfHeight = Math.max(halfY, halfX / aspect) * 1.1
      camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight
      camera.position.set(Math.sin(az) * Math.cos(el) * 20, Math.sin(el) * 20, Math.cos(az) * Math.cos(el) * 20)
      camera.lookAt(0, 0, 0); camera.updateProjectionMatrix()
    }
    let visible = true, pageVisible = !document.hidden, dragging = false, pointerX = 0, resumeAt = 0, raf = 0
    const resize = () => { const width = root.clientWidth, h = root.clientHeight; renderer.setSize(width, h, false); aspectFit(width / Math.max(h, 1)); glowMaterials.forEach(material => material.resolution.set(width, h)) }
    resize()
    const observer = new ResizeObserver(resize); observer.observe(root)
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }); intersection.observe(root)
    const visibility = () => { pageVisible = !document.hidden }; document.addEventListener('visibilitychange', visibility)
    const down = (e: PointerEvent) => { dragging = true; pointerX = e.clientX; resumeAt = performance.now() + 3000; root.setPointerCapture(e.pointerId) }
    const raycaster = new THREE.Raycaster(), point = new THREE.Vector2()
    const inspect = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect(); point.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(point, camera)
      const key = raycaster.intersectObjects(group.children, false)[0]?.object.userData.key as string | undefined
      const stage = stages.find(item => item.part === (key === 'door' ? 'windows' : key))
      setActive(stage ? `${stage.name}: ${Math.round(stage.percent)}%` : null)
    }
    const move = (e: PointerEvent) => { if (dragging && interactive) { group.rotation.y += (e.clientX - pointerX) * .008; pointerX = e.clientX } else inspect(e) }
    const up = () => { dragging = false; resumeAt = performance.now() + 3000 }
    const leave = () => setActive(null)
    root.addEventListener('pointerdown', down); root.addEventListener('pointermove', move); root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('pointerleave', leave); root.addEventListener('click', inspect)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const draw = (now: number) => { raf = requestAnimationFrame(draw); if (!visible || !pageVisible) return; if (interactive && !dragging && !reduce && now > resumeAt) group.rotation.y += .0012; renderer.render(scene, camera) }
    raf = requestAnimationFrame(draw)
    const contextLost = (e: Event) => { e.preventDefault(); setFailed(true) }; renderer.domElement.addEventListener('webglcontextlost', contextLost)
    return () => {
      cancelAnimationFrame(raf); observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', visibility)
      root.removeEventListener('pointerdown', down); root.removeEventListener('pointermove', move); root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', up); root.removeEventListener('pointerleave', leave); root.removeEventListener('click', inspect)
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      const snapshot = { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0 }
      geometries.forEach(geometry => geometry.dispose()); mats.forEach(material => material.dispose()); grid.geometry.dispose(); (grid.material as THREE.Material).dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); onRendererDisposeRef.current?.(snapshot)
    }
  }, [stages, interactive, initialAngle])
  const rows = stages.map(s => `${s.name}: ${Math.round(s.percent)}%`)
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label={t.title}>
    {!failed ? <div ref={host} className="house3d-canvas w-full" style={height ? { height } : undefined} role="img" aria-label={rows.join(', ')} /> : <p className="p-4 text-sm text-slate-600">{t.fallback}</p>}
    <div className="space-y-3 p-4"><div className="flex flex-wrap gap-4 text-xs"><span className="text-sky-600">● {t.ready}</span><span className="text-amber-500">● {t.working}</span><span className="text-slate-400">● {t.notStarted}</span></div>
      {active ? <p role="status">{active}</p> : null}<ul className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">{stages.map(s => <li key={s.key} className="flex justify-between gap-2"><span>{s.part === 'other' ? t.other : s.name}</span><span className="tabular-nums">{Math.round(s.percent)}%</span></li>)}</ul></div>
  </section>
}
