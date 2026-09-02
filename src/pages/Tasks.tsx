import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTasks } from '../hooks/useTasks'
import type { TaskItem } from '../hooks/useTasks'
import { useProjectMembers } from '../hooks/useProjectMembers'
import { useStageOptions } from '../hooks/useStageOptions'
import { Button } from '../components/Button'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { Modal } from '../components/Modal'
import { TaskForm } from '../components/TaskForm'
import { TaskCard } from '../components/TaskCard'
import { PhotoUploadForm } from '../components/PhotoUploadForm'

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
  const { profile, user } = useAuth()

  const role = profile?.role
  const isManager = role ? MANAGER_ROLES.has(role) : false
  const isWorker = role === 'worker'
  const cardVariant = isManager ? 'manager' : isWorker ? 'worker' : 'readonly'

  const { tasks, loading, error, reload, updateTask } = useTasks(
    id,
    isWorker ? user?.id : undefined,
  )
  // Only the manager cards use these; skip the queries for workers/clients.
  const { members } = useProjectMembers(isManager ? id : undefined)
  const { options: stages } = useStageOptions(isManager ? id : undefined)

  const [showForm, setShowForm] = useState(false)
  const [photoTask, setPhotoTask] = useState<TaskItem | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)

  const active = tasks.filter((t) => t.status !== 'done').sort(byDeadline)
  const done = tasks.filter((t) => t.status === 'done')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">
          {isWorker ? 'Мои задачи' : 'Задачи'}
        </h2>
        {isManager && !showForm ? (
          <Button onClick={() => setShowForm(true)}>Создать задачу</Button>
        ) : null}
      </div>

      {isManager && showForm && id ? (
        <TaskForm
          projectId={id}
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false)
            reload()
          }}
        />
      ) : null}

      {loading ? (
        <Spinner label="Загрузка задач…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : tasks.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          {isWorker ? 'На вас пока нет задач.' : 'Задач по объекту пока нет.'}
        </p>
      ) : (
        <>
          {active.length > 0 ? (
            <ul className="space-y-3">
              {active.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  variant={cardVariant}
                  members={members}
                  stages={stages}
                  onUpdate={updateTask}
                  onCompletedWithStage={setPhotoTask}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Активных задач нет.</p>
          )}

          {done.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setDoneOpen((v) => !v)}
                aria-expanded={doneOpen}
                className="flex w-full items-center gap-1 px-4 py-3 text-sm font-medium text-slate-600"
              >
                <span aria-hidden="true">{doneOpen ? '▾' : '▸'}</span>
                Завершённые ({done.length})
              </button>
              {doneOpen ? (
                <ul className="space-y-3 border-t border-slate-100 p-3">
                  {done.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      variant={cardVariant}
                      members={members}
                      stages={stages}
                      onUpdate={updateTask}
                      onCompletedWithStage={setPhotoTask}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={photoTask !== null}
        onClose={() => setPhotoTask(null)}
        label="Прикрепить фото к задаче"
      >
        {photoTask?.projectStageId && id ? (
          <PhotoUploadForm
            projectId={id}
            fixedStageId={photoTask.projectStageId}
            heading="Фото к задаче"
            onCancel={() => setPhotoTask(null)}
            onUploaded={() => setPhotoTask(null)}
          />
        ) : null}
      </Modal>
    </div>
  )
}
