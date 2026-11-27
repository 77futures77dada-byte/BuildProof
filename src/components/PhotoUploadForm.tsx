import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { stageLabel } from '../i18n/stageLabel'
import { useAuth } from '../hooks/useAuth'
import { useStageOptions } from '../hooks/useStageOptions'
import { uploadProjectPhoto } from '../lib/photos'
import { toErrorMessage } from '../lib/format'
import { Button, FormField, TextField, controlClass } from './ui'
import { ErrorMessage } from './ErrorMessage'
import { ImagePicker } from './ImagePicker'

interface PhotoUploadFormProps {
  projectId: string
  /** When set, the stage is fixed (no picker) — e.g. a photo attached to a task. */
  fixedStageId?: string
  heading?: string
  /** Photo already taken (camera first, 03 §5.4). */
  initialFile?: File | null
  onUploaded: () => void
  onCancel: () => void
}

/** Photo to a stage: picture · stage · caption · «Загрузить». Lives in a Sheet or Modal. */
export function PhotoUploadForm({ projectId, fixedStageId, heading, initialFile = null, onUploaded, onCancel }: PhotoUploadFormProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { options, loading: stagesLoading, error: stagesError } = useStageOptions(projectId)

  const [file, setFile] = useState<File | null>(initialFile)
  const [stageId, setStageId] = useState('')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stageMissing, setStageMissing] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setError(t('photos.pickPhoto'))
      return
    }
    const effectiveStageId = fixedStageId ?? stageId
    if (!effectiveStageId) {
      setStageMissing(true)
      return
    }
    if (!user) {
      setError(t('common.sessionMissing'))
      return
    }
    setError(null)
    setBusy(true)
    try {
      await uploadProjectPhoto({ projectId, projectStageId: effectiveStageId, caption, file, uploadedBy: user.id })
      onUploaded()
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {heading ? <h3 className="m-0 text-h3 font-bold text-fg">{heading}</h3> : null}

      <ImagePicker onChange={(f) => { setFile(f); setError(null) }} disabled={busy} initialFile={initialFile} />

      {fixedStageId ? null : (
        <>
          <FormField label={t('photos.stage')} error={stageMissing ? t('photos.pickStage') : undefined}>
            {(control) => (
              <select
                {...control}
                required
                value={stageId}
                disabled={busy || stagesLoading}
                onChange={(e) => { setStageId(e.target.value); setStageMissing(false) }}
                className={controlClass}
              >
                <option value="" disabled>
                  {stagesLoading ? t('photos.loadingStages') : t('photos.chooseStage')}
                </option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>{stageLabel(opt.name)}</option>
                ))}
              </select>
            )}
          </FormField>
          <ErrorMessage message={stagesError} />
        </>
      )}

      <TextField
        label={t('photos.caption')}
        hint={t('common.optional')}
        type="text"
        value={caption}
        disabled={busy}
        onChange={(e) => setCaption(e.target.value)}
      />

      <ErrorMessage message={error} />

      <div className="flex flex-col gap-3">
        <Button type="submit" variant="primary" block loading={busy}>
          {busy ? t('photos.uploading') : t('photos.upload')}
        </Button>
        <Button type="button" variant="secondary" block onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
