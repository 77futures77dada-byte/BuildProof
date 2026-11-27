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
  variant?: 'overview' | 'stages' | 'readonly'
  className?: string
}

/** Stage line: name, figure, bar, status. Long names (30+ chars) wrap, never overflow. */
export function StageRow({ name, percent, status, meta, onPress, actions, children, variant = 'overview', className }: StageRowProps) {
  const pct = Math.round(percent)
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
    <li className={cx('flex list-none flex-col gap-2 border-b-2 border-line py-3 last:border-b-0', className)}>
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
