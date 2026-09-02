import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProjectStages } from '../hooks/useProjectStages'
import { StageCard } from '../components/StageCard'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'

const EDITOR_ROLES = new Set(['gc', 'foreman'])

export function Stages() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { stages, loading, error, reload, commitPercent, historyToken } =
    useProjectStages(id)

  const canEdit = profile ? EDITOR_ROLES.has(profile.role) : false

  if (loading) {
    return <Spinner label="Загрузка этапов…" />
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={reload} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Этапы</h2>
        {!canEdit ? (
          <span className="text-xs text-slate-400">Только просмотр</span>
        ) : null}
      </div>

      <ul className="space-y-3">
        {stages.map((stage) => (
          <StageCard
            key={stage.id}
            stage={stage}
            canEdit={canEdit}
            onCommit={commitPercent}
            historyToken={historyToken}
          />
        ))}
      </ul>
    </div>
  )
}
