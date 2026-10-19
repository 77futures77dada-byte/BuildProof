import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { MappedStage } from './types'
import { houseStrings as t } from './strings'

export function HouseModel({ stages, height, interactive = true }: { stages: MappedStage[]; height?: number; interactive?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
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
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100); camera.position.set(8, 6, 9); camera.lookAt(0, 2, 0)
    const group = new THREE.Group(); scene.add(group)
    const mats: THREE.Material[] = []
    const geometries: THREE.BufferGeometry[] = []
    const colors = { ghost: '#7dd3fc', live: '#7dd3fc', complete: '#ffffff' }
    const addBox = (x:number,y:number,z:number,w:number,h:number,d:number,progress:number, vertical:boolean, key:string) => {
      const geo = new THREE.BoxGeometry(w,h,d); geometries.push(geo)
      const edge = new THREE.EdgesGeometry(geo); geometries.push(edge)
      const line = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({ color: progress >= 100 ? colors.complete : colors.live, transparent: progress < 100, opacity: progress === 0 ? .15 : 1, depthWrite: false })); mats.push(line.material as THREE.Material)
      line.position.set(x,y,z); line.userData = { key }; if (vertical && progress < 100) { line.scale.y = Math.max(progress / 100, .001); line.position.y = y - h * (1 - progress / 100) / 2 }
      group.add(line)
    }
    const percent = (part:string) => stages.find(s=>s.part===part)?.percent ?? 0
    const footprint = (part:string, progress:number) => {
      addBox(0,.15,0,4,.3,3,progress,false,part)
    }
    footprint('foundation',percent('foundation'))
    // Two storey structural frame, walls are intentionally open blueprint edges.
    const frame=percent('frame')
    for (const y of [.5,2.5,4.5]) addBox(0,y,0,3.6,.12,2.6,frame,false,'frame')
    for (const y of [1.5,3.5]) for(const x of [-1.75,1.75]) for(const z of [-1.25,1.25]) addBox(x,y,z,.10,2,.10,frame,true,'frame')
    const roof=percent('roof')
    for(const x of [-1.9,1.9]) for(const z of [-1.45,1.45]) addBox(x,5,z,.12,.12,.12,roof,false,'roof')
    // Roof ridge and two slopes, built from edge-only boxes rotated on the ridge.
    for(const side of [-1,1]) { const g=new THREE.BoxGeometry(2.8,.08,.08); geometries.push(g); const e=new THREE.EdgesGeometry(g); geometries.push(e); const l=new THREE.LineSegments(e,new THREE.LineBasicMaterial({color:roof===100?colors.complete:colors.live,transparent:roof<100,opacity:roof===0?.15:1})); mats.push(l.material as THREE.Material); l.position.set(0,5.5,side*.75); l.rotation.x=side*.45; l.userData={key:'roof'}; group.add(l) }
    const windowP=percent('windows'); let wi=0
    for(const y of [1.5,3.5]) for(const x of [-1.81,1.81]) for(const z of [-.65,.65]) { const p=Math.floor((wi+1)*windowP/8); addBox(x,y,z,.04,.65,.45,p?100:0,false,'windows'); wi++ }
    const electric=percent('electric'); let ei=0
    for(const y of [1.2,3.2]) for(const x of [-1.82,1.82]) for(const z of [-.8,0,.8]) { addBox(x,y,z,.04,.05,.05,Math.floor((ei+1)*electric/12)?100:0,false,'electric'); ei++ }
    const finish=percent('finish')
    for(const y of [1.5,3.5]) addBox(0,y,-1.26,3.2,1.8,.025,finish,true,'finish')
    if(percent('handover')===100) { const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.2,5.3,3.2)),new THREE.LineBasicMaterial({color:'#ffffff'})); geometries.push(outline.geometry as THREE.BufferGeometry); mats.push(outline.material as THREE.Material); outline.position.y=2.7; outline.userData={key:'handover'}; group.add(outline) }
    const grid=new THREE.GridHelper(10,20,'#24516f','#173e5e'); grid.position.y=-.03; scene.add(grid)
    let width=0,heightPx=0, visible=true, pageVisible=!document.hidden, dragging=false, pointerX=0, resumeAt=0, raf=0
    const resize=()=>{width=root.clientWidth;heightPx=root.clientHeight;renderer.setSize(width,heightPx,false);camera.aspect=width/Math.max(heightPx,1);camera.updateProjectionMatrix()}; resize()
    const observer=new ResizeObserver(resize); observer.observe(root)
    const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting}); intersection.observe(root)
    const visibility=()=>{pageVisible=!document.hidden}; document.addEventListener('visibilitychange',visibility)
    const down=(e:PointerEvent)=>{dragging=true;pointerX=e.clientX;resumeAt=performance.now()+3000;root.setPointerCapture(e.pointerId)}
    const raycaster = new THREE.Raycaster()
    const point = new THREE.Vector2()
    const inspect = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect()
      point.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(point, camera)
      const key = raycaster.intersectObjects(group.children, false)[0]?.object.userData.key as string | undefined
      const stage = stages.find(item => item.part === key)
      setActive(stage ? `${stage.name}: ${Math.round(stage.percent)}%` : null)
    }
    const move=(e:PointerEvent)=>{if(dragging&&interactive){group.rotation.y+=(e.clientX-pointerX)*.008;pointerX=e.clientX}else inspect(e)}
    const tap=(e:PointerEvent)=>inspect(e)
    const up=()=>{dragging=false;resumeAt=performance.now()+3000}
    root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);root.addEventListener('click',tap)
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const draw=(now:number)=>{raf=requestAnimationFrame(draw);if(!visible||!pageVisible)return;if(interactive&&!dragging&&!reduce&&now>resumeAt)group.rotation.y+=.0012;renderer.render(scene,camera)};raf=requestAnimationFrame(draw)
    const contextLost=(e:Event)=>{e.preventDefault();setFailed(true)};renderer.domElement.addEventListener('webglcontextlost',contextLost)
    return ()=>{cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',up);root.removeEventListener('click',tap);renderer.domElement.removeEventListener('webglcontextlost',contextLost);geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());grid.geometry.dispose();(grid.material as THREE.Material).dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}
  }, [stages,interactive])
  const rows=stages.map(s=>`${s.name}: ${Math.round(s.percent)}%`)
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label={t.title}>
    {!failed ? <div ref={host} className="house3d-canvas w-full" style={height ? {height} : undefined} role="img" aria-label={rows.join(', ')} onPointerMove={()=>setActive(null)} /> : <p className="p-4 text-sm text-slate-600">{t.fallback}</p>}
    <div className="space-y-3 p-4"><div className="flex flex-wrap gap-4 text-xs"><span className="text-sky-600">● {t.ready}</span><span className="text-amber-500">● {t.working}</span><span className="text-slate-400">● {t.notStarted}</span></div>
      {active ? <p role="status">{active}</p> : null}<ul className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">{stages.map((s)=><li key={s.key} className="flex justify-between gap-2"><span>{s.part==='other'?t.other:s.name}</span><span className="tabular-nums">{Math.round(s.percent)}%</span></li>)}</ul></div>
  </section>
}
