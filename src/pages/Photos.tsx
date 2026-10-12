import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { stageLabel } from '../i18n/stageLabel'
import { useAuth } from '../hooks/useAuth'
import { usePhotos } from '../hooks/usePhotos'
import type { FeedPhoto } from '../hooks/usePhotos'
import { useStageOptions } from '../hooks/useStageOptions'
import { formatDate } from '../lib/format'
import { Button } from '../components/Button'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { Modal } from '../components/Modal'
import { PhotoUploadForm } from '../components/PhotoUploadForm'

const UPLOAD_ROLES = new Set(['gc', 'foreman', 'worker'])

export function Photos() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { t } = useTranslation()
  const canUpload = profile ? UPLOAD_ROLES.has(profile.role) : false

  const [stageFilter, setStageFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [active, setActive] = useState<FeedPhoto | null>(null)

  const { photos, loading, error, reload } = usePhotos(id, stageFilter)
  const { options } = useStageOptions(id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">{t('photos.title')}</h2>
        {canUpload && !showForm ? (
          <Button onClick={() => setShowForm(true)}>{t('photos.add')}</Button>
        ) : null}
      </div>

      {showForm && id ? (
        <PhotoUploadForm
          projectId={id}
          onCancel={() => setShowForm(false)}
          onUploaded={() => {
            setShowForm(false)
            reload()
          }}
        />
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">{t('photos.stageFilter')}</span>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        >
          <option value="all">{t('photos.allStages')}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {stageLabel(opt.name)}
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <Spinner label={t('photos.loading')} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : photos.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          {stageFilter === 'all' ? t('photos.empty') : t('photos.emptyStage')}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setActive(photo)}
                className="block w-full text-left"
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.caption ?? t('common.projectPhoto')}
                    loading="lazy"
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                    {t('common.noPreview')}
                  </div>
                )}
                <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                  <p>
                    {formatDate(photo.uploadedAt)}
                    {photo.uploaderName ? ` · ${photo.uploaderName}` : ''}
                  </p>
                  {photo.stageName ? <p className="text-slate-400">{stageLabel(photo.stageName)}</p> : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={active !== null} onClose={() => setActive(null)} label={t('photos.viewer')}>
        {active ? (
          <figure className="space-y-2">
            {active.url ? (
              <img
                src={active.url}
                alt={active.caption ?? t('common.projectPhoto')}
                className="mx-auto max-h-[80vh] w-auto rounded-lg bg-black object-contain"
              />
            ) : (
              <div className="rounded-lg bg-slate-800 p-10 text-center text-sm text-slate-300">
                {t('photos.imageFailed')}
              </div>
            )}
            <figcaption className="rounded-lg bg-white p-3 text-sm">
              {active.caption ? <p className="text-slate-800">{active.caption}</p> : null}
              <p className="mt-0.5 text-xs text-slate-500">
                {formatDate(active.uploadedAt)}
                {active.uploaderName ? ` · ${active.uploaderName}` : ''}
                {active.stageName ? ` · ${stageLabel(active.stageName)}` : ''}
              </p>
            </figcaption>
            <div className="text-center">
              <Button variant="secondary" onClick={() => setActive(null)}>
                {t('common.close')}
              </Button>
            </div>
          </figure>
        ) : null}
      </Modal>
    </div>
  )
}
