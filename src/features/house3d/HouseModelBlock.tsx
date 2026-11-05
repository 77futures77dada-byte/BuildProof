import { Component, Suspense, lazy } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { HouseStage, MappedStage } from './types'
import { stagesToParts } from './stagesToParts'
import { HOUSE_BG } from './palette'
import { StageRows } from './StageRows'
import { houseStrings as t } from './strings'

const LazyHouse = lazy(() => import('./HouseModel').then(module => ({ default: module.HouseModel })))

class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Keep the dashboard available when WebGL or the chunk fails. */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

/** Shown while the 3D chunk loads (placeholder of the canvas height) and when it fails. */
function StageListFallback({ stages, loading }: { stages: MappedStage[]; loading: boolean }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-800 text-white" style={{ background: HOUSE_BG }}>
    {loading
      ? <div className="house3d-canvas flex items-center justify-center text-sm text-slate-300" role="status">{t.loading}</div>
      : <p className="p-4 pb-0 text-sm text-slate-300" role="status">{t.fallback}</p>}
    <div className="p-4"><StageRows stages={stages} /></div>
  </div>
}

export function HouseModelBlock({ stages }: { stages: HouseStage[] }) {
  if (!stages.length) return <section className="space-y-3"><h2 className="text-sm font-semibold text-slate-700">{t.title}</h2><p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">{t.empty}</p></section>
  const mapped = stagesToParts(stages)
  return <section className="space-y-3"><h2 className="text-sm font-semibold text-slate-700">{t.title}</h2>
    <ModelBoundary fallback={<StageListFallback stages={mapped} loading={false} />}>
      <Suspense fallback={<StageListFallback stages={mapped} loading />}><LazyHouse stages={mapped} /></Suspense>
    </ModelBoundary>
  </section>
}
