import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProjectOverview } from '../hooks/useProjectOverview'
import type {
  ActiveIssue,
  OverviewPhoto,
  ProjectOverview,
  StageProgress,
} from '../hooks/useProjectOverview'
import { ISSUE_PRIORITY_LABELS } from '../types'
import type { IssuePriority, UserRole } from '../types'
import type { FreshnessLevel } from '../lib/format'
import { formatDate, getUpdateFreshness } from '../lib/format'
import { ProgressBar } from '../components/ProgressBar'
import { ErrorMessage } from '../components/ErrorMessage'
import { Spinner } from '../components/Spinner'
import { Modal } from '../components/Modal'
import { PhotoUploadForm } from '../components/PhotoUploadForm'
import { TaskForm } from '../components/TaskForm'
import { IssueForm } from '../components/IssueForm'
import { StageActionButtons } from '../components/StageActionButtons'
import type { StageActionCapabilities, StageActionKind } from '../components/StageActionButtons'

const PRIORITY_BADGE: Record<IssuePriority, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-600',
}

const FRESHNESS_DOT: Record<FreshnessLevel, string> = {
  fresh: 'bg-green-500',
  stale: 'bg-amber-500',
  old: 'bg-red-500',
}

const linkButtonClass =
  'inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700'

function capabilitiesFor(role: UserRole | undefined): StageActionCapabilities {
  return {
    photo: role === 'gc' || role === 'foreman' || role === 'worker',
    task: role === 'gc' || role === 'foreman',
    issue: role === 'gc' || role === 'foreman',
  }
}

export function ProjectDashboard() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { data, loading, error, reload } = useProjectOverview(id)

  if (loading) {
    return <Spinner label="Загрузка объекта…" />
  }

  if (error || !data) {
    return <ErrorMessage message={error ?? 'Не удалось загрузить объект.'} onRetry={reload} />
  }

  return (
    <ProjectDashboardView
      data={data}
      projectId={id ?? ''}
      role={profile?.role}
      onChanged={reload}
    />
  )
}

interface StageAction {
  kind: StageActionKind
  stageId: string
  stageName: string
}

export function ProjectDashboardView({
  data,
  projectId,
  role,
  onChanged,
}: {
  data: ProjectOverview
  projectId: string
  role?: UserRole
  onChanged?: () => void
}) {
  const {
    overallPercent,
    stages,
    completedStageCount,
    lastUpdatedAt,
    hasStageHistory,
    photos,
    activeIssues,
  } = data

  const freshness = getUpdateFreshness(lastUpdatedAt)
  const stagesExist = stages.length > 0

  const capabilities = capabilitiesFor(role)
  const rowActionsEnabled = capabilities.photo || capabilities.task || capabilities.issue
  const [action, setAction] = useState<StageAction | null>(null)

  function closeAction() {
    setAction(null)
  }
  function completeAction() {
    setAction(null)
    onChanged?.()
  }

  return (
    <div className="space-y-8">
      {stagesExist ? (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Готовность" value={`${overallPercent}%`} />
            <StatTile
              label="Этапы"
              value={`${completedStageCount} / ${stages.length}`}
              hint="завершено"
            />
            <StatTile
              label="Проблемы"
              value={String(activeIssues.length)}
              hint={activeIssues.length === 1 ? 'открытая' : 'открытых'}
            />
            <StatTile label="Обновлено">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${FRESHNESS_DOT[freshness.level]}`}
                />
                <span className="text-xs font-medium text-slate-900">{freshness.label}</span>
              </span>
            </StatTile>
          </div>

          {!hasStageHistory ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <ProgressBar value={overallPercent} />
              <p className="text-sm text-slate-600">
                Отслеживание прогресса ещё не начато. Отметьте выполнение первого этапа,
                чтобы начать отслеживание.
              </p>
              <Link to={`/project/${projectId}/stages`} className={linkButtonClass}>
                Перейти к этапам
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Этапы</h2>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Этапы по объекту ещё не заведены.</p>
            <Link to={`/project/${projectId}/stages`} className={linkButtonClass}>
              Перейти к этапам
            </Link>
          </div>
        </section>
      )}

      {stagesExist ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Этапы</h2>
          <ul className="space-y-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
            {stages.map((stage) => (
              <StageRow
                key={stage.id}
                stage={stage}
                capabilities={rowActionsEnabled ? capabilities : null}
                onAction={(kind) =>
                  setAction({ kind, stageId: stage.id, stageName: stage.name })
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

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

      <Modal
        open={action !== null}
        onClose={closeAction}
        label={
          action?.kind === 'photo'
            ? 'Добавить фото'
            : action?.kind === 'task'
              ? 'Создать задачу'
              : 'Отметить проблему'
        }
      >
        {action?.kind === 'photo' ? (
          <PhotoUploadForm
            projectId={projectId}
            fixedStageId={action.stageId}
            heading={`Фото · ${action.stageName}`}
            onUploaded={completeAction}
            onCancel={closeAction}
          />
        ) : null}
        {action?.kind === 'task' ? (
          <TaskForm
            projectId={projectId}
            defaultStageId={action.stageId}
            onCreated={completeAction}
            onCancel={closeAction}
          />
        ) : null}
        {action?.kind === 'issue' ? (
          <IssueForm projectId={projectId} onCreated={completeAction} onCancel={closeAction} />
        ) : null}
      </Modal>
    </div>
  )
}

function StatTile({
  label,
  value,
  hint,
  children,
}: {
  label: string
  value?: string
  hint?: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1">
        {children ?? (
          <p className="text-lg font-semibold text-slate-900">
            {value}
            {hint ? (
              <span className="ml-1 text-xs font-normal text-slate-400">{hint}</span>
            ) : null}
          </p>
        )}
      </div>
    </div>
  )
}

function StageRow({
  stage,
  capabilities,
  onAction,
}: {
  stage: StageProgress
  capabilities: StageActionCapabilities | null
  onAction: (kind: StageActionKind) => void
}) {
  return (
    <li className="group -mx-1 space-y-1.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-slate-50 sm:px-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 text-slate-700">{stage.name}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="tabular-nums text-slate-500">
            {Math.round(stage.progressPercent)}%
          </span>
          {capabilities ? (
            <StageActionButtons
              stageName={stage.name}
              capabilities={capabilities}
              onAction={onAction}
            />
          ) : null}
        </div>
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
