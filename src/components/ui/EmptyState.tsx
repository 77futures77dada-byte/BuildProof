import type { ReactNode } from 'react'
import { StatusIcon } from './StatusIcon'
import type { StatusKind } from './statusKinds'
import { cx } from './cx'

interface EmptyStateProps {
  /** What will be here. */
  text: ReactNode
  /** Who can do the next step today («Это может сделать владелец»). Required: no dead ends (03 Ж9). */
  who: ReactNode
  /** The next action (a Button / link). Omit only when the text explains why there is none. */
  action?: ReactNode
  title?: ReactNode
  /** e.g. `noreports`; omit for a plain empty list. */
  icon?: StatusKind
  className?: string
}

/** Empty list / screen: what will be here + next step + who does it (03 §0.2 `empty`). */
export function EmptyState({ text, who, action, title, icon, className }: EmptyStateProps) {
  return (
    <section className={cx('flex flex-col items-start gap-3 rounded-card border-2 border-dashed border-line bg-page p-5', className)}>
      {title ? (
        <h3 className="m-0 flex items-center gap-2 text-h3 font-semibold text-fg">
          {icon ? <StatusIcon kind={icon} /> : null}
          {title}
        </h3>
      ) : null}
      <p className="m-0 flex items-start gap-2 text-body text-fg">
        {!title && icon ? <StatusIcon kind={icon} className="mt-0.5" /> : null}
        <span>{text}</span>
      </p>
      <p className="m-0 text-body font-medium text-fg">{who}</p>
      {action}
    </section>
  )
}
