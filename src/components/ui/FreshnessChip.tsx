import type { ReactNode } from 'react'
import { StatusIcon } from './StatusIcon'
import { STATUS_COLOR } from './statusKinds'
import type { StatusKind } from './statusKinds'
import { cx } from './cx'

/**
 * Freshness / «who marked it» chip (03 §9 `FreshnessChip`). Same look as
 * `StatusChip`, but the shape is optional: «Отчёт сегодня», «Отметок пока нет»
 * and «Отметил владелец» carry no status shape (02-type §8 has none for them),
 * only the word on a neutral `--line` edge. 3+ days without a report → `stale`.
 */
export function FreshnessChip({ icon, children, className }: { icon?: StatusKind; children: ReactNode; className?: string }) {
  return (
    <span
      data-freshness={icon ?? 'plain'}
      className={cx(
        'inline-flex min-h-8 max-w-full items-center gap-2 rounded-chip border-l-4 bg-surface py-1 pr-3 pl-2 text-body font-semibold text-fg',
        className,
      )}
      style={{ borderLeftColor: icon ? STATUS_COLOR[icon] : 'var(--line)' }}
    >
      {icon ? <StatusIcon kind={icon} /> : null}
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </span>
  )
}
