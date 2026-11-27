import { cx } from './cx'

const SHAPE = {
  card: 'h-40 rounded-card',
  row: 'h-16 rounded-control',
  tile: 'aspect-square rounded-control',
  header: 'h-10 w-2/3 rounded-control',
} as const

/** Placeholder block in the future size of the content (03 §0.2 `loading`), no jumps. */
export function Skeleton({ variant = 'row', className }: { variant?: keyof typeof SHAPE; className?: string }) {
  return <div aria-hidden="true" className={cx('animate-pulse bg-surface motion-reduce:animate-none', SHAPE[variant], className)} />
}

/** A list loading: `rows` row skeletons in a `role="status"` with a spoken label. */
export function SkeletonRows({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} />)}
    </div>
  )
}
