import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { createIssue } from '../lib/issues'
import { toErrorMessage } from '../lib/format'
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

/**
 * «Сообщить о проблеме», built for a phone on site: photo, one line
 * «Что случилось», urgent / not urgent, «Отправить». Everything else sits
 * under «Ещё»; responsible party and deadline only for the owner/foreman, who
 * manage issues. Urgent → priority `high`, not urgent → `medium`.
 */
export function IssueForm({ projectId, onCreated, onCancel }: IssueFormProps) {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const manages = profile?.role === 'gc' || profile?.role === 'foreman'

  const [title, setTitle] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [description, setDescription] = useState('')
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
        priority: urgent ? 'high' : 'medium',
        responsibleParty: manages ? responsibleParty : '',
        dueDate: manages && dueDate ? dueDate : null,
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

  const choice = (active: boolean, tone: 'red' | 'sky') =>
    `flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 px-3 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-600 ${
      active
        ? tone === 'red'
          ? 'border-red-600 bg-red-50 text-red-800'
          : 'border-sky-600 bg-sky-50 text-sky-900'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
    }`

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">{t('issues.formHeading')}</h2>

      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{t('issues.photo')}</span>
        <ImagePicker onChange={setFile} disabled={busy} />
      </div>

      <TextField
        label={t('issues.titleField')}
        required
        value={title}
        disabled={busy}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('issues.titlePlaceholder')}
      />

      <fieldset disabled={busy}>
        <legend className="mb-1 text-sm font-medium text-slate-700">{t('issues.urgency')}</legend>
        <div className="flex gap-2">
          <label className={choice(urgent, 'red')}>
            <input type="radio" name="urgency" className="sr-only" checked={urgent} onChange={() => setUrgent(true)} />
            {t('issues.urgent')}
          </label>
          <label className={choice(!urgent, 'sky')}>
            <input type="radio" name="urgency" className="sr-only" checked={!urgent} onChange={() => setUrgent(false)} />
            {t('issues.notUrgent')}
          </label>
        </div>
      </fieldset>

      <details className="rounded-lg border border-slate-200 px-3 py-2">
        <summary className="flex min-h-8 cursor-pointer items-center text-sm font-medium text-slate-600">
          {t('issues.more')}
        </summary>
        <div className="mt-3 space-y-4">
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
          {manages ? (
            <>
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
            </>
          ) : null}
        </div>
      </details>

      <ErrorMessage message={error} />

      <div className="flex gap-2">
        <Button type="submit" loading={busy} className="min-h-12 flex-1">
          {t('issues.submit')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy} className="min-h-12">
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
