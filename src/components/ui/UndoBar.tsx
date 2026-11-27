import type { ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './cx'

interface UndoBarProps {
  /** Pending confirmations in the current window; the bar hides at 0. */
  count: number
  /** «Отменить все (N)» — `review.undoN` with the same count. */
  label: ReactNode
  onUndo: () => void
  /** Optional line above the button, e.g. time left. */
  note?: ReactNode
  className?: string
}

/**
 * One sticky bar at the top of the review queue: a single «Отменить все (N)»
 * button for every confirmation still inside its 7 s window (01 §2.1б п.6).
 */
export function UndoBar({ count, label, onUndo, note, className }: UndoBarProps) {
  if (count <= 0) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'sticky top-0 z-[var(--z-undo)] -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-page px-4 py-3',
        className,
      )}
    >
      {note ? <p className="m-0 text-body font-medium text-fg">{note}</p> : null}
      <Button variant="secondary" onClick={onUndo} className="ml-auto">{label}</Button>
    </div>
  )
}
