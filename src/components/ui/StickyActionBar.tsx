import type { ReactNode } from 'react'
import { cx } from './cx'

/**
 * Bottom bar for the one main action (02-type §6.1: main button lives here, so
 * a late webfont never moves it). Sticky, respects the iPhone home indicator.
 */
export function StickyActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-action-bar=""
      className={cx(
        'action-bar sticky bottom-0 z-[var(--z-sticky)] -mx-4 flex flex-col gap-3 border-t-2 border-line bg-page px-4 pt-3',
        'pb-[calc(12px+env(safe-area-inset-bottom,0px))]',
        className,
      )}
    >
      {children}
    </div>
  )
}
