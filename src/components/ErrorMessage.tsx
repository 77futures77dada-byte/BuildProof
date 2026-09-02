interface ErrorMessageProps {
  /** When null/undefined, nothing renders. */
  message?: string | null
  onRetry?: () => void
  className?: string
}

/** Inline error banner for forms and data-fetching screens. */
export function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 ${className}`}
    >
      <span>{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-medium text-red-900 underline underline-offset-2 hover:no-underline"
        >
          Повторить
        </button>
      ) : null}
    </div>
  )
}
