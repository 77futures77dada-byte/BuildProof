import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useTasks } from '../hooks/useTasks'
import type { TaskItem } from '../hooks/useTasks'
import { useProjectMembers } from '../hooks/useProjectMembers'
import { useStageOptions } from '../hooks/useStageOptions'
import { useProjectStages } from '../hooks/useProjectStages'
import { isEmailGateOpen } from '../lib/emailGate'
import { Button, Disclosure, NetBar, Sheet, SkeletonRows } from '../components/ui'
import { ErrorMessage } from '../components/ErrorMessage'
import { TaskForm } from '../components/TaskForm'
import { TaskCard } from '../components/TaskCard'
import { StageMarkSheet } from '../components/report/StageMarkSheet'

const MANAGER_ROLES = new Set(['gc', 'foreman'])

/** todo/in_progress by deadline (soonest first, no-deadline last). */
function byDeadline(a: TaskItem, b: TaskItem): number {
  if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
  if (a.deadline) return -1
  if (b.deadline) return 1
  return 0
}

export function Tasks() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  if (profile?.role === 'worker') return <Navigate to={`/project/${id}/today`} replace />
  return <TasksView projectId={id} manager={profile ? MANAGER_ROLES.has(profile.role) : false} />
}

function TasksView({ projectId, manager }: { projectId: string | undefined; manager: boolean }) {
  const { t } = useTranslation()
  const { tasks, loading, error, reload, updateTask } = useTasks(projectId, undefined)
  // Only the manager cards use these; skip the queries for clients.
  const { members } = useProjectMembers(manager ? projectId : undefined)
  const { options: stageOptions } = useStageOptions(manager ? projectId : undefined)
  const { stages, commitPercent } = useProjectStages(manager ? projectId : undefined)

  const [showForm, setShowForm] = useState(false)
  const [markStageId, setMarkStageId] = useState<string | null>(null)
  const marking = stages.find((s) => s.id === markStageId) ?? null

  const active = tasks.filter((x) => x.status !== 'done').sort(byDeadline)
  const done = tasks.filter((x) => x.status === 'done')
  const variant = manager ? 'manager' : 'readonly'

  const card = (task: TaskItem) => (
    <TaskCard
      key={task.id}
      task={task}
      variant={variant}
      members={members}
      stages={stageOptions}
      onUpdate={updateTask}
      onCompletedWithStage={(x) => setMarkStageId(x.projectStageId)}
    />
  )

  return (
    <section className="flex flex-col gap-4">
      <NetBar />
      <h2 className="m-0 text-h2 font-semibold text-fg">{t('tasks.title')}</h2>
      {manager ? (
        <Button variant="primary" block onClick={() => setShowForm(true)} className="sm:w-auto sm:self-start">{t('tasks.create')}</Button>
      ) : null}

      {loading ? (
        <SkeletonRows label={t('tasks.loading')} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : tasks.length === 0 ? (
        <p className="m-0 rounded-card border-2 border-dashed border-line p-5 text-body text-fg">
          {!manager ? t('tasks.noActive') : isEmailGateOpen() ? t('tasks.empty') : t('tasks.emptyClosed')}
        </p>
      ) : (
        <>
          {active.length > 0 ? (
            <ul className="m-0 flex flex-col gap-3 p-0">{active.map(card)}</ul>
          ) : (
            <p className="m-0 text-body text-fg">{t('tasks.noActive')}</p>
          )}
          {done.length > 0 ? (
            <Disclosure label={t('tasks.completed', { count: done.length })}>
              <ul className="m-0 flex flex-col gap-3 p-0">{done.map(card)}</ul>
            </Disclosure>
          ) : null}
        </>
      )}

      <Sheet open={manager && showForm} onClose={() => setShowForm(false)} title={t('tasks.formHeading')} history name="task-form">
        {projectId ? (
          <TaskForm projectId={projectId} onCancel={() => setShowForm(false)} onCreated={() => { setShowForm(false); reload() }} />
        ) : null}
      </Sheet>

      <StageMarkSheet stage={marking} onClose={() => setMarkStageId(null)} onSave={commitPercent} />
    </section>
  )
}
