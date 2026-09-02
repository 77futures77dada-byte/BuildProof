import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useStageOptions } from '../hooks/useStageOptions'
import { uploadProjectPhoto } from '../lib/photos'
import { toErrorMessage } from '../lib/format'
import { Button } from './Button'
import { ErrorMessage } from './ErrorMessage'

interface PhotoUploadFormProps {
  projectId: string
  /** When set, the stage is fixed (no picker) — e.g. a photo attached to a task. */
  fixedStageId?: string
  heading?: string
  onUploaded: () => void
  onCancel: () => void
}

export function PhotoUploadForm({
  projectId,
  fixedStageId,
  heading = 'Новое фото',
  onUploaded,
  onCancel,
}: PhotoUploadFormProps) {
  const { user } = useAuth()
  const { options, loading: stagesLoading, error: stagesError } = useStageOptions(projectId)

  const [selected, setSelected] = useState<{ file: File; url: string } | null>(null)
  const [stageId, setStageId] = useState('')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<string | null>(null)

  // Revoke the last preview URL when the form unmounts.
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  function pickFile(next: File | null) {
    setSelected((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      if (!next) {
        urlRef.current = null
        return null
      }
      const url = URL.createObjectURL(next)
      urlRef.current = url
      return { file: next, url }
    })
    setError(null)
  }

  const previewUrl = selected?.url ?? null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selected) {
      setError('Выберите фото.')
      return
    }
    const effectiveStageId = fixedStageId ?? stageId
    if (!effectiveStageId) {
      setError('Выберите этап.')
      return
    }
    if (!user) {
      setError('Сессия не найдена. Войдите заново.')
      return
    }

    setError(null)
    setBusy(true)
    try {
      await uploadProjectPhoto({
        projectId,
        projectStageId: effectiveStageId,
        caption,
        file: selected.file,
        uploadedBy: user.id,
      })
      onUploaded()
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
      <h2 className="text-base font-semibold text-slate-900">{heading}</h2>

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="block w-full"
          >
            <img
              src={previewUrl}
              alt="Предпросмотр"
              className="max-h-64 w-full rounded-lg object-contain bg-slate-100"
            />
            <span className="mt-1 block text-xs text-slate-500">Нажмите, чтобы выбрать другое фото</span>
          </button>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Выбрать фото
          </Button>
        )}
      </div>

      {fixedStageId ? null : (
        <>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Этап <span className="text-red-600">*</span>
            </span>
            <select
              required
              value={stageId}
              disabled={busy || stagesLoading}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            >
              <option value="" disabled>
                {stagesLoading ? 'Загрузка этапов…' : 'Выберите этап'}
              </option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>
          <ErrorMessage message={stagesError} />
        </>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Подпись</span>
        <input
          type="text"
          value={caption}
          disabled={busy}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Необязательно"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />
      </label>

      <ErrorMessage message={error} />

      <div className="flex gap-2">
        <Button type="submit" loading={busy}>
          {busy ? 'Загрузка…' : 'Загрузить'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Отмена
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Фото уменьшается до 1600px по длинной стороне перед загрузкой.
      </p>
    </form>
  )
}
