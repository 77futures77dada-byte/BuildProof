import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useTasks } from '../hooks/useTasks'
import type { TaskItem } from '../hooks/useTasks'
import { useProjectStages } from '../hooks/useProjectStages'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { Modal } from '../components/Modal'
import { ProgressBar } from '../components/ProgressBar'
import { TaskCard } from '../components/TaskCard'
import { PhotoUploadForm } from '../components/PhotoUploadForm'

/** In-progress first, then by deadline (soonest first, no-deadline last). */
function byUrgency(a: TaskItem, b: TaskItem): number {
  if (a.status !== b.status) return a.status === 'in_progress' ? -1 : 1
  if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
  if (a.deadline) return -1
  if (b.deadline) return 1
  return 0
}

/**
 * Worker's landing screen ("My day"): overall progress, one primary report
 * action and their own open tasks as large touch targets.
 */
export function Today() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const stages = useProjectStages(id)
  const { tasks, loading, error, reload, updateTask } = useTasks(id, user?.id)
  const [photoTask, setPhotoTask] = useState<TaskItem | null>(null)

  const overallPercent =
    stages.stages.length > 0
      ? Math.round(
          stages.stages.reduce((sum, s) => sum + s.progressPercent, 0) / stages.stages.length,
        )
      : 0

  // Only workers have this tab; anyone else lands on the overview.
  if (profile && profile.role !== 'worker') return <Navigate to={`/project/${id}`} replace />

  const active = tasks.filter((t) => t.status !== 'done').sort(byUrgency)
  const doneCount = tasks.length - active.length

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {stages.loading ? (
          <Spinner label={t('today.loadingProgress')} />
        ) : stages.error ? (
          <ErrorMessage message={stages.error} onRetry={stages.reload} />
        ) : (
          <>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-600">{t('today.overall')}</span>
              <span className="text-3xl font-semibold tabular-nums text-slate-900">
                {overallPercent}%
              </span>
            </div>
            <ProgressBar value={overallPercent} />
          </>
        )}
      </section>

      {/* TODO(A2): open the unified site-report sheet instead of the tab. */}
      <Link
        to={`/project/${id}/stages`}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        <ClipboardCheck className="size-5" aria-hidden="true" />
        {t('today.report')}
      </Link>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">{t('today.myTasks')}</h2>

        {loading ? (
          <Spinner label={t('tasks.loading')} />
        ) : error ? (
          <ErrorMessage message={error} onRetry={reload} />
        ) : active.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            {doneCount > 0 ? t('today.allDone') : t('today.noTasks')}
          </p>
        ) : (
          <ul className="space-y-3">
            {active.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                variant="worker"
                members={[]}
                stages={[]}
                onUpdate={updateTask}
                onCompletedWithStage={setPhotoTask}
              />
            ))}
          </ul>
        )}

        {!loading && !error && doneCount > 0 ? (
          <p className="text-sm text-slate-500">{t('today.doneCount', { count: doneCount })}</p>
        ) : null}
      </section>

      <Modal
        open={photoTask !== null}
        onClose={() => setPhotoTask(null)}
        label={t('tasks.attachPhoto')}
      >
        {photoTask?.projectStageId && id ? (
          <PhotoUploadForm
            projectId={id}
            fixedStageId={photoTask.projectStageId}
            heading={t('tasks.photoHeading')}
            onCancel={() => setPhotoTask(null)}
            onUploaded={() => setPhotoTask(null)}
          />
        ) : null}
      </Modal>
    </div>
  )
}
