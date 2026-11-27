import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { entries, loading, error } = useStageHistory(projectStageId, open, refreshToken)

  return (
    <div className="text-body text-fg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-12 items-center gap-2 rounded-control px-1 text-field font-medium text-fg underline underline-offset-4 hover:no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" className={open ? 'rotate-90' : undefined}>
          <path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t('stages.history')}
      </button>

      {open ? (
        <div className="mt-2">
          {loading ? (
            <Spinner label={t('stages.historyLoading')} />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : entries.length === 0 ? (
            <p className="m-0">{t('stages.historyEmpty')}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3">
                  <span className="num-col inline-flex items-center gap-1 font-medium">
                    {entry.oldPercent}%
                    <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
                      <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {entry.newPercent}%
                  </span>
                  <span>
                    {entry.changedByName ?? t('stages.unknownUser')}
                  </span>
                  <span className="num-col">
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
