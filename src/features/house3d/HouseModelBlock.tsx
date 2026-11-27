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
function StageListFallback({ stages, loading, compact }: { stages: MappedStage[]; loading: boolean; compact?: boolean }) {
  return <div className="overflow-hidden rounded-2xl border border-inverse-line text-on-inverse" style={{ background: HOUSE_BG }}>
    {loading
      ? <div className="house3d-canvas flex items-center justify-center text-body text-on-inverse" role="status">{t.loading}</div>
      : <p className="p-4 pb-0 text-body text-on-inverse" role="status">{t.fallback}</p>}
    {compact ? null : <div className="p-4"><StageRows stages={stages} /></div>}
  </div>
}

/** `compact`: overview variant B (model in the middle column, the stage list is its own column). */
export function HouseModelBlock({ stages, compact = false }: { stages: HouseStage[]; compact?: boolean }) {
  if (!stages.length) return <section className="space-y-3"><h2 className="text-body font-medium text-fg">{t.title}</h2><p className="rounded-xl border border-line bg-on-inverse p-4 text-body text-fg">{t.empty}</p></section>
  const mapped = stagesToParts(stages)
  return <section className="space-y-3"><h2 className="text-body font-medium text-fg">{t.title}</h2>
    <ModelBoundary fallback={<StageListFallback stages={mapped} loading={false} compact={compact} />}>
      <Suspense fallback={<StageListFallback stages={mapped} loading compact={compact} />}><LazyHouse stages={mapped} compact={compact} /></Suspense>
    </ModelBoundary>
  </section>
}
