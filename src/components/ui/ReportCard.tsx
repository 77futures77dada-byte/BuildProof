import type { ReactNode } from 'react'
import { StatusChip } from './StatusChip'
import type { ChipSpec } from './ProjectCard'
import { cx } from './cx'

interface ReportCardProps {
  stage: ReactNode
  /** Percent before → after; the arrow between is SVG, never a text glyph. */
  from?: number
  to: number
  /** Who sent it (name or role word). */
  author?: ReactNode
  /** «отправлено {дата}» — time in 24 h; rendered with tabular figures. */
  sentAt?: ReactNode
  status?: ChipSpec
  /** Reason line, e.g. «Вернули: …» (variant `mine`). */
  reason?: ReactNode
  photoUrl?: string | null
  photoAlt?: string
  /** Opens the photo viewer. */
  onOpenPhoto?: () => void
  /** `feed` overview line, `viewer` caption under a photo, `mine` worker's own report on Today. */
  variant?: 'feed' | 'viewer' | 'mine'
  className?: string
}

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false" className="shrink-0">
      <path d="M3 10h13m-4-4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** One report: photo thumbnail, stage, % change, author, time, status. */
export function ReportCard({ stage, from, to, author, sentAt, status, reason, photoUrl, photoAlt = '', onOpenPhoto, variant = 'feed', className }: ReportCardProps) {
  const thumb = photoUrl ? (
    <img src={photoUrl} alt={photoAlt} loading="lazy" className="size-[72px] shrink-0 rounded-chip bg-surface object-cover" />
  ) : null
  return (
    <article className={cx('flex gap-3 rounded-card border-2 border-line bg-surface p-3 text-fg', variant === 'viewer' && 'border-0 bg-transparent p-0', className)}>
      {thumb && onOpenPhoto ? (
        <button type="button" onClick={onOpenPhoto} className="shrink-0 rounded-chip focus-visible:outline-3 focus-visible:outline-focus">{thumb}</button>
      ) : thumb}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0 text-field font-medium [overflow-wrap:anywhere]">{stage}</p>
        <p className="m-0 flex items-center gap-2 text-field font-medium tabular-nums">
          {from !== undefined ? <><span>{from}%</span><Arrow /></> : null}
          <span>{to}%</span>
        </p>
        {author || sentAt ? (
          <p className="m-0 text-body font-medium">
            {author}
            {author && sentAt ? ' · ' : null}
            {sentAt ? <span className="num-col">{sentAt}</span> : null}
          </p>
        ) : null}
        {status ? <StatusChip kind={status.kind} className="self-start">{status.label}</StatusChip> : null}
        {reason ? <p className="m-0 text-body font-medium">{reason}</p> : null}
      </div>
    </article>
  )
}
