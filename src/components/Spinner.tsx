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
      className={`inline-flex items-center gap-2 text-fg ${className}`}
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-[3px] border-line border-t-fg motion-reduce:animate-none"
      />
      {label ? <span className="text-body">{label}</span> : null}
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
