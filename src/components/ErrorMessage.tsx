import { useTranslation } from 'react-i18next'
import { StatusIcon } from './ui/StatusIcon'
interface ErrorMessageProps {
  /** When null/undefined, nothing renders. */
  message?: string | null
  onRetry?: () => void
  className?: string
}

/** Inline error banner for forms and data-fetching screens. */
export function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
  const { t } = useTranslation()
  if (!message) return null
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-start justify-between gap-3 rounded-control border-2 border-stale bg-page px-3 py-2 text-body font-medium text-fg ${className}`}
    >
      <span className="flex items-start gap-2"><StatusIcon kind="error" className="mt-0.5" /><span>{message}</span></span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-12 shrink-0 items-center font-medium text-fg underline underline-offset-4 hover:no-underline"
        >
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  )
}
