import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { stageLabel } from '../i18n/stageLabel'
import type { ProjectMember } from '../hooks/useProjectMembers'
import type { StageOption } from '../hooks/useStageOptions'
import type { TaskItem, TaskPatch } from '../hooks/useTasks'
import type { TaskStatus } from '../types'
import { formatDate, toErrorMessage } from '../lib/format'
import { Button, FormField, StatusIcon, controlClass } from './ui'
import { ErrorMessage } from './ErrorMessage'

type Variant = 'worker' | 'manager' | 'readonly'

interface TaskCardProps {
  task: TaskItem
  variant: Variant
  members: ProjectMember[]
  stages: StageOption[]
  onUpdate: (id: string, patch: TaskPatch) => Promise<void>
  /** Called after a stage-linked task is marked done (worker: camera; manager: mark sheet). */
  onCompletedWithStage: (task: TaskItem) => void
}

const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

/** Deadline passed and the task is still open (local date, YYYY-MM-DD). */
function isOverdue(task: TaskItem): boolean {
  if (!task.deadline || task.status === 'done') return false
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return task.deadline < today
}

export function TaskCard({ task, variant, members, stages, onUpdate, onCompletedWithStage }: TaskCardProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const overdue = isOverdue(task)

  async function apply(patch: TaskPatch): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      await onUpdate(task.id, patch)
      return true
    } catch (err) {
      setError(toErrorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function complete() {
    const ok = await apply({ status: 'done' })
    if (ok && task.projectStageId) onCompletedWithStage(task)
  }

  const meta = [
    task.stageName ? stageLabel(task.stageName) : null,
    variant !== 'manager' ? (task.assigneeName ?? t('tasks.noAssignee')) : null,
  ].filter(Boolean).join(' · ')

  return (
    <li className="flex list-none flex-col gap-3 rounded-card border-2 border-line bg-page p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 min-w-0 text-field font-medium text-fg [overflow-wrap:anywhere]">{task.title}</p>
        <span className="inline-flex min-h-8 shrink-0 items-center rounded-chip bg-surface px-3 text-body font-medium text-fg">
          {t(`taskStatus.${task.status}`)}
        </span>
      </div>

      <p className="m-0 flex flex-wrap items-center gap-x-2 text-body font-medium text-fg">
        {overdue ? <StatusIcon kind="stale" /> : null}
        <span className="num-col">{t('common.due', { date: formatDate(task.deadline) })}</span>
        {overdue ? <span>{t('tasks.overdue')}</span> : null}
      </p>
      {meta ? <p className="m-0 text-body text-fg">{meta}</p> : null}

      {variant === 'worker' && task.status !== 'done' ? (
        <Button
          variant="secondary"
          size="main"
          block
          loading={busy}
          onClick={() => void (task.status === 'todo' ? apply({ status: 'in_progress' }) : complete())}
        >
          {task.status === 'todo' ? t('tasks.start') : t('tasks.finish')}
        </Button>
      ) : null}

      {variant === 'manager' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t('tasks.status')}>
            {(control) => (
              <select
                {...control}
                className={controlClass}
                disabled={busy}
                value={task.status}
                onChange={(e) => {
                  const next = e.target.value as TaskStatus
                  if (next === 'done') void complete()
                  else void apply({ status: next })
                }}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`taskStatus.${s}`)}</option>
                ))}
              </select>
            )}
          </FormField>

          <FormField label={t('tasks.assignee')}>
            {(control) => (
              <select
                {...control}
                className={controlClass}
                disabled={busy}
                value={task.assignedTo ?? ''}
                onChange={(e) => {
                  const id = e.target.value
                  void apply({ assignedTo: id || null, assigneeName: members.find((m) => m.id === id)?.name || null })
                }}
              >
                <option value="">{t('tasks.unassigned')}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name || t('common.noName')}</option>
                ))}
              </select>
            )}
          </FormField>

          <FormField label={t('tasks.deadline')}>
            {(control) => (
              <input
                {...control}
                type="date"
                className={controlClass}
                disabled={busy}
                value={task.deadline ?? ''}
                onChange={(e) => void apply({ deadline: e.target.value || null })}
              />
            )}
          </FormField>

          <FormField label={t('tasks.stage')}>
            {(control) => (
              <select
                {...control}
                className={controlClass}
                disabled={busy}
                value={task.projectStageId ?? ''}
                onChange={(e) => {
                  const id = e.target.value
                  void apply({ projectStageId: id || null, stageName: stages.find((s) => s.id === id)?.name ?? null })
                }}
              >
                <option value="">{t('tasks.noStage')}</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{stageLabel(s.name)}</option>
                ))}
              </select>
            )}
          </FormField>
        </div>
      ) : null}

      <ErrorMessage message={error} />
    </li>
  )
}
