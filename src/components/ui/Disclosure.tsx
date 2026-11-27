import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from './cx'

interface DisclosureProps {
  /** Button word, e.g. «Вся история». */
  label: ReactNode
  /** Shown instead of `label` while open (optional). */
  openLabel?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

/** «Вся история» / «Показать дом» toggle: a 48 px button + region (03 §9 `Disclosure`). */
export function Disclosure({ label, openLabel, children, defaultOpen = false, className }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-12 items-center gap-2 self-start rounded-control px-1 text-field font-semibold text-fg underline underline-offset-4 hover:no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" className={cx('shrink-0 transition-transform motion-reduce:transition-none', open && 'rotate-90')}>
          <path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {open && openLabel ? openLabel : label}
      </button>
      <div id={id} hidden={!open}>{open ? children : null}</div>
    </div>
  )
}
