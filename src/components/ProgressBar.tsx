interface ProgressBarProps {
  /** 0..100; values outside the range are clamped. */
  value: number
  className?: string
}

export function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}
    >
      <div
        className="h-full rounded-full bg-sky-600 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
