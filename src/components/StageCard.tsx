import { stageLabel } from '../i18n/stageLabel'
import type { EditableStage } from '../hooks/useProjectStages'
import { ProgressBar } from './ui'
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
    <li className="flex list-none flex-col gap-3 rounded-card border border-line bg-surface p-4 text-fg shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 min-w-0 text-h3 font-medium [overflow-wrap:anywhere]">{stageLabel(stage.name)}</h3>
        {!canEdit ? (
          <span className="shrink-0 text-h3 font-medium">
            {Math.round(stage.progressPercent)}%
          </span>
        ) : null}
      </div>

      {canEdit ? (
        <StageProgressControl
          value={stage.progressPercent}
          label={stageLabel(stage.name)}
          onCommit={(percent) => onCommit(stage.id, percent)}
        />
      ) : (
        <ProgressBar value={stage.progressPercent} />
      )}

      <StageHistoryPanel projectStageId={stage.id} refreshToken={historyToken} />
    </li>
  )
}
