import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('createProject.nameRequired'))
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
      <h2 className="text-base font-semibold text-slate-900">{t('createProject.heading')}</h2>

      <TextField
        label={t('createProject.name')}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        placeholder={t('createProject.namePlaceholder')}
      />
      <TextField
        label={t('createProject.address')}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        disabled={submitting}
        placeholder={t('createProject.addressPlaceholder')}
      />
      <TextField
        label={t('createProject.deadline')}
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        disabled={submitting}
        hint={t('createProject.deadlineHint')}
      />

      <ErrorMessage message={error} />

      <div className="flex gap-2">
        <Button type="submit" loading={submitting}>
          {t('createProject.submit')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        {t('createProject.stagesHint')}
      </p>
    </form>
  )
}
