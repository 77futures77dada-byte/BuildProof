import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { portalTarget } from './theme'
import { cx } from './cx'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  /** Sticky footer (the sheet's main action); stays visible above the keyboard. */
  footer?: ReactNode
  /**
   * `busy-locked`: Esc, backdrop and «Закрыть» do nothing (first 3 s of sending, 03 §6.2).
   * `busy-closable`: working, but may be closed.
   */
  busy?: 'busy-locked' | 'busy-closable'
  /** Label of the close button (default `common.close`), e.g. `report.closeSending` in busy-closable. */
  closeLabel?: ReactNode
  /**
   * Write a browser-history entry while open, so the system «Back» closes the
   * sheet (03 §1). Back during `busy-locked` is ignored, like «Закрыть».
   */
  history?: boolean
  /** Stable hook for DOM checks, rendered as `data-sheet` on the dialog. */
  name?: string
  className?: string
}

// Deferred history.back() per sheet, so a StrictMode remount reuses the entry.
const pendingBack = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Bottom sheet (phone) / centered dialog ≥ 1024 px, max 560 px wide, ≤ 90vh.
 * Portals into the themed root (#bp-root) so it keeps theme + data-zone (03 Ж8).
 * Focus moves in, is trapped, and returns to the opener on close.
 */
export function Sheet({ open, onClose, title, children, footer, busy, closeLabel, history: withHistory, name, className }: SheetProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const locked = busy === 'busy-locked'
  const lockedRef = useRef(locked)
  const closeRef = useRef(onClose)
  useEffect(() => {
    lockedRef.current = locked
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const node = panel.current
    const first = node?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? node)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!lockedRef.current) closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !node) return
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!items.length) { e.preventDefault(); return }
      const [a, z] = [items[0], items[items.length - 1]]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open || !withHistory) return
    const key = `bp-sheet-${titleId}`
    const pending = pendingBack.get(key)
    if (pending) { clearTimeout(pending); pendingBack.delete(key) }
    else window.history.pushState({ ...(window.history.state ?? {}), bpSheet: key }, '')
    let popped = false
    const onPop = () => {
      // a sheet stacked on top of this one went back to our entry
      if (window.history.state?.bpSheet === key) return
      if (lockedRef.current) {
        window.history.pushState({ ...(window.history.state ?? {}), bpSheet: key }, '')
        return
      }
      popped = true
      closeRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (popped || window.history.state?.bpSheet !== key) return
      pendingBack.set(key, setTimeout(() => { pendingBack.delete(key); window.history.back() }, 0))
    }
  }, [open, withHistory, titleId])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[var(--z-sheet)] flex items-end justify-center bg-scrim lg:items-center lg:p-6" onClick={() => { if (!locked) onClose() }}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy ? true : undefined}
        data-sheet={name}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cx(
          'flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-page text-fg shadow-sheet outline-none',
          'lg:max-w-[560px] lg:rounded-sheet',
          className,
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line py-1 pr-3 pl-4">
          <h2 id={titleId} className="m-0 min-w-0 text-h3 font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-control px-3 text-field font-medium text-fg underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-focus disabled:opacity-60"
          >
            {closeLabel ?? t('common.close')}
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
        {footer ? (
          <footer className="border-t border-line bg-page px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">{footer}</footer>
        ) : null}
      </div>
    </div>,
    portalTarget(),
  )
}
