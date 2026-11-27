import type { ReactNode } from 'react'
import { ProgressBar } from './ProgressBar'
import { StatusChip } from './StatusChip'
import type { ChipSpec } from './ProjectCard'
import { cx } from './cx'

interface StageRowProps {
  name: ReactNode
  percent: number
  /** marked-by / no-reports / k15 status chip. */
  status?: ChipSpec
  /** Second line, e.g. last report time. */
  meta?: ReactNode
  /** Row action (opens history / report sheet). Omit for `readonly`. */
  onPress?: () => void
  /** Extra controls on the right («⋯», «Отметить»), each ≥ 48 px. */
  actions?: ReactNode
  /** History panel etc., rendered under the row. */
  children?: ReactNode
  /** `dense`: overview desktop — one 40 px line (name · % · actions) with a thin bar; no meta, status or children. */
  variant?: 'overview' | 'stages' | 'readonly' | 'dense'
  /** `dense` only: state by shape (✓ done · ◐ in progress · ○ not started) with its word for screen readers, and a tooltip (date, who marked). */
  state?: { label: string; title?: string }
  className?: string
}

/** Stage line: name, figure, bar, status. Long names (30+ chars) wrap, never overflow. */
export function StageRow({ name, percent, status, meta, onPress, actions, children, variant = 'overview', className, state }: StageRowProps) {
  const pct = Math.round(percent)
  if (variant === 'dense') {
    const line = (
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-body">{name}</span>
          <span className="flex shrink-0 items-baseline gap-1.5 text-body font-medium" title={state?.title}>
            {pct}%
            <span aria-hidden="true" className="inline-block w-4 text-center">{pct >= 100 ? '✓' : pct > 0 ? '◐' : '○'}</span>
            {state ? <span className="sr-only">{state.label}</span> : null}
          </span>
        </span>
        <ProgressBar value={pct} />
      </span>
    )
    return (
      <li className={cx('flex list-none items-center gap-2 border-b border-line last:border-b-0', className)}>
        {onPress ? (
          <button
            type="button"
            onClick={onPress}
            className="flex min-h-12 min-w-0 flex-1 rounded-control px-1 text-left text-fg hover:bg-surface-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus pointer-fine:min-h-10"
          >
            {line}
          </button>
        ) : (
          <div className="flex min-h-12 min-w-0 flex-1 px-1 pointer-fine:min-h-10">{line}</div>
        )}
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </li>
    )
  }
  const body = (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-field [overflow-wrap:anywhere]">{name}</span>
        <span className="shrink-0 text-h3 font-medium">{pct}%</span>
      </span>
      <ProgressBar value={pct} />
      {meta ? <span className="text-body">{meta}</span> : null}
    </>
  )
  const interactive = onPress && variant !== 'readonly'
  return (
    <li className={cx('flex list-none flex-col gap-2 border-b border-line py-3 last:border-b-0', className)}>
      <div className="flex items-start gap-3">
        {interactive ? (
          <button
            type="button"
            onClick={onPress}
            className="flex min-h-12 min-w-0 flex-1 flex-col gap-2 rounded-control text-left text-fg hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {body}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-2">{body}</div>
        )}
        {actions && variant !== 'readonly' ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {status ? <StatusChip kind={status.kind} className="self-start">{status.label}</StatusChip> : null}
      {children}
    </li>
  )
}
