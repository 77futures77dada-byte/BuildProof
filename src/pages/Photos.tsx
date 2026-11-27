import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { stageLabel } from '../i18n/stageLabel'
import { useAuth } from '../hooks/useAuth'
import { usePhotos } from '../hooks/usePhotos'
import { useStageOptions } from '../hooks/useStageOptions'
import { formatDate } from '../lib/format'
import { Button, FilterChips, NetBar, PhotoViewer, Sheet } from '../components/ui'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { PhotoUploadForm } from '../components/PhotoUploadForm'

const UPLOAD_ROLES = new Set(['gc', 'foreman', 'worker'])

export function Photos() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { t } = useTranslation()
  const canUpload = profile ? UPLOAD_ROLES.has(profile.role) : false

  const [stageFilter, setStageFilter] = useState('all')
  const [picked, setPicked] = useState<File | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const { photos, loading, error, reload } = usePhotos(id, stageFilter)
  const { options } = useStageOptions(id)
  const active = activeIndex !== null ? photos[activeIndex] ?? null : null

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    if (file) setPicked(file)
  }

  const line = (p: { uploadedAt: string; uploaderName: string | null }) =>
    [formatDate(p.uploadedAt), p.uploaderName].filter(Boolean).join(' · ')

  return (
    <section className="flex flex-col gap-4">
      <NetBar />
      <h2 className="m-0 text-h2 font-bold text-fg">{t('photos.title')}</h2>

      {canUpload ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          <Button variant="primary" block onClick={() => cameraRef.current?.click()} className="sm:w-auto">{t('photos.takePhoto')}</Button>
          <Button variant="secondary" onClick={() => galleryRef.current?.click()}>{t('today.fromGallery')}</Button>
        </div>
      ) : null}

      {options.length > 0 ? (
        <FilterChips
          label={t('photos.stage')}
          selected={stageFilter}
          onSelect={setStageFilter}
          chips={[{ id: 'all', label: t('photos.allStages') }, ...options.map((o) => ({ id: o.id, label: stageLabel(o.name) }))]}
        />
      ) : null}

      {loading ? (
        <Spinner label={t('photos.loading')} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : photos.length === 0 ? (
        <p className="m-0 rounded-card border-2 border-dashed border-line p-5 text-body font-medium text-fg">
          {stageFilter !== 'all' ? t('photos.emptyStage') : canUpload ? t('photos.empty') : t('photos.emptyClient')}
        </p>
      ) : (
        <ul className="m-0 grid grid-cols-2 gap-2 p-0 md:grid-cols-3 lg:grid-cols-5">
          {photos.map((photo, i) => (
            <li key={photo.id} className="list-none">
              <button
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`${t('photos.viewer')}: ${line(photo)}`}
                className="relative block aspect-square w-full overflow-hidden rounded-control bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {photo.url ? (
                  <img src={photo.url} alt="" loading="lazy" className="block size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center p-2 text-body font-semibold text-fg">{t('common.noPreview')}</span>
                )}
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-scrim px-2 py-1 text-left text-body font-semibold text-on-scrim [overflow-wrap:anywhere]">
                  {line(photo)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={picked !== null} onClose={() => setPicked(null)} title={t('photos.formHeading')} history name="photo-upload">
        {picked && id ? (
          <PhotoUploadForm
            key={`${picked.name}-${picked.lastModified}`}
            projectId={id}
            initialFile={picked}
            onCancel={() => setPicked(null)}
            onUploaded={() => { setPicked(null); reload() }}
          />
        ) : null}
      </Sheet>

      <PhotoViewer
        open={active !== null}
        onClose={() => setActiveIndex(null)}
        title={t('photos.viewer')}
        src={active?.url ?? null}
        alt={active?.caption ?? t('common.projectPhoto')}
        failedLabel={t('photos.imageFailed')}
        caption={active ? (
          <>
            {active.caption ? <p className="m-0 text-field font-semibold">{active.caption}</p> : null}
            <p className="m-0">
              {[t('photos.sentAt', { date: formatDate(active.uploadedAt) }), active.uploaderName, active.stageName ? stageLabel(active.stageName) : null].filter(Boolean).join(' · ')}
            </p>
          </>
        ) : null}
        onPrev={activeIndex !== null && activeIndex > 0 ? () => setActiveIndex(activeIndex - 1) : undefined}
        onNext={activeIndex !== null && activeIndex < photos.length - 1 ? () => setActiveIndex(activeIndex + 1) : undefined}
        prevLabel={t('photos.prev')}
        nextLabel={t('photos.next')}
      />
    </section>
  )
}
