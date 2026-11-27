import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EditableStage } from '../../hooks/useProjectStages'
import { effectiveSeenPercent, isUnsent, resolveStale } from '../../lib/drafts'
import type { Draft, DraftError, SendOutcome } from '../../lib/drafts'
import { isReportReviewOn } from '../../lib/reportReview'
import { Button, NetBar, PercentStepper, Sheet, StatusIcon, cx, useOnline } from '../ui'
import { StagePicker } from './StagePicker'
import { draftErrorKey } from './draftErrors'
import { removeDraft, saveDraft, sendDraftNow, useDrafts } from './useDrafts'

const REASONS = ['rework', 'mistake', 'demolition'] as const
/** «Закрыть» is blocked for the first 3 s of sending (03 §6.2). */
const LOCK_MS = 3000
/** Jump that goes to review under K15 (brief §2.1 п.4, `projects.review_threshold` default). */
const BIG_JUMP = 25

interface ReportSheetProps {
  /** The draft on the sheet (`editing`, or `stale` for the decision view). Null = closed. */
  draft: Draft | null
  stages: EditableStage[]
  projectName: string
  userId: string
  paused: boolean
  onClose: () => void
  /** Open the camera again; the parent replaces the photo of this draft. */
  onRetake: () => void
  /** Sheet closed after an attempt (sent / queued / unknown …). */
  onDone: (outcome: SendOutcome) => void
}

/**
 * Worker report sheet (03 §6.2, §6.4). Camera first, then this sheet. DOM
 * order fixed (01 §3.4): object · photo · was/will · % buttons · stage ·
 * reasons · one notice line. «Отправить» is the sticky footer: always visible
 * without scrolling (sheet ≤ 90vh). DOM hooks: `[data-sheet="report"]`, its
 * main button `[data-sheet="report"] [data-main]`.
 */
