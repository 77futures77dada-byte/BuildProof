import type { ReactNode } from 'react'
import { StatusIcon } from './StatusIcon'
import { STATUS_COLOR } from './statusKinds'
import type { StatusKind } from './statusKinds'
import { cx } from './cx'

interface StatusChipProps {
  kind: StatusKind
  /** The status word(s); always rendered — colour is never the only signal. */
  children: ReactNode
  className?: string
}

/**
 * Status chip: SVG shape + word. Word in `--fg`, status colour only on the icon
 * and the 4 px left edge (02-type §6.1). 17 px / 600.
 */
export function StatusChip({ kind, children, className }: StatusChipProps) {
  return (
    <span
      data-status={kind}
      className={cx(
        'inline-flex min-h-8 max-w-full items-center gap-2 rounded-chip border-l-4 bg-surface py-1 pr-3 pl-2 text-body font-medium text-fg',
        className,
      )}
      style={{ borderLeftColor: STATUS_COLOR[kind] }}
    >
      <StatusIcon kind={kind} />
      <span className="min-w-0">{children}</span>
    </span>
  )
}
