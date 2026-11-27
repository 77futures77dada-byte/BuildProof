import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { effectiveSeenPercent, newDraftId } from '../../lib/drafts'
import type { Draft, SendOutcome } from '../../lib/drafts'
import { DECREASE_REASONS, linkDraftErrorKey } from '../../lib/linkTransport'
import type { DecreaseReason, WorkerLinkStage } from '../../lib/linkTransport'
import { Button, NetBar, PercentStepper, Sheet, StatusIcon, cx, useOnline } from '../ui'
import { StagePicker } from '../report/StagePicker'
import { readTakenAt } from './exif'
import { compressPhotos, MAX_PHOTOS, PhotosTooLargeError } from './photos'
import { saveLinkDraft } from './useLinkDrafts'
import { useObjectUrls } from './useObjectUrls'

/** Contract reason code → existing app label key (report.reason.*). */
const REASON_LABEL: Record<DecreaseReason, string> = {
  rework: 'report.reason.rework',
  count_error: 'report.reason.mistake',
  demolition: 'report.reason.demolition',
}

interface LinkReportSheetProps {
  open: boolean
  stages: WorkerLinkStage[]
  projectId: string
  owner: string
  /** All own drafts (for «было» = own latest unsent claim). */
  drafts: Draft[]
  initialStageId: string | null
  sendNow: (d: Draft) => Promise<SendOutcome>
  onClose: () => void
  onDone: (o: SendOutcome) => void
}

async function earliestTakenAt(files: File[]): Promise<string | null> {
  const all = (await Promise.all(files.map(readTakenAt))).filter((x): x is string => !!x)
  return all.sort()[0] ?? null
}

/**
 * Worker-link report: 1–5 photos (camera or gallery), stage, %, decrease reason.
 * The draft is saved on the phone before the first send attempt.
 * DOM hook: `[data-sheet="link-report"]`.
 */
