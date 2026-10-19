import { Component, Suspense, lazy } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { HouseStage } from './types'
import { stagesToParts } from './stagesToParts'
import { houseStrings as t } from './strings'

const LazyHouse = lazy(() => import('./HouseModel').then(module => ({ default: module.HouseModel })))

class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Keep the dashboard available when WebGL fails. */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function StageList({ stages }: { stages: HouseStage[] }) {
  return <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-600">{t.fallback}</p><ul className="space-y-3">{stages.map(stage => <li key={stage.key}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{stage.name}</span><span>{Math.round(Math.max(0, Math.min(100, stage.percent)))}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-600" style={{width:`${Math.max(0,Math.min(100,stage.percent))}%`}} /></div></li>)}</ul></div>
}

export function HouseModelBlock({ stages }: { stages: HouseStage[] }) {
  if (!stages.length) return <section className="space-y-3"><h2 className="text-sm font-semibold text-slate-700">{t.title}</h2><p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">{t.empty}</p></section>
  const mapped = stagesToParts(stages)
  return <section className="space-y-3"><h2 className="text-sm font-semibold text-slate-700">{t.title}</h2><ModelBoundary fallback={<StageList stages={stages} />}><Suspense fallback={<StageList stages={stages} />}><LazyHouse stages={mapped} /></Suspense></ModelBoundary></section>
}
