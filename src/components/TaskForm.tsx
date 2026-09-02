import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProjectMembers } from '../hooks/useProjectMembers'
import { useStageOptions } from '../hooks/useStageOptions'
import { createTask } from '../lib/tasks'
import { toErrorMessage } from '../lib/format'
import { Button } from './Button'
import { TextField } from './TextField'
import { ErrorMessage } from './ErrorMessage'

interface TaskFormProps {
  projectId: string
  onCreated: () => void
  onCancel: () => void
}

const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-60'

export function TaskForm({ projectId, onCreated, onCancel }: TaskFormProps) {
  const { user } = useAuth()
  const { members, loading: membersLoading, error: membersError } = useProjectMembers(projectId)
  const { options: stages, loading: stagesLoading } = useStageOptions(projectId)

  const [title, setTitle] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [stageId, setStageId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Укажите название задачи.')
      return
    }
    if (!user) {
      setError('Сессия не найдена. Войдите заново.')
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
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">Новая задача</h2>

      <TextField
        label="Название"
        required
        value={title}
        disabled={busy}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Например: смонтировать опалубку по оси 3"
      />

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Исполнитель</span>
        <select
          value={assignedTo}
          disabled={busy || membersLoading}
          onChange={(e) => setAssignedTo(e.target.value)}
          className={selectClass}
        >
          <option value="">Не назначен</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <ErrorMessage message={membersError} />

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Срок</span>
        <input
          type="date"
          value={deadline}
          disabled={busy}
          onChange={(e) => setDeadline(e.target.value)}
          className={selectClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Этап</span>
        <select
          value={stageId}
          disabled={busy || stagesLoading}
          onChange={(e) => setStageId(e.target.value)}
          className={selectClass}
        >
          <option value="">Без этапа</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <ErrorMessage message={error} />

      <div className="flex gap-2">
        <Button type="submit" loading={busy}>
          Создать задачу
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
