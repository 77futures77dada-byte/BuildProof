import { X } from 'lucide-react'
import { formatDate } from '../../lib/format'
import { STAGE_COLORS } from './palette'
import { elementUnits, houseStrings as t } from './strings'
import type { MappedStage, StagePart } from './types'

export interface StageCounts { done: number; total: number }

const stateLabel = (percent: number) => (percent >= 100 ? t.ready : percent > 0 ? t.working : t.notStarted)

/** Details of the selected stage; without one, a short hint and the overall count. */
export function StageCard({ stage, part, counts, doneStages, totalStages, onClose }: {
  stage: MappedStage | null; part: StagePart | null; counts: StageCounts | null
  doneStages: number; totalStages: number; onClose: () => void
}) {
  if (!stage || !part) return <div className="space-y-2 text-sm text-slate-300">
    <p className="font-semibold text-white">{t.doneStages(doneStages, totalStages)}</p>
    <p>{t.hint}</p>
  </div>
  const color = STAGE_COLORS[part], percent = Math.round(stage.percent), unit = elementUnits[part]
  return <div className="space-y-3">
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-xl font-semibold leading-tight" style={{ color }}>{stage.name}</h3>
      <button type="button" onClick={onClose} aria-label={t.clearSelection}
        className="-m-1 rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"><X className="size-4" aria-hidden /></button>
    </div>
    <p className="flex items-baseline gap-2"><span className="text-4xl font-bold tabular-nums text-white">{percent}%</span><span className="text-sm text-slate-300">{stateLabel(percent)}</span></p>
    <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={stage.name}>
      <div className="h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${percent}%`, background: color }} />
    </div>
    {unit && counts ? <p className="text-sm text-slate-200">{unit}: <span className="font-semibold tabular-nums text-white">{t.countOf(counts.done, counts.total)}</span></p> : null}
    {stage.updatedAt ? <p className="text-xs text-slate-400">{t.updated} {formatDate(stage.updatedAt)}</p> : null}
  </div>
}
