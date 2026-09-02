import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useIssues } from '../hooks/useIssues'
import type { IssueItem } from '../hooks/useIssues'
import type { IssuePriority, IssueStatus } from '../types'
import { Button } from '../components/Button'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { IssueForm } from '../components/IssueForm'
import { IssueCard } from '../components/IssueCard'

const MANAGER_ROLES = new Set(['gc', 'foreman'])

const PRIORITY_RANK: Record<IssuePriority, number> = { high: 0, medium: 1, low: 2 }
const ACTIVE_STATUS_RANK: Record<IssueStatus, number> = {
  open: 0,
  in_progress: 1,
  resolved: 2,
}

function byStatusThenPriority(a: IssueItem, b: IssueItem): number {
  const s = ACTIVE_STATUS_RANK[a.status] - ACTIVE_STATUS_RANK[b.status]
  return s !== 0 ? s : PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
}

export function Issues() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const canManage = profile ? MANAGER_ROLES.has(profile.role) : false

  const { issues, loading, error, reload, updateStatus } = useIssues(id)
  const [showForm, setShowForm] = useState(false)
  const [resolvedOpen, setResolvedOpen] = useState(false)

  const active = issues
    .filter((i) => i.status !== 'resolved')
    .sort(byStatusThenPriority)
  const resolved = issues
    .filter((i) => i.status === 'resolved')
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Проблемы</h2>
        {canManage && !showForm ? (
          <Button onClick={() => setShowForm(true)}>Создать замечание</Button>
        ) : null}
      </div>

      {canManage && showForm && id ? (
        <IssueForm
          projectId={id}
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false)
            reload()
          }}
        />
      ) : null}

      {loading ? (
        <Spinner label="Загрузка замечаний…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : issues.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Замечаний по объекту пока нет.
        </p>
      ) : (
        <>
          {active.length > 0 ? (
            <ul className="space-y-3">
              {active.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  canManage={canManage}
                  onUpdateStatus={updateStatus}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Активных замечаний нет.</p>
          )}

          {resolved.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setResolvedOpen((v) => !v)}
                aria-expanded={resolvedOpen}
                className="flex w-full items-center gap-1 px-4 py-3 text-sm font-medium text-slate-600"
              >
                <span aria-hidden="true">{resolvedOpen ? '▾' : '▸'}</span>
                Решённые ({resolved.length})
              </button>
              {resolvedOpen ? (
                <ul className="space-y-3 border-t border-slate-100 p-3">
                  {resolved.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      canManage={canManage}
                      onUpdateStatus={updateStatus}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