export function LinkReportSheet({ open, stages, projectId, owner, drafts, initialStageId, sendNow, onClose, onDone }: LinkReportSheetProps) {
  const { t } = useTranslation()
  const online = useOnline()
  const [files, setFiles] = useState<File[]>([])
  const [stageId, setStageId] = useState<string | null>(initialStageId)
  const [value, setValue] = useState(0)
  const [reason, setReason] = useState<DecreaseReason | null>(null)
  const [view, setView] = useState<'main' | 'picker'>('main')
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'sending'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [draftId, setDraftId] = useState(newDraftId)
  const busy = useRef(false)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  const stage = stages.find((s) => s.id === stageId) ?? null
  const others = useMemo(() => drafts.filter((d) => d.draftId !== draftId), [drafts, draftId])
  const base = stage ? effectiveSeenPercent(others, owner, stage.id, stage.progress_percent) : 0

  // Fresh form on every open.
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const openKey = open ? `${initialStageId ?? ''}` : null
  if (openKey !== openedFor) {
    setOpenedFor(openKey)
    if (open) {
      const st = stages.find((s) => s.id === initialStageId) ?? (stages.length === 1 ? stages[0] : null)
      setFiles([])
      setStageId(st?.id ?? null)
      setValue(st ? effectiveSeenPercent(drafts, owner, st.id, st.progress_percent) : 0)
      setReason(null)
      setView(st ? 'main' : 'picker')
      setPhase('idle')
      setError(null)
      setDraftId(newDraftId())
    }
  }

  const urls = useObjectUrls(files)

  if (!open) return null
  const sending = phase !== 'idle'
  const decrease = value < base
  const needsReason = decrease && !reason
  const canSend = !!stage && files.length > 0 && !needsReason

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const images = [...list].filter((f) => f.type.startsWith('image/') || f.type === '')
    const next = [...files, ...images].slice(0, MAX_PHOTOS)
    setError(files.length + images.length > MAX_PHOTOS ? t('workerLink.maxPhotos', { max: MAX_PHOTOS }) : null)
    setFiles(next)
  }

  const send = async () => {
    if (!stage || !canSend || busy.current) return
    busy.current = true
    setError(null)
    setPhase('preparing')
    try {
      let photos: Blob[]
      try {
        photos = await compressPhotos(files)
      } catch (err) {
        setError(t(err instanceof PhotosTooLargeError ? 'workerLink.tooLarge' : 'image.compressFailed'))
        return
      }
      const now = Date.now()
      const d: Draft = {
        draftId, userId: owner, projectId, stageId: stage.id, stageName: stage.name,
        seenPercent: base, newPercent: value, reason: decrease ? reason : null,
        photo: null, photos, takenAt: await earliestTakenAt(files), deviceTime: new Date(now).toISOString(),
        storagePath: '', state: 'queued', createdAt: now, attempts: 0, lastAttemptAt: null, lastError: null, stalePercent: null,
      }
      await saveLinkDraft(d)
      setPhase('sending')
      const o = await sendNow(d)
      if (o.result === 'failed' && o.error !== 'network' && o.error !== 'timeout' && o.error !== 'rate_limit' && o.error !== 'auth') {
        // The server made no report for these errors, so the same draft id (= client_request_id)
        // is reused when the worker fixes it here; closing leaves it in the list with its error.
        const key = linkDraftErrorKey(o.error)
        setError(key ? t(key) : null)
        return
      }
      onDone(o)
    } finally {
      busy.current = false
      setPhase('idle')
    }
  }

  const reasonBlock = (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-field font-medium text-fg">{t('report.reasonTitle')}</p>
      <div role="radiogroup" aria-label={t('report.reasonTitle')} className="flex flex-wrap gap-2">
        {DECREASE_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={reason === r}
            disabled={sending}
            onClick={() => setReason(r)}
            className={cx(
              'inline-flex min-h-12 items-center rounded-chip border px-4 text-field font-medium',
              'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
              reason === r ? 'border-fg bg-fg text-page' : 'border-line bg-page text-fg hover:border-line-strong hover:bg-surface-2',
            )}
          >
            {t(REASON_LABEL[r])}
          </button>
        ))}
      </div>
    </div>
  )

  const mainLabel = phase === 'preparing' ? t('workerLink.preparing')
    : phase === 'sending' ? t('workerLink.state.sending')
    : !stage ? t('workerLink.pickStage')
    : files.length === 0 ? t('workerLink.photoNeeded')
    : needsReason ? t('report.pickReason')
    : t('report.send')

  const footer = view === 'main' ? (
    <div className="flex flex-col gap-2">
      {!online && !sending ? (
        <div className="flex flex-col gap-1" data-offline-hint>
          <NetBar />
          <p className="m-0 text-body font-medium text-fg">{t('workerLink.offlineSaved')}</p>
        </div>
      ) : null}
      <Button variant="primary" block loading={sending} disabled={!canSend} onClick={() => void send()}>{mainLabel}</Button>
    </div>
  ) : null

  const pickerStages = stages.map((s, i) => ({ id: s.id, name: s.name, sortOrder: i, progressPercent: s.progress_percent }))

  return (
    <Sheet
      open
      name="link-report"
      history
      onClose={() => { if (view === 'picker' && stage) setView('main'); else if (!sending) onClose() }}
      title={view === 'picker' ? t('stagePicker.title') : t('report.title')}
      busy={sending ? 'busy-locked' : undefined}
      footer={footer}
    >
      {view === 'picker' ? (
        <StagePicker
          stages={pickerStages}
          currentId={stageId}
          onPick={(s) => {
            setStageId(s.id)
            setValue(effectiveSeenPercent(others, owner, s.id, s.progressPercent))
            setReason(null)
            setView('main')
          }}
        />
      ) : (
        <div className="flex flex-col gap-4" data-link-report-body>
          <div className="flex flex-col gap-2">
            <p className="m-0 text-field font-medium text-fg">{t('workerLink.photosCount', { count: files.length, max: MAX_PHOTOS })}</p>
            {files.length ? (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0" data-link-photos>
                {urls.map((u, i) => (
                  <li key={`${i}-${u}`} className="relative">
                    <img src={u} alt={t('workerLink.photoAlt', { stage: stage?.name ?? '' })} className="size-[72px] rounded-control border border-line object-cover" />
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      aria-label={t('workerLink.removePhoto', { n: i + 1 })}
                      className="absolute -top-2 -right-2 inline-flex size-12 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-focus pointer-fine:size-9"
                    >
                      <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full border border-line-strong bg-page text-body font-medium text-fg">×</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button variant={files.length ? 'secondary' : 'primary'} disabled={sending || files.length >= MAX_PHOTOS} onClick={() => camera.current?.click()}>
                {t('workerLink.takePhoto')}
              </Button>
              <Button variant="secondary" disabled={sending || files.length >= MAX_PHOTOS} onClick={() => gallery.current?.click()}>
                {t('workerLink.fromGallery')}
              </Button>
            </div>
            <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="m-0 line-clamp-2 min-w-0 text-field font-medium text-fg [overflow-wrap:anywhere]">
              {stage ? t('report.stage', { stage: stage.name }) : t('workerLink.pickStage')}
            </p>
            <Button variant="secondary" disabled={sending} onClick={() => setView('picker')} className="shrink-0">{t('report.changeStage')}</Button>
          </div>

          {stage ? (
            <>
              <p className="m-0 text-h3 font-medium text-fg" aria-live="polite">{t('report.wasWill', { from: base, to: value })}</p>
              {value !== base ? (
                <Button variant="ghost" disabled={sending} onClick={() => { setValue(base); setReason(null) }} className="self-start px-3">{t('report.noChange')}</Button>
              ) : null}
              <PercentStepper
                base={base}
                value={value}
                onChange={(v) => { setValue(v); if (v >= base) setReason(null) }}
                disabled={sending}
                decreaseSlot={reasonBlock}
                labels={{
                  plus10: t('report.plus10'), plus25: t('report.plus25'), done100: t('report.done100'),
                  minus10: t('report.minus10'), backToGrowth: t('report.backToGrowth'),
                }}
              />
            </>
          ) : null}

          {phase === 'sending' ? (
            <p aria-live="polite" className="m-0 flex items-center gap-2 text-body font-medium text-fg">
              <StatusIcon kind="sending" />{t('workerLink.state.sending')}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="m-0 flex items-start gap-2 text-field font-medium text-fg">
              <StatusIcon kind="error" className="mt-0.5" />{error}
            </p>
          ) : null}
        </div>
      )}
    </Sheet>
  )
}
