import { useState } from 'react'
import type { IssueItem } from '../hooks/useIssues'
import { ISSUE_PRIORITY_LABELS, ISSUE_STATUS_LABELS } from '../types'
import type { IssuePriority, IssueStatus } from '../types'
import { formatDate, toErrorMessage } from '../lib/format'
import { Button } from './Button'
import { ErrorMessage } from './ErrorMessage'
import { Modal } from './Modal'

interface IssueCardProps {
  issue: IssueItem
  canManage: boolean
  onUpdateStatus: (id: string, status: IssueStatus) => Promise<void>
}

const PRIORITY_BADGE: Record<IssuePriority, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-slate-100 text-slate-600',
}

const STATUS_BADGE: Record<IssueStatus, string> = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-sky-100 text-sky-800',
  resolved: 'bg-green-100 text-green-800',
}

const NEXT_STATUS: Partial<Record<IssueStatus, { status: IssueStatus; label: string }>> = {
  open: { status: 'in_progress', label: 'В работу' },
  in_progress: { status: 'resolved', label: 'Решено' },
}

export function IssueCard({ issue, canManage, onUpdateStatus }: IssueCardProps) {
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
    <li className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-slate-900">{issue.title}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[issue.priority]}`}
        >
          {ISSUE_PRIORITY_LABELS[issue.priority]}
        </span>
      </div>

      {issue.photoUrl ? (
        <button type="button" onClick={() => setZoom(true)} className="block">
          <img
            src={issue.photoUrl}
            alt={issue.title}
            loading="lazy"
            className="max-h-48 w-auto max-w-full rounded-lg object-contain"
          />
        </button>
      ) : null}

      {issue.description ? (
        <p className="whitespace-pre-line text-sm text-slate-700">{issue.description}</p>
      ) : null}

      <p className="text-xs text-slate-500">
        Ответственный: {issue.responsibleParty ?? '—'} · Срок: {formatDate(issue.dueDate)}
      </p>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[issue.status]}`}
        >
          {ISSUE_STATUS_LABELS[issue.status]}
        </span>
        {canManage && next ? (
          <Button loading={busy} onClick={() => void advance()}>
            {next.label}
          </Button>
        ) : null}
      </div>

      <ErrorMessage message={error} />

      <Modal open={zoom} onClose={() => setZoom(false)} label={issue.title}>
        {issue.photoUrl ? (
          <img
            src={issue.photoUrl}
            alt={issue.title}
            className="mx-auto max-h-[85vh] w-auto rounded-lg bg-black object-contain"
          />
        ) : null}
      </Modal>
    </li>
  )
}
