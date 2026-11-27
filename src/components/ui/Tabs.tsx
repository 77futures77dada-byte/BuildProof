import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cx } from './cx'

export interface TabItem {
  key: string
  label: ReactNode
  to: string
  /** Match the path exactly (index tab). */
  end?: boolean
}

interface TabsProps {
  items: TabItem[]
  /** Accessible name of the strip. */
  label: string
  /** `owner`: scrolls inside the strip; `worker`: tabs stretch to the full width. */
  variant?: 'owner' | 'worker'
  className?: string
}

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    'relative inline-flex min-h-12 shrink-0 items-center justify-center text-body leading-[1.2] whitespace-nowrap text-fg no-underline',
    'focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus',
    // active: 600 + 4 px --fg bar (02-type §6.1); others 500
    isActive
      ? 'font-medium after:absolute after:inset-x-2 after:bottom-0 after:h-1 after:rounded-full after:bg-fg'
      : ' hover:bg-surface',
  )

/** Section navigation (links with aria-current, not ARIA tabs: each tab is a route). */
export function Tabs({ items, label, variant = 'owner', className }: TabsProps) {
  return (
    <nav aria-label={label} className={cx('border-b border-line', className)}>
      <ul className={cx('m-0 flex list-none gap-1 p-0', variant === 'owner' ? 'overflow-x-auto overscroll-x-contain' : '')}>
        {items.map((item) => (
          <li key={item.key} className={variant === 'worker' ? 'flex min-w-0 flex-auto' : 'flex'}>
            <NavLink to={item.to} end={item.end} className={(s) => cx(tabClass(s), variant === 'worker' ? 'flex-auto px-2' : 'px-4')}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
