import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { createIssue } from '../lib/issues'
import { toErrorMessage } from '../lib/format'
import { Button, Disclosure, FormField, TextField, controlClass, cx } from './ui'
import { ErrorMessage } from './ErrorMessage'
import { ImagePicker } from './ImagePicker'

interface IssueFormProps {
  projectId: string
  onCreated: () => void
  onCancel: () => void
}

/**
 * «Сообщить о проблеме», built for a phone on site (03 §7 issue-form): photo
 * (camera), one line «Что случилось», «Срочно / Не срочно», «Отправить».
 * Everything else sits under «Ещё»; responsible party and deadline only for
 * the owner/foreman. Urgent → priority `high`, not urgent → `medium`.
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
  const [titleError, setTitleError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError(true)
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

  const choice = (on: boolean) => cx(
    'inline-flex min-h-12 flex-1 items-center justify-center rounded-control border-2 px-3 text-field font-semibold',
    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60',
    on ? 'border-fg bg-fg text-page' : 'border-line bg-page text-fg hover:border-fg',
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="m-0 text-field font-medium text-fg">{t('issues.photo')}</p>
        <ImagePicker onChange={setFile} disabled={busy} camera />
      </div>

      <TextField
        label={t('issues.titleField')}
        hint={t('issues.titlePlaceholder')}
        error={titleError ? t('issues.titleRequired') : undefined}
        required
        value={title}
        disabled={busy}
        onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
      />

      <div role="group" aria-label={t('issues.urgency')} className="flex flex-col gap-1.5">
        <p className="m-0 text-field font-medium text-fg">{t('issues.urgency')}</p>
        <div className="flex gap-3">
          <button type="button" aria-pressed={urgent} disabled={busy} onClick={() => setUrgent(true)} className={choice(urgent)}>{t('issues.urgent')}</button>
          <button type="button" aria-pressed={!urgent} disabled={busy} onClick={() => setUrgent(false)} className={choice(!urgent)}>{t('issues.notUrgent')}</button>
        </div>
      </div>

      <Disclosure label={t('issues.more')}>
        <div className="flex flex-col gap-4">
          <FormField label={t('issues.description')} hint={t('common.optional')}>
            {(control) => (
              <textarea {...control} value={description} disabled={busy} rows={3} onChange={(e) => setDescription(e.target.value)} className={cx(controlClass, 'py-3')} />
            )}
          </FormField>
          {manages ? (
            <>
              <TextField
                label={t('issues.responsible')}
                hint={t('issues.responsiblePlaceholder')}
                value={responsibleParty}
                disabled={busy}
                onChange={(e) => setResponsibleParty(e.target.value)}
              />
              <TextField label={t('issues.dueDate')} type="date" value={dueDate} disabled={busy} onChange={(e) => setDueDate(e.target.value)} />
            </>
          ) : null}
        </div>
      </Disclosure>

      <ErrorMessage message={error} />

      <div className="flex flex-col gap-3">
        <Button type="submit" variant="primary" block loading={busy}>{t('issues.submit')}</Button>
        <Button type="button" variant="secondary" block onClick={onCancel} disabled={busy}>{t('common.cancel')}</Button>
      </div>
    </form>
  )
}
