import { cx } from './cx'

interface ProgressBarProps {
  /** 0..100; values outside the range are clamped. */
  value: number
  /** Optional second mark «с учётом ждущих проверки» (k15-on), 0..100. */
  withPending?: number
  thickness?: 'thin' | 'thick'
  /** Accessible name, e.g. the stage name. */
  label?: string
  className?: string
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

/** Readiness bar on tokens: `--fg` fill on a `--line` track. */
export function ProgressBar({ value, withPending, thickness = 'thin', label, className }: ProgressBarProps) {
  const pct = clamp(value)
  const pending = withPending === undefined ? undefined : clamp(withPending)
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cx('relative w-full overflow-hidden rounded-full bg-line', thickness === 'thick' ? 'h-3' : 'h-2', className)}
    >
      {pending !== undefined && pending > pct ? (
        <div aria-hidden="true" className="absolute inset-y-0 left-0 rounded-full bg-muted-strong opacity-50" style={{ width: `${pending}%` }} />
      ) : null}
      <div
        className="relative h-full rounded-full bg-fg transition-[width] duration-300 motion-reduce:transition-none"
        // a visible sliver for any non-zero progress; only a true 0% is empty
        style={{ width: `${pct}%`, minWidth: pct > 0 ? '3px' : undefined }}
      />
    </div>
  )
}
