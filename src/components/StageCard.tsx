import type { EditableStage } from '../hooks/useProjectStages'
import { ProgressBar } from './ProgressBar'
import { StageProgressControl } from './StageProgressControl'
import { StageHistoryPanel } from './StageHistoryPanel'

interface StageCardProps {
  stage: EditableStage
  canEdit: boolean
  onCommit: (stageId: string, newPercent: number) => Promise<void>
  historyToken: number
}

export function StageCard({ stage, canEdit, onCommit, historyToken }: StageCardProps) {
  return (
    <li className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-slate-900">{stage.name}</h3>
        {!canEdit ? (
          <span className="text-sm tabular-nums text-slate-500">
            {Math.round(stage.progressPercent)}%
          </span>
        ) : null}
      </div>

      {canEdit ? (
        <StageProgressControl
          value={stage.progressPercent}
          label={stage.name}
          onCommit={(percent) => onCommit(stage.id, percent)}
        />
      ) : (
        <ProgressBar value={stage.progressPercent} />
      )}

      <StageHistoryPanel projectStageId={stage.id} refreshToken={historyToken} />
    </li>
  )
}
