import type { ReactNode } from 'react'
import { Button } from './Button'
import { StatusIcon } from './StatusIcon'
import type { StatusKind } from './statusKinds'
import { cx } from './cx'

export type UnsentState = 'queued' | 'unknown' | 'outdated' | 'retrying' | 'mixed'

const ICON: Record<UnsentState, StatusKind> = {
  queued: 'queued',
  unknown: 'unknown',
  outdated: 'outdated',
  retrying: 'sending',
  mixed: 'queued',
}

interface UnsentBannerProps {
  state: UnsentState
  /** Number of drafts on this phone; shown as a separate figure (600). */
  count: number
  /** Accessible / visible word for the figure, e.g. «черновика» (plural from i18n). */
  countLabel: ReactNode
  /** «Сохранено на телефоне, не отправлено» (`send.queued`, …). */
  title: ReactNode
  /** Second line, e.g. the next step. */
  detail?: ReactNode
  /** Retry status line (aria-live), e.g. «Отправляем…» / last attempt result. */
  retryStatus?: ReactNode
  /** «Отправить снова» — only in `queued` / `mixed` (04 `send.resend`). */
  retryLabel?: ReactNode
  onRetry?: () => void
  /** Optional link/button to the draft list. */
  details?: ReactNode
  variant?: 'full' | 'compact'
  className?: string
}

/**
 * «Не отправлено» banner: own warning tokens (`--warn-*`), never the main-button
 * yellow (02-type §6.2). Takes the place of the main button; its retry button is
 * the screen's main action.
 */
export function UnsentBanner({
  state, count, countLabel, title, detail, retryStatus, retryLabel, onRetry, details, variant = 'full', className,
}: UnsentBannerProps) {
  const canRetry = Boolean(retryLabel && onRetry) && (state === 'queued' || state === 'mixed' || state === 'retrying')
  return (
    <section
      data-unsent={state}
      className={cx(
        'flex flex-col gap-3 rounded-card border border-warn-border bg-warn-bg text-field leading-[1.3] font-medium text-fg',
        variant === 'full' ? 'p-4' : 'p-3',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <StatusIcon kind={ICON[state]} size={22} className="mt-0.5" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="m-0">{title}</p>
          {detail && variant === 'full' ? <p className="m-0 text-body">{detail}</p> : null}
        </div>
        <p className="m-0 flex shrink-0 flex-col items-end leading-none">
          <span className="text-h2 font-medium">{count}</span>
          <span className="text-body">{countLabel}</span>
        </p>
      </div>
      <p aria-live="polite" className="m-0 text-body font-medium empty:hidden">{retryStatus}</p>
      {canRetry ? (
        <Button variant="primary" block loading={state === 'retrying'} onClick={onRetry}>{retryLabel}</Button>
      ) : null}
      {details}
    </section>
  )
}
