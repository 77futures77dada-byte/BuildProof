import { useTranslation } from 'react-i18next'
interface SpinnerProps {
  /** Accessible label; also shown next to the spinner when `label` is set. */
  label?: string
  className?: string
}

export function Spinner({ label, className = '' }: SpinnerProps) {
  const { t } = useTranslation()
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-slate-500 ${className}`}
    >
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
      />
      {label ? <span className="text-sm">{label}</span> : null}
      <span className="sr-only">{label ?? t('common.loading')}</span>
    </span>
  )
}

/** Full-viewport centered spinner for route-level loading states. */
export function FullPageSpinner({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner label={label ?? t('common.loadingEllipsis')} />
    </div>
  )
}
