import { useTranslation } from 'react-i18next'
import type { IssuePriority } from '../types'

/**
 * Issue cards speak the form's language: «Срочно» for `high`, no label
 * otherwise (`medium`, and legacy `low`). See issueBorder for the matching edge.
 */
export function UrgentBadge({ priority }: { priority: IssuePriority }) {
  const { t } = useTranslation()
  if (priority !== 'high') return null
  return (
    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
      {t('issues.urgent')}
    </span>
  )
}
