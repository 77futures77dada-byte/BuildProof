import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isUnsent, needsWorker, resolveStale } from '../../lib/drafts'
import type { Draft, SendOutcome } from '../../lib/drafts'
import { linkDraftErrorKey } from '../../lib/linkTransport'
import { Button, StatusIcon } from '../ui'
import { removeLinkDraft, saveLinkDraft } from './useLinkDrafts'
import { useObjectUrls } from './useObjectUrls'

function Thumb({ blob, alt }: { blob: Blob | undefined; alt: string }) {
  const blobs = useMemo(() => (blob ? [blob] : []), [blob])
  const url = useObjectUrls(blobs)[0]
  return url
    ? <img src={url} alt={alt} className="size-14 shrink-0 rounded-control border border-line object-cover" />
    : <span aria-hidden="true" className="size-14 shrink-0 rounded-control border border-line bg-surface" />
}

interface LinkDraftListProps {
  drafts: Draft[]
  inFlight: string[]
  stopped: boolean
  onRetry: () => void
  sendNow: (d: Draft) => Promise<SendOutcome>
}

/**
 * Reports still on this phone: «Отправляется…» / «Сохранено на телефоне, не
 * отправлено» / stale («Не принято: этап уже N%»), each with its own error.
 * DOM hook: `[data-link-drafts]`.
 */
export function LinkDraftList({ drafts, inFlight, stopped, onRetry, sendNow }: LinkDraftListProps) {
  const { t } = useTranslation()
  const [confirm, setConfirm] = useState<string | null>(null)
  const unsent = drafts.filter(isUnsent)
  if (!unsent.length) return null
  const anyRetryable = unsent.some((d) => !needsWorker(d) && !inFlight.includes(d.draftId))

  return (
    <section data-link-drafts aria-labelledby="link-drafts-title" className="flex flex-col gap-3 rounded-card border border-warn-border bg-warn-bg p-4 text-fg">
      <h2 id="link-drafts-title" className="m-0 flex items-center gap-2 text-h3 font-medium">
        <StatusIcon kind="queued" />{t('workerLink.queueTitle', { count: unsent.length })}
      </h2>
      <p className="m-0 text-body">{stopped ? t('workerLink.stopped') : t('workerLink.queuedHint')}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {unsent.map((d) => {
          const sending = inFlight.includes(d.draftId)
          const errKey = d.state === 'stale' ? null : linkDraftErrorKey(d.lastError)
          return (
            <li key={d.draftId} data-draft-state={sending ? 'sending' : d.state} className="flex flex-col gap-2 border-t border-warn-border pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-3">
                <Thumb blob={d.photos?.[0]} alt={t('workerLink.photoAlt', { stage: d.stageName })} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="m-0 text-field font-medium [overflow-wrap:anywhere]">{d.stageName} · {d.newPercent}%</p>
                  <p aria-live="polite" className="m-0 flex items-center gap-2 text-body font-medium">
                    <StatusIcon kind={sending ? 'sending' : d.state === 'stale' ? 'stale' : d.state === 'unknown' ? 'unknown' : 'queued'} />
                    {sending ? t('workerLink.state.sending')
                      : d.state === 'stale' ? t('send.stale', { percent: d.stalePercent ?? 0 })
                      : t('workerLink.state.queued')}
                  </p>
                  {errKey ? <p className="m-0 text-body">{t(errKey)}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {d.state === 'stale' && !sending ? (
                  <Button variant="secondary" onClick={() => {
                    // Worker's own choice: send the photo with the stage's current % (never changed automatically).
                    const next = resolveStale(d, d.stalePercent ?? d.seenPercent, null)
                    void saveLinkDraft(next).then(() => sendNow(next))
                  }}>
                    {t('workerLink.sendWithCurrent', { percent: d.stalePercent ?? 0 })}
                  </Button>
                ) : null}
                {confirm === d.draftId ? (
                  <div className="flex w-full flex-col gap-3 rounded-card border border-stale bg-page p-3">
                    <p className="m-0 text-field font-medium">{t('send.deleteConfirm')}</p>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="danger" onClick={() => { setConfirm(null); void removeLinkDraft(d.draftId) }}>{t('common.delete')}</Button>
                      <Button variant="secondary" onClick={() => setConfirm(null)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="danger" disabled={sending} onClick={() => setConfirm(d.draftId)}>{t('common.delete')}</Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {anyRetryable ? <Button variant="primary" block onClick={onRetry}>{t('send.resend')}</Button> : null}
    </section>
  )
}
