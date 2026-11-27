import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { createProjectWithStages } from '../lib/projects'
import { toErrorMessage } from '../lib/format'
import { Button, TextField } from './ui'
import { ErrorMessage } from './ErrorMessage'

interface CreateProjectFormProps {
  companyId: string
  onCreated: (projectId: string) => void
  onCancel: () => void
}

/** 03 §4.2 `create-project`: name (required), address, deadline; hints under labels, no placeholders. */
export function CreateProjectForm({ companyId, onCreated, onCancel }: CreateProjectFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError(t('createProject.nameRequired'))
      return
    }
    setNameError(null)
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
      noValidate
      className="flex flex-col gap-4 rounded-card border-2 border-line bg-surface p-4 shadow-card"
    >
      <h2 className="m-0 text-h2 font-semibold text-fg">{t('createProject.heading')}</h2>

      <TextField
        label={t('createProject.name')}
        hint={t('createProject.namePlaceholder')}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        error={nameError}
      />
      <TextField
        label={t('createProject.address')}
        hint={t('createProject.addressPlaceholder')}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        disabled={submitting}
      />
      <TextField
        label={t('createProject.deadline')}
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        disabled={submitting}
        hint={t('createProject.deadlineHint')}
      />
      <p className="m-0 text-body text-fg">{t('createProject.stagesHint')}</p>

      <ErrorMessage message={error} />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting}>
          {t('createProject.submit')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
