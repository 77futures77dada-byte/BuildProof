import { useParams } from 'react-router-dom'
import { useProjectOverview } from '../hooks/useProjectOverview'
import type { ActiveIssue, OverviewPhoto, StageProgress } from '../hooks/useProjectOverview'
import { ISSUE_PRIORITY_LABELS } from '../types'
import type { IssuePriority } from '../types'
import { formatDate, formatDateTimeSmart } from '../lib/format'
import { ProgressBar } from '../components/ProgressBar'
import { ErrorMessage } from '../components/ErrorMessage'
import { Spinner } from '../components/Spinner'

const PRIORITY_BADGE: Record<IssuePriority, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-600',
}

export function ProjectDashboard() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, error, reload } = useProjectOverview(id)

  if (loading) {
    return <Spinner label="Загрузка объекта…" />
  }

  if (error || !data) {
    return (
      <ErrorMessage
        message={error ?? 'Не удалось загрузить объект.'}
        onRetry={reload}
      />
    )
  }

  const { overallPercent, stages, lastUpdatedAt, photos, activeIssues } = data

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-slate-500">Общая готовность</span>
            <span className="text-2xl font-semibold text-slate-900">{overallPercent}%</span>
          </div>
          <ProgressBar value={overallPercent} className="mt-2" />
          <p className="mt-3 text-xs text-slate-400">
            Последнее обновление: {formatDateTimeSmart(lastUpdatedAt)}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Этапы</h2>
        {stages.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            Этапы по объекту ещё не заведены.
          </p>
        ) : (
          <ul className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {stages.map((stage) => (
              <StageRow key={stage.id} stage={stage} />
            ))}
          </ul>
        )}
      </section>

      {photos.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Последние фото</h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {photos.map((photo) => (
              <PhotoTile key={photo.id} photo={photo} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Активные проблемы</h2>
        {activeIssues.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            Активных проблем нет.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {activeIssues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StageRow({ stage }: { stage: StageProgress }) {
  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-700">{stage.name}</span>
        <span className="tabular-nums text-slate-500">{Math.round(stage.progressPercent)}%</span>
      </div>
      <ProgressBar value={stage.progressPercent} />
    </li>
  )
}

function PhotoTile({ photo }: { photo: OverviewPhoto }) {
  return (
    <li>
      {photo.url ? (
        <img
          src={photo.url}
          alt={photo.caption ?? 'Фото объекта'}
          loading="lazy"
          className="aspect-square w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
          нет превью
        </div>
      )}
    </li>
  )
}

function IssueRow({ issue }: { issue: ActiveIssue }) {
  return (
    <li className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-800">{issue.title}</p>
        {issue.dueDate ? (
          <p className="mt-0.5 text-xs text-slate-400">Срок: {formatDate(issue.dueDate)}</p>
        ) : null}
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[issue.priority]}`}
      >
        {ISSUE_PRIORITY_LABELS[issue.priority]}
      </span>
    </li>
  )
}
