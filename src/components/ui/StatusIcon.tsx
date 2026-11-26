import { useId } from 'react'
import { STATUS_COLOR } from './statusKinds'
import type { StatusKind } from './statusKinds'

export type { StatusKind } from './statusKinds'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Shape({ kind, maskId }: { kind: StatusKind; maskId: string }) {
  switch (kind) {
    case 'accepted':
      return <circle cx="10" cy="10" r="6" fill="currentColor" />
    case 'pending':
      return <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
    case 'noreports':
      return <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3.2 2.3" />
    case 'verified':
      // the tick is cut out of the disc (mask), so the background shows through
      return <>
        <mask id={maskId}>
          <rect width="20" height="20" fill="white" />
          <path d="M5.5 10.3l3 3 6-6.5" {...S} stroke="black" />
        </mask>
        <circle cx="10" cy="10" r="9" fill="currentColor" mask={`url(#${maskId})`} />
      </>
    case 'returned':
      return <path d="M5 5l10 10M15 5L5 15" {...S} strokeWidth="3" />
    case 'sending':
      return <>
        <path d="M3.8 8.5A6.5 6.5 0 0 1 15 5.5M16.2 11.5A6.5 6.5 0 0 1 5 14.5" {...S} />
        <path d="M15.5 2v4h-4M4.5 18v-4h4" {...S} />
      </>
    case 'queued':
      return <>
        <rect x="5.5" y="1.75" width="9" height="16.5" rx="2" {...S} />
        <path d="M10 6v4.5" {...S} />
        <circle cx="10" cy="14" r="1.4" fill="currentColor" />
      </>
    case 'unknown':
      return <>
        <rect x="2.25" y="2.25" width="15.5" height="15.5" rx="3" {...S} />
        <path d="M7.6 7.8a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4" {...S} strokeWidth="2.2" />
        <circle cx="10" cy="14.6" r="1.3" fill="currentColor" />
      </>
    case 'sent':
      return <>
        <path d="M2.5 9.2L17.5 2.5l-4.2 15-3.6-6.2z" {...S} strokeWidth="2.2" />
        <path d="M9.7 11.3L17.5 2.5" {...S} strokeWidth="2.2" />
      </>
    case 'stale':
      return <>
        <path d="M10 2.5l8 14.5H2z" {...S} />
        <path d="M10 8v4" {...S} />
        <circle cx="10" cy="14.6" r="1.2" fill="currentColor" />
      </>
    case 'outdated':
      return <>
        <circle cx="10" cy="10" r="7.5" {...S} />
        <path d="M4.8 15.2L15.2 4.8" {...S} />
      </>
    case 'error':
      return <>
        <path d="M6.7 2h6.6L18 6.7v6.6L13.3 18H6.7L2 13.3V6.7z" {...S} strokeWidth="2.3" />
        <path d="M10 6v5" {...S} />
        <circle cx="10" cy="14" r="1.3" fill="currentColor" />
      </>
    case 'paused':
      return <>
        <rect x="4.5" y="3.5" width="4" height="13" rx="1" fill="currentColor" />
        <rect x="11.5" y="3.5" width="4" height="13" rx="1" fill="currentColor" />
      </>
  }
}

interface StatusIconProps {
  kind: StatusKind
  /** px; 20 by default, 22 inside the unsent banner. */
  size?: number
  className?: string
}

/** Inline SVG status shape (viewBox 20, stroke 2.5). Never alone: put the word next to it. */
export function StatusIcon({ kind, size = 20, className }: StatusIconProps) {
  const maskId = useId()
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-status-icon={kind}
      className={className}
      style={{ color: STATUS_COLOR[kind], flex: 'none' }}
    >
      <Shape kind={kind} maskId={maskId} />
    </svg>
  )
}
