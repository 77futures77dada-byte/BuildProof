import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ProgressBar } from './ProgressBar'
import { StatusChip } from './StatusChip'
import type { StatusKind } from './statusKinds'
import { cx } from './cx'

export interface ChipSpec {
  kind: StatusKind
  label: ReactNode
}

interface ProjectCardProps {
  to: string
  name: ReactNode
  /** Address or client line. */
  subtitle?: ReactNode
  /** Accepted + verified readiness, 0..100; omit for roles that do not see it. */
  percent?: number
  /** Word after the figure, e.g. «готово». */
  percentLabel?: ReactNode
  /** Freshness / project status chips (paused, stale, noreports…). */
  chips?: ChipSpec[]
  /** Ready-made chips (e.g. `FreshnessChip`), after `chips`. */
  badges?: ReactNode
  /** One extra line (next step, who is silent…). */
  note?: ReactNode
  /** `row` = table-like line on desktop ≥ 1024 px. */
  layout?: 'card' | 'row'
  /** Skeleton while loading (same size, no jumps). */
  loading?: boolean
  className?: string
}

/** Project in the /dashboard list; the whole card is one link (≥ 48 px). */
export function ProjectCard({ to, name, subtitle, percent, percentLabel, chips, badges, note, layout = 'card', loading, className }: ProjectCardProps) {
  if (loading) {
    return <div aria-hidden="true" className={cx('h-40 animate-pulse rounded-card bg-surface motion-reduce:animate-none', className)} />
  }
  return (
    <Link
      to={to}
      className={cx(
        'group flex min-h-12 flex-col gap-3 rounded-card border border-line bg-surface p-4 text-fg no-underline shadow-card',
        'hover:border-line-strong hover:bg-surface-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus active:border-fg',
        layout === 'row' && 'lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)] lg:items-center',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="m-0 text-h3 font-medium [overflow-wrap:anywhere]">{name}</h3>
        {subtitle ? <p className="m-0 text-body [overflow-wrap:anywhere]">{subtitle}</p> : null}
      </div>
      {percent !== undefined ? (
        <div className="flex flex-col gap-2">
          <p className="m-0 flex items-baseline gap-2">
            <span className="text-figure font-medium">{Math.round(percent)}%</span>
            {percentLabel ? <span className="text-body">{percentLabel}</span> : null}
          </p>
          <ProgressBar value={percent} />
        </div>
      ) : null}
      {chips?.length || badges || note ? (
        <div className="flex flex-col items-start gap-2">
          {chips?.map((c, i) => <StatusChip key={i} kind={c.kind}>{c.label}</StatusChip>)}
          {badges}
          {note ? <p className="m-0 text-body">{note}</p> : null}
        </div>
      ) : null}
    </Link>
  )
}
