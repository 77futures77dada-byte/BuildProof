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
    <span className="inline-flex shrink-0 items-center rounded-chip border border-stale px-2 text-body font-medium text-fg">
      {t('issues.urgent')}
    </span>
  )
}
