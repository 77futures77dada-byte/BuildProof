import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { HouseModel } from './HouseModel'
import { stagesToParts } from './stagesToParts'
import type { HouseRendererSnapshot } from './types'

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

export default function House3DDevPage() {
  const [percents, setPercents] = useState<number[]>(BASE_STAGES.map(() => 0))
  const [mounted, setMounted] = useState(true)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [contextMetrics, setContextMetrics] = useState({ created: 0, live: 0 })
  const contexts = useRef<TrackedContext[]>([])
  const originalGetContext = useRef<HTMLCanvasElement['getContext'] | null>(null)

  useLayoutEffect(() => {
    const original = HTMLCanvasElement.prototype.getContext
    originalGetContext.current = original
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, options?: unknown) {
      const context = original.call(this, contextId, options as never) as RenderingContext | null
      if ((contextId === 'webgl' || contextId === 'webgl2') && context) {
        contexts.current.push(context as TrackedContext)
      }
      return context as never
    } as HTMLCanvasElement['getContext']
    return () => { HTMLCanvasElement.prototype.getContext = original }
  }, [])

  const stages = useMemo(() => stagesToParts(BASE_STAGES.map((stage, index) => ({ ...stage, percent: percents[index] }))), [percents])
  const snapshot = useCallback((stats: HouseRendererSnapshot) => {
    const liveContexts = contexts.current.filter(context => !context.isContextLost()).length
    setContextMetrics({ created: contexts.current.length, live: liveContexts })
    const message = `dispose: geometries=${stats.geometries}, textures=${stats.textures}, programs=${stats.programs}, live WebGL contexts=${liveContexts}`
    console.info('[house-3d dev]', message)
    setLog(previous => [...previous, message])
  }, [])

  const waitForFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  const runCycles = async () => {
    setRunning(true)
    setLog([])
    for (let cycle = 0; cycle < 20; cycle += 1) {
      setMounted(true)
      await waitForFrame()
      await new Promise(resolve => window.setTimeout(resolve, 120))
      setMounted(false)
      await waitForFrame()
      await new Promise(resolve => window.setTimeout(resolve, 100))
    }
    setRunning(false)
  }

  const setPreset = (values: number[]) => setPercents(values)
  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-sky-700">DEV · Локальная демонстрация</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Проверка модели дома</h1><p className="mt-1 text-sm text-slate-600">Только тестовые значения. Страница не обращается к Supabase и не входит в production-сборку.</p></header>
    <section className="flex flex-wrap gap-2" aria-label="Наборы процентов">
      <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white" onClick={() => setPreset(BASE_STAGES.map(() => 0))}>Все этапы 0%</button>
      <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white" onClick={() => setPreset([100,60,0,50,0,0,0])}>Смешанный прогресс</button>
      <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white" onClick={() => setPreset(BASE_STAGES.map(() => 100))}>Все этапы 100%</button>
    </section>
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      {BASE_STAGES.map((stage, index) => <label key={stage.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm"><span>{stage.name}</span><output>{percents[index]}%</output><input className="col-span-2 w-full accent-sky-600" aria-label={`${stage.name} percent`} type="range" min="0" max="100" step="5" value={percents[index]} onChange={event => setPercents(current => current.map((value, i) => i === index ? Number(event.target.value) : value))} /></label>)}
    </section>
    <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Предпросмотр</h2><button disabled={running} onClick={runCycles} className="rounded-lg border border-sky-700 px-3 py-2 text-sm font-medium text-sky-800 disabled:opacity-50">{running ? 'Идёт проверка…' : 'mount/unmount ×20'}</button></div>
      <div className="mx-auto max-w-3xl">{mounted ? <HouseModel key="model" stages={stages} height={310} interactive={false} onRendererDispose={snapshot} /> : <p className="rounded-xl bg-slate-100 p-6 text-center text-sm text-slate-600">Модель размонтирована</p>}</div>
    </section>
    <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">Журнал освобождения ресурсов</summary><p className="mt-2 text-xs text-slate-600">Количество отслеженных context объектов: {contextMetrics.created}; живые: {contextMetrics.live}</p><ol className="mt-2 max-h-72 space-y-1 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-green-300">{log.map((entry, index) => <li key={index}>{index + 1}. {entry}</li>)}</ol></details>
  </main>
}
