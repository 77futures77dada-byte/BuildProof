import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from './cx'

interface DisclosureProps {
  /** Button text («Вся история», «Выполненные (N)», «История изменений» …). */
  label: ReactNode
  /** Shown instead of `label` while open (optional). */
  openLabel?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  /** Fires on every toggle (e.g. lazy loading). */
  onToggle?: (open: boolean) => void
  className?: string
}

/** Show / hide block (03 §9): button ≥ 48 px with an SVG chevron, `aria-expanded`. */
export function Disclosure({ label, openLabel, children, defaultOpen = false, onToggle, className }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => { setOpen(!open); onToggle?.(!open) }}
        className="inline-flex min-h-12 items-center gap-2 self-start rounded-control px-3 text-field font-semibold text-fg hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className={cx('size-5 shrink-0 transition-transform motion-reduce:transition-none', open && 'rotate-90')} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        {open && openLabel ? openLabel : label}
      </button>
      <div id={id} hidden={!open}>{open ? children : null}</div>
    </div>
  )
}
