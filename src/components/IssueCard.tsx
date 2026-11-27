import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { IssueItem } from '../hooks/useIssues'
import type { IssueStatus } from '../types'
import { issueBorder } from '../lib/issues'
import { formatDate, toErrorMessage } from '../lib/format'
import { Button, PhotoViewer, cx } from './ui'
import { UrgentBadge } from './UrgentBadge'
import { ErrorMessage } from './ErrorMessage'

interface IssueCardProps {
  issue: IssueItem
  canManage: boolean
  onUpdateStatus: (id: string, status: IssueStatus) => Promise<void>
}

const NEXT_STATUS: Partial<Record<IssueStatus, { status: IssueStatus; labelKey: string }>> = {
  open: { status: 'in_progress', labelKey: 'issues.toInProgress' },
  in_progress: { status: 'resolved', labelKey: 'issues.toResolved' },
}

/** Issue card (03 §5.6): title · urgency word · photo (zoom) · who · due · status · next status (gc/foreman). */
export function IssueCard({ issue, canManage, onUpdateStatus }: IssueCardProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(false)
  const next = NEXT_STATUS[issue.status]

  async function advance() {
    if (!next) return
    setBusy(true)
    setError(null)
    try {
      await onUpdateStatus(issue.id, next.status)
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className={cx('flex list-none flex-col gap-3 rounded-card border border-l-4 border-line bg-page p-4', issueBorder(issue.priority))}>
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 min-w-0 text-field font-medium text-fg [overflow-wrap:anywhere]">{issue.title}</p>
        <UrgentBadge priority={issue.priority} />
      </div>

      {issue.photoUrl ? (
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label={`${t('photos.viewer')}: ${issue.title}`}
          className="block self-start overflow-hidden rounded-control focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <img src={issue.photoUrl} alt="" loading="lazy" className="block max-h-48 w-auto max-w-full object-contain" />
        </button>
      ) : null}

      {issue.description ? <p className="m-0 whitespace-pre-line text-body text-fg">{issue.description}</p> : null}

      <p className="m-0 text-body text-fg">
        {t('issues.responsibleDue', { who: issue.responsibleParty ?? t('common.notSet'), date: formatDate(issue.dueDate) })}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex min-h-8 items-center rounded-chip bg-surface px-3 text-body font-medium text-fg">
          {t(`issueStatus.${issue.status}`)}
        </span>
        {canManage && next ? (
          <Button variant="secondary" loading={busy} onClick={() => void advance()}>{t(next.labelKey)}</Button>
        ) : null}
      </div>

      <ErrorMessage message={error} />

      <PhotoViewer
        open={zoom}
        onClose={() => setZoom(false)}
        title={issue.title}
        src={issue.photoUrl}
        alt={issue.title}
        failedLabel={t('photos.imageFailed')}
      />
    </li>
  )
}
