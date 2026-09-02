import { useState } from 'react'
import { useStageHistory } from '../hooks/useStageHistory'
import { formatDateTimeSmart } from '../lib/format'
import { Spinner } from './Spinner'
import { ErrorMessage } from './ErrorMessage'

interface StageHistoryPanelProps {
  projectStageId: string
  /** Changes on every successful edit so an open panel refetches. */
  refreshToken: number
}

/** Collapsible list of the last 5 changes to a stage. Fetches lazily on open. */
export function StageHistoryPanel({ projectStageId, refreshToken }: StageHistoryPanelProps) {
  const [open, setOpen] = useState(false)
  const { entries, loading, error } = useStageHistory(projectStageId, open, refreshToken)

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        История изменений
      </button>

      {open ? (
        <div className="mt-2">
          {loading ? (
            <Spinner label="Загрузка истории…" />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : entries.length === 0 ? (
            <p className="text-xs text-slate-400">Изменений пока не было.</p>
          ) : (
            <ul className="space-y-1.5">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span className="tabular-nums text-slate-700">
                    {entry.oldPercent}% → {entry.newPercent}%
                  </span>
                  <span className="text-slate-500">
                    {entry.changedByName ?? 'Неизвестно'}
                  </span>
                  <span className="text-slate-400">
                    {formatDateTimeSmart(entry.changedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
