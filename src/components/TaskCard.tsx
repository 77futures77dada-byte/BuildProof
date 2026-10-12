import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { stageLabel } from '../i18n/stageLabel'
import type { ProjectMember } from '../hooks/useProjectMembers'
import type { StageOption } from '../hooks/useStageOptions'
import type { TaskItem, TaskPatch } from '../hooks/useTasks'
import type { TaskStatus } from '../types'
import { formatDate, toErrorMessage } from '../lib/format'
import { Button } from './Button'
import { ErrorMessage } from './ErrorMessage'

type Variant = 'worker' | 'manager' | 'readonly'

interface TaskCardProps {
  task: TaskItem
  variant: Variant
  members: ProjectMember[]
  stages: StageOption[]
  onUpdate: (id: string, patch: TaskPatch) => Promise<void>
  /** Called after a worker marks a stage-linked task done, to offer a photo. */
  onCompletedWithStage: (task: TaskItem) => void
}

const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

function metaLine(task: TaskItem, variant: Variant, t: TFunction): string {
  const parts = [t('common.due', { date: formatDate(task.deadline) })]
  if (task.stageName) parts.push(stageLabel(task.stageName))
  // The manager view shows the assignee as an editable dropdown instead.
  if (variant !== 'manager') parts.push(task.assigneeName ?? t('tasks.noAssignee'))
  return parts.join(' · ')
}

const STATUS_BADGE: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-sky-100 text-sky-800',
  done: 'bg-green-100 text-green-800',
}

const controlClass =
  'w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-60 sm:w-auto'

const controlLabelClass = 'flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-1.5'

export function TaskCard({
  task,
  variant,
  members,
  stages,
  onUpdate,
  onCompletedWithStage,
}: TaskCardProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <li className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className={`font-medium text-slate-900 ${variant === 'worker' ? 'text-base' : ''}`}>
          {task.title}
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[task.status]}`}
        >
          {t(`taskStatus.${task.status}`)}
        </span>
      </div>

      <p className="text-xs text-slate-500">{metaLine(task, variant, t)}</p>

      {variant === 'worker' ? (
        // Workers tap these on a phone on site — keep them ≥56px tall, full width.
        <div className="flex gap-2">
          {task.status === 'todo' ? (
            <Button
              loading={busy}
              className="min-h-14 w-full text-base"
              onClick={() => void apply({ status: 'in_progress' })}
            >
              {t('tasks.start')}
            </Button>
          ) : null}
          {task.status === 'in_progress' ? (
            <Button
              loading={busy}
              className="min-h-14 w-full text-base"
              onClick={() => void complete()}
            >
              {t('tasks.finish')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {variant === 'manager' ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className={controlLabelClass}>
            {t('tasks.assignee')}
            <select
              className={controlClass}
              disabled={busy}
              value={task.assignedTo ?? ''}
              onChange={(e) => {
                const id = e.target.value
                void apply({
                  assignedTo: id || null,
                  assigneeName: members.find((m) => m.id === id)?.name || null,
                })
              }}
            >
              <option value="">{t('tasks.unassigned')}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || t('common.noName')}
                </option>
              ))}
            </select>
          </label>

          <label className={controlLabelClass}>
            {t('tasks.status')}
            <select
              className={controlClass}
              disabled={busy}
              value={task.status}
              onChange={(e) => void apply({ status: e.target.value as TaskStatus })}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`taskStatus.${s}`)}
                </option>
              ))}
            </select>
          </label>

          <label className={controlLabelClass}>
            {t('tasks.deadline')}
            <input
              type="date"
              className={controlClass}
              disabled={busy}
              value={task.deadline ?? ''}
              onChange={(e) => void apply({ deadline: e.target.value || null })}
            />
          </label>

          <label className={controlLabelClass}>
            {t('tasks.stage')}
            <select
              className={controlClass}
              disabled={busy}
              value={task.projectStageId ?? ''}
              onChange={(e) => {
                const id = e.target.value
                void apply({
                  projectStageId: id || null,
                  stageName: stages.find((s) => s.id === id)?.name ?? null,
                })
              }}
            >
              <option value="">{t('tasks.noStage')}</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {stageLabel(s.name)}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <ErrorMessage message={error} />
    </li>
  )
}
