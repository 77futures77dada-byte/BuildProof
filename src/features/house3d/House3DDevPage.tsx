import { useCallback, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { HouseModel } from './HouseModel'
import { stagesToParts } from './stagesToParts'
import { initialSelection, selectionReducer } from './selection'
import { STAGE_COLORS } from './palette'
import { devStrings as d } from './strings'
import { STAGE_PARTS, type HouseRendererSnapshot } from './types'

// Local fixture: the seven catalogue stages. Names are the real catalogue names, percents come from the sliders.
const BASE_STAGES = [
  { key: 'foundation', name: 'Фундамент', sortOrder: 1 },
  { key: 'frame', name: 'Каркас', sortOrder: 2 },
  { key: 'roof', name: 'Кровля', sortOrder: 3 },
  { key: 'windows', name: 'Окна', sortOrder: 4 },
  { key: 'electric', name: 'Электрика', sortOrder: 5 },
  { key: 'plumbing', name: 'Сантехника', sortOrder: 6 },
  { key: 'finish', name: 'Отделка', sortOrder: 7 },
]
type TrackedContext = WebGLRenderingContext | WebGL2RenderingContext
const button = 'rounded-lg px-3 py-2 text-sm'

export default function House3DDevPage() {
  const [percents, setPercents] = useState<number[]>([100, 60, 30, 50, 25, 50, 0])
  const [mounted, setMounted] = useState(true)
  const [running, setRunning] = useState(false)
  const [reduced, setReduced] = useState(false)
  const selection = useReducer(selectionReducer, initialSelection)
  const [{ selected }, dispatch] = selection
  const [log, setLog] = useState<string[]>([])
  const [contextMetrics, setContextMetrics] = useState({ created: 0, live: 0 })
  const contexts = useRef<TrackedContext[]>([])
  useLayoutEffect(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, options?: unknown) {
      const context = original.call(this, contextId, options as never) as RenderingContext | null
      if ((contextId === 'webgl' || contextId === 'webgl2') && context) contexts.current.push(context as TrackedContext)
      return context as never
    } as HTMLCanvasElement['getContext']
    return () => { HTMLCanvasElement.prototype.getContext = original }
  }, [])
  const stages = useMemo(() => stagesToParts(BASE_STAGES.map((stage, index) => ({ ...stage, percent: percents[index] }))), [percents])
  const snapshot = useCallback((stats: HouseRendererSnapshot) => {
    const live = contexts.current.filter(context => !context.isContextLost()).length
    setContextMetrics({ created: contexts.current.length, live })
    const message = `dispose: geometries=${stats.geometries}, textures=${stats.textures}, programs=${stats.programs}, live WebGL contexts=${live}`
    console.info('[house-3d dev]', message); setLog(previous => [...previous, message])
  }, [])
  const waitForFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  const runCycles = async () => {
    setRunning(true); setLog([])
    for (let cycle = 0; cycle < 20; cycle += 1) {
      setMounted(true); await waitForFrame(); await new Promise(resolve => window.setTimeout(resolve, 120))
      setMounted(false); await waitForFrame(); await new Promise(resolve => window.setTimeout(resolve, 100))
    }
    setRunning(false)
  }
  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{d.badge}</p><h1 className="mt-2 text-2xl font-bold text-slate-900">{d.title}</h1><p className="mt-1 text-sm text-slate-600">{d.note}</p></header>
    <section className="flex flex-wrap gap-2" aria-label={d.presets}>
      <button data-testid="preset-zero" className={`${button} bg-slate-800 text-white`} onClick={() => setPercents(BASE_STAGES.map(() => 0))}>{d.zero}</button>
      <button data-testid="preset-mixed" className={`${button} bg-slate-800 text-white`} onClick={() => setPercents([100, 60, 30, 50, 25, 50, 0])}>{d.mixed}</button>
      <button data-testid="preset-complete" className={`${button} bg-slate-800 text-white`} onClick={() => setPercents(BASE_STAGES.map(() => 100))}>{d.complete}</button>
      <label className={`${button} flex items-center gap-2 border border-slate-400`}><input data-testid="reduced-motion" type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} />{d.reducedMotion}</label>
    </section>
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      {BASE_STAGES.map((stage, index) => <label key={stage.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm"><span>{stage.name}</span><output>{percents[index]}%</output><input className="col-span-2 w-full accent-sky-600" aria-label={d.percentLabel(stage.name)} type="range" min="0" max="100" step="5" value={percents[index]} onChange={event => setPercents(current => current.map((value, i) => i === index ? Number(event.target.value) : value))} /></label>)}
    </section>
    <section className="flex flex-wrap gap-2" aria-label={d.select}>
      <button data-testid="select-none" className={`${button} border border-slate-400`} aria-pressed={selected === null} onClick={() => dispatch({ type: 'clear' })}>{d.none}</button>
      {STAGE_PARTS.map((part, index) => <button key={part} data-testid={`select-${part}`} aria-pressed={selected === part} className={`${button} border border-slate-400 aria-pressed:bg-slate-800 aria-pressed:text-white`} style={{ borderLeft: `4px solid ${STAGE_COLORS[part]}` }}
        onClick={() => dispatch({ type: 'toggle', part })}>{BASE_STAGES[index].name}</button>)}
    </section>
    <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{d.preview}</h2><button data-testid="cycles" disabled={running} onClick={runCycles} className={`${button} border border-sky-700 font-medium text-sky-800 disabled:opacity-50`}>{running ? d.cyclesRunning : d.cycles}</button></div>
      <div className="mx-auto max-w-4xl">{mounted ? <HouseModel key="model" stages={stages} reducedMotion={reduced || undefined} selection={selection} onRendererDispose={snapshot} /> : <p className="rounded-xl bg-slate-100 p-6 text-center text-sm text-slate-600">{d.unmounted}</p>}</div>
    </section>
    <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">{d.log}</summary><p className="mt-2 text-xs text-slate-600">{d.contexts(contextMetrics.created, contextMetrics.live)}</p><ol className="mt-2 max-h-72 space-y-1 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-green-300">{log.map((entry, index) => <li key={index}>{index + 1}. {entry}</li>)}</ol></details>
  </main>
}