export function ReportSheet({ draft, stages, projectName, userId, paused, onClose, onRetake, onDone }: ReportSheetProps) {
  const { t } = useTranslation()
  const { drafts } = useDrafts()
  const [stageId, setStageId] = useState<string | null>(draft?.stageId ?? null)
  const [value, setValue] = useState(0)
  const [reason, setReason] = useState<string | null>(null)
  const [view, setView] = useState<'main' | 'picker' | 'preview' | 'delete'>('main')
  const [phase, setPhase] = useState<'idle' | 'locked' | 'closable'>('idle')
  const [error, setError] = useState<DraftError | null>(null)
  const [syncedFor, setSyncedFor] = useState<string | null>(null)
  // Set synchronously on the first tap: a double tap must not start a second send.
  const busy = useRef(false)
  const online = useOnline()

  const stale = draft?.state === 'stale'
  const stage = stages.find((s) => s.id === stageId) ?? null
  const others = useMemo(() => drafts.filter((d) => d.draftId !== draft?.draftId), [drafts, draft?.draftId])
  // A queued/unknown draft reopened from the banner keeps its own claim.
  const ownClaim = !!draft && !stale && draft.state !== 'editing' && stageId === draft.stageId
  const base = stale
    ? (draft?.stalePercent ?? 0)
    : ownClaim ? draft.seenPercent
    : stage ? effectiveSeenPercent(others, userId, stage.id, stage.progressPercent) : (draft?.seenPercent ?? 0)

  // A new draft on the sheet: start from «без изменений» (or the stale claim).
  const key = draft ? `${draft.draftId}:${stale}` : null
  if (key !== syncedFor) {
    setSyncedFor(key)
    if (draft) {
      const st = stages.find((s) => s.id === draft.stageId)
      setStageId(draft.stageId)
      const keepClaim = stale || draft.state !== 'editing'
      setValue(keepClaim ? draft.newPercent : st ? effectiveSeenPercent(others, userId, st.id, st.progressPercent) : draft.seenPercent)
      setReason(keepClaim ? draft.reason : null)
      setError(draft.lastError)
      setView('main')
      setPhase('idle')
    }
  }

  const photo = draft?.photo ?? null
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  useEffect(() => {
    if (phase !== 'locked') return
    const id = setTimeout(() => setPhase('closable'), LOCK_MS)
    return () => clearTimeout(id)
  }, [phase])

  if (!draft) return null
  const sending = phase !== 'idle'
  const decrease = value < base
  const needsReason = decrease && !reason
  const unsentOthers = others.filter((d) => d.userId === userId && isUnsent(d)).length
  const stageName = stage?.name ?? draft.stageName

  const pickStage = (s: EditableStage) => {
    setStageId(s.id)
    // keep the photo, reset M to the new stage's % (03 §6.2 block 5)
    setValue(effectiveSeenPercent(others, userId, s.id, s.progressPercent))
    setReason(null)
    setView('main')
  }

  const send = async () => {
    if (needsReason || sending || busy.current) return
    busy.current = true
    setPhase('locked')
    setError(null)
    const ready: Draft = stale
      ? resolveStale(draft, value, reason)
      : {
          ...draft,
          stageId: stage?.id ?? draft.stageId,
          stageName,
          storagePath: `${draft.projectId}/${stage?.id ?? draft.stageId}/${draft.draftId}.jpg`,
          seenPercent: base,
          newPercent: value,
          reason: decrease ? reason : null,
          state: 'queued',
        }
    try {
      await saveDraft(ready)
      const outcome = await sendDraftNow(ready)
      if (outcome.result === 'stale') return // sheet switches to the decision view
      if (outcome.result === 'failed' && outcome.error !== 'network' && outcome.error !== 'timeout') {
        setError(outcome.error)
        return
      }
      onDone(outcome)
    } finally {
      busy.current = false
      setPhase('idle')
    }
  }

  const reasonBlock = (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-field font-medium text-fg">{t('report.reasonTitle')}</p>
      <div role="radiogroup" aria-label={t('report.reasonTitle')} className="flex flex-wrap gap-2">
        {REASONS.map((r) => {
          const label = t(`report.reason.${r}`)
          const on = reason === label
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={sending}
              onClick={() => setReason(label)}
              className={cx(
                'inline-flex min-h-12 items-center rounded-chip border px-4 text-field font-medium',
                'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
                on ? 'border-fg bg-fg text-page' : 'border-line bg-page text-fg hover:border-line-strong hover:bg-surface-2',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )

  const bigJump = isReportReviewOn() && value - base > BIG_JUMP
  const notices = [bigJump ? t('report.bigJump') : null, paused ? t('report.paused') : null, unsentOthers ? t('send.bar', { count: unsentOthers }) : null].filter(Boolean)

  const footer = view === 'main' ? (
    <div className="flex flex-col gap-2">
      {!online && !sending ? (
        <div className="flex flex-col gap-1" data-offline-hint>
          <NetBar />
          <p className="m-0 text-body font-medium text-fg">{t('report.offlineSaved')}</p>
        </div>
      ) : null}
      {sending ? (
        <p aria-live="polite" className="m-0 flex items-center gap-2 text-body font-medium text-fg">
          <StatusIcon kind="sending" />{t('send.sending')}
        </p>
      ) : null}
      <Button variant="primary" block loading={sending} disabled={needsReason} onClick={() => void send()}>
        {needsReason ? t('report.pickReason') : stale ? t('send.staleResend') : t('report.send')}
      </Button>
    </div>
  ) : null

  return (
    <Sheet
      open
      name="report"
      history
      onClose={() => { if (view !== 'main') setView('main'); else onClose() }}
      title={view === 'picker' ? t('stagePicker.title') : t('report.title')}
      busy={phase === 'locked' ? 'busy-locked' : phase === 'closable' ? 'busy-closable' : undefined}
      closeLabel={phase === 'closable' ? t('report.closeSending') : undefined}
      footer={footer}
    >
      {view === 'picker' ? (
        <StagePicker stages={stages} currentId={stageId} onPick={pickStage} />
      ) : view === 'preview' && photoUrl ? (
        <button type="button" onClick={() => setView('main')} className="block w-full rounded-card focus-visible:outline-3 focus-visible:outline-focus">
          <img src={photoUrl} alt={t('report.photoAlt', { stage: stageName })} className="block max-h-[60vh] w-full rounded-card object-contain" />
        </button>
      ) : (
        <div className="flex flex-col gap-4" data-report-body>
          {stale ? (
            <p data-stale className="m-0 flex items-start gap-2 text-field font-medium text-fg">
              <StatusIcon kind="stale" className="mt-0.5" />
              {t('send.stale', { percent: draft.stalePercent ?? 0 })}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView('preview')}
              disabled={!photoUrl}
              className="size-[72px] shrink-0 overflow-hidden rounded-control border border-line bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {photoUrl ? <img src={photoUrl} alt={t('report.photoAlt', { stage: stageName })} className="size-full object-cover" /> : null}
            </button>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="m-0 truncate text-body font-medium text-fg">{projectName} · {stageName}</p>
              <p className="m-0 text-h3 font-medium text-fg" aria-live="polite">
                {stale ? t('report.yourPercent', { percent: value }) : t('report.wasWill', { from: base, to: value })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!stale ? <Button variant="secondary" disabled={sending} onClick={onRetake}>{t('report.retake')}</Button> : null}
            {value !== base ? (
              <Button variant="ghost" disabled={sending} onClick={() => { setValue(base); setReason(null) }} className="px-3">{t('report.noChange')}</Button>
            ) : null}
          </div>

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

          {!stale ? (
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 line-clamp-2 min-w-0 text-field font-medium text-fg [overflow-wrap:anywhere]">{t('report.stage', { stage: stageName })}</p>
              {/* after an attempt the photo may already sit at this stage's path (and the report may have arrived): stage is fixed */}
              {draft.attempts === 0 ? (
                <Button variant="secondary" disabled={sending} onClick={() => setView('picker')} className="shrink-0">{t('report.changeStage')}</Button>
              ) : null}
            </div>
          ) : null}

          {/* Any draft can be deleted from the phone (same confirm), so a draft stuck on an error never blocks a slot forever. */}
          {/* fresh shot: no red «Удалить» on the 10-second path; only saved / stuck drafts */}
          {draft.state === 'editing' ? null : view === 'delete' ? (
            <div className="flex flex-col gap-3 rounded-card border border-stale p-3">
              <p className="m-0 text-field font-medium text-fg">{t('send.deleteConfirm')}</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="danger" onClick={() => { void removeDraft(draft.draftId).then(onClose) }}>{t('common.delete')}</Button>
                <Button variant="secondary" onClick={() => setView('main')}>{t('common.cancel')}</Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" className="self-start" disabled={sending} onClick={() => setView('delete')}>{t('common.delete')}</Button>
          )}

          {error ? (
            <p role="alert" className="m-0 flex items-start gap-2 text-field font-medium text-fg">
              <StatusIcon kind="error" className="mt-0.5" />{t(draftErrorKey(error))}
            </p>
          ) : null}

          {notices.length ? <p className="m-0 text-body font-medium text-fg">{notices.join(' · ')}</p> : null}
        </div>
      )}
    </Sheet>
  )
}
