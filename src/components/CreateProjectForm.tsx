import { useState } from 'react'
import type { FormEvent } from 'react'
import { createProjectWithStages } from '../lib/projects'
import { toErrorMessage } from '../lib/format'
import { Button } from './Button'
import { TextField } from './TextField'
import { ErrorMessage } from './ErrorMessage'

interface CreateProjectFormProps {
  companyId: string
  onCreated: (projectId: string) => void
  onCancel: () => void
}

export function CreateProjectForm({ companyId, onCreated, onCancel }: CreateProjectFormProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Укажите название объекта.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const projectId = await createProjectWithStages({ name, address, deadline }, companyId)
      onCreated(projectId)
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">Новый объект</h2>

      <TextField
        label="Название"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        placeholder="ЖК «Северный», корпус 3"
      />
      <TextField
        label="Адрес"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        disabled={submitting}
        placeholder="г. Москва, ул. Примерная, 1"
      />
      <TextField
        label="Дедлайн"
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        disabled={submitting}
        hint="Плановая дата завершения объекта"
      />

      <ErrorMessage message={error} />

      <div className="flex gap-2">
        <Button type="submit" loading={submitting}>
          Создать объект
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Отмена
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        При создании автоматически добавятся 7 этапов с прогрессом 0%.
      </p>
    </form>
  )
}
