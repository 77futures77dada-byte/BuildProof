import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { stageLabel } from '../i18n/stageLabel'
import { useAuth } from '../hooks/useAuth'
import { useProjectMembers } from '../hooks/useProjectMembers'
import { useStageOptions } from '../hooks/useStageOptions'
import { createTask } from '../lib/tasks'
import { toErrorMessage } from '../lib/format'
import { Button, FormField, TextField, controlClass } from './ui'
import { ErrorMessage } from './ErrorMessage'

interface TaskFormProps {
  projectId: string
  /** Preselect this stage in the dropdown (still changeable). */
  defaultStageId?: string
  onCreated: () => void
  onCancel: () => void
}

/** task-form (03 §7): name · assignee · stage · deadline · «Создать задачу» · «Отмена». */
export function TaskForm({ projectId, defaultStageId, onCreated, onCancel }: TaskFormProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { members, loading: membersLoading, error: membersError } = useProjectMembers(projectId)
  const { options: stages, loading: stagesLoading } = useStageOptions(projectId)

  const [title, setTitle] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [stageId, setStageId] = useState(defaultStageId ?? '')
  const [busy, setBusy] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setNameError(true)
      return
    }
    if (!user) {
      setError(t('common.sessionMissing'))
      return
    }
    setError(null)
    setBusy(true)
    try {
      await createTask({
        projectId,
        title,
        assignedTo: assignedTo || null,
        deadline: deadline || null,
        projectStageId: stageId || null,
        createdBy: user.id,
      })
      onCreated()
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        label={t('tasks.name')}
        hint={t('tasks.namePlaceholder')}
        error={nameError ? t('tasks.nameRequired') : undefined}
        required
        value={title}
        disabled={busy}
        onChange={(e) => { setTitle(e.target.value); setNameError(false) }}
      />

      <FormField label={t('tasks.assignee')}>
        {(control) => (
          <select {...control} value={assignedTo} disabled={busy || membersLoading} onChange={(e) => setAssignedTo(e.target.value)} className={controlClass}>
            <option value="">{t('tasks.unassigned')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name || t('common.noName')}</option>
            ))}
          </select>
        )}
      </FormField>
      <ErrorMessage message={membersError} />

      <FormField label={t('tasks.stage')}>
        {(control) => (
          <select {...control} value={stageId} disabled={busy || stagesLoading} onChange={(e) => setStageId(e.target.value)} className={controlClass}>
            <option value="">{t('tasks.noStage')}</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{stageLabel(s.name)}</option>
            ))}
          </select>
        )}
      </FormField>

      <TextField
        label={t('tasks.deadline')}
        hint={t('common.optional')}
        type="date"
        value={deadline}
        disabled={busy}
        onChange={(e) => setDeadline(e.target.value)}
      />

      <ErrorMessage message={error} />

      <div className="flex flex-col gap-3">
        <Button type="submit" variant="primary" block loading={busy}>{t('tasks.create')}</Button>
        <Button type="button" variant="secondary" block onClick={onCancel} disabled={busy}>{t('common.cancel')}</Button>
      </div>
    </form>
  )
}
