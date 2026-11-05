import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { PHOTO_MAX_EDGE } from '../lib/image'
import { useAuth } from '../hooks/useAuth'
import { createIssue } from '../lib/issues'
import { toErrorMessage } from '../lib/format'
import type { IssuePriority } from '../types'
import { Button } from './Button'
import { TextField } from './TextField'
import { ErrorMessage } from './ErrorMessage'
import { ImagePicker } from './ImagePicker'

interface IssueFormProps {
  projectId: string
  onCreated: () => void
  onCancel: () => void
}

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200'

const PRIORITIES: IssuePriority[] = ['low', 'medium', 'high']

export function IssueForm({ projectId, onCreated, onCancel }: IssueFormProps) {
  const { user } = useAuth()
  const { t } = useTranslation()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<IssuePriority>('medium')
  const [responsibleParty, setResponsibleParty] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError(t('issues.titleRequired'))
      return
    }
    if (!user) {
      setError(t('common.sessionMissing'))
      return
    }
    setError(null)
    setBusy(true)
    try {
      await createIssue({
        projectId,
        title,
        description,
        priority,
        responsibleParty,
        dueDate: dueDate || null,
        file,
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
      <h2 className="text-base font-semibold text-slate-900">{t('issues.formHeading')}</h2>

      <TextField
        label={t('issues.titleField')}
        required
        value={title}
        disabled={busy}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('issues.titlePlaceholder')}
      />

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">{t('issues.description')}</span>
        <textarea
          value={description}
          disabled={busy}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={fieldClass}
          placeholder={t('common.optional')}
        />
      </label>

      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{t('issues.photo')}</span>
        <ImagePicker onChange={setFile} disabled={busy} />
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">{t('issues.priority')}</span>
        <select
          value={priority}
          disabled={busy}
          onChange={(e) => setPriority(e.target.value as IssuePriority)}
          className={fieldClass}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {t(`issuePriority.${p}`)}
            </option>
          ))}
        </select>
      </label>

      <TextField
        label={t('issues.responsible')}
        value={responsibleParty}
        disabled={busy}
        onChange={(e) => setResponsibleParty(e.target.value)}
        placeholder={t('issues.responsiblePlaceholder')}
      />

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">{t('issues.dueDate')}</span>
        <input
          type="date"
          value={dueDate}
          disabled={busy}
          onChange={(e) => setDueDate(e.target.value)}
          className={fieldClass}
        />
      </label>

      <ErrorMessage message={error} />

      <div className="flex gap-2">
        <Button type="submit" loading={busy}>
          {t('issues.create')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        {t('common.photoResizeHint', { size: PHOTO_MAX_EDGE })}
      </p>
    </form>
  )
}
