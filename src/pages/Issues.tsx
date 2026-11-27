import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useIssues } from '../hooks/useIssues'
import type { IssueItem } from '../hooks/useIssues'
import type { IssuePriority, IssueStatus } from '../types'
import { Button, Disclosure, NetBar, Sheet, SkeletonRows } from '../components/ui'
import { ErrorMessage } from '../components/ErrorMessage'
import { IssueForm } from '../components/IssueForm'
import { IssueCard } from '../components/IssueCard'

// Raise an issue: anyone on site. Move it through statuses: gc/foreman only.
// (RLS matches: issues_insert allows worker, issues_update does not.)
const CREATE_ROLES = new Set(['gc', 'foreman', 'worker'])
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
  const canCreate = profile ? CREATE_ROLES.has(profile.role) : false
  const canManage = profile ? MANAGER_ROLES.has(profile.role) : false

  const { issues, loading, error, reload, updateStatus } = useIssues(id)

  return (
    <IssuesView
      projectId={id ?? ''}
      issues={issues}
      loading={loading}
      error={error}
      reload={reload}
      updateStatus={updateStatus}
      canCreate={canCreate}
      canManage={canManage}
    />
  )
}

export function IssuesView({
  projectId,
  issues,
  loading,
  error,
  reload,
  updateStatus,
  canCreate,
  canManage,
}: {
  projectId: string
  issues: IssueItem[]
  loading: boolean
  error: string | null
  reload: () => void
  updateStatus: (id: string, status: IssueStatus) => Promise<void>
  canCreate: boolean
  canManage: boolean
}) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)

  const active = issues
    .filter((i) => i.status !== 'resolved')
    .sort(byStatusThenPriority)
  const resolved = issues
    .filter((i) => i.status === 'resolved')
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])

  return (
    <section className="flex flex-col gap-4">
      <NetBar />
      <h2 className="m-0 text-h2 font-bold text-fg">{t('issues.title')}</h2>
      {canCreate ? (
        <Button variant="primary" block onClick={() => setShowForm(true)} className="sm:w-auto sm:self-start">{t('issues.create')}</Button>
      ) : null}

      {loading ? (
        <SkeletonRows label={t('issues.loading')} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : issues.length === 0 ? (
        <p className="m-0 rounded-card border-2 border-dashed border-line p-5 text-body font-medium text-fg">
          {canCreate ? t('issues.empty') : t('issues.noActive')}
        </p>
      ) : (
        <>
          {active.length > 0 ? (
            <ul className="m-0 flex flex-col gap-3 p-0">
              {active.map((issue) => (
                <IssueCard key={issue.id} issue={issue} canManage={canManage} onUpdateStatus={updateStatus} />
              ))}
            </ul>
          ) : (
            <p className="m-0 text-body font-medium text-fg">{t('issues.noActive')}</p>
          )}
          {resolved.length > 0 ? (
            <Disclosure label={t('issues.resolved', { count: resolved.length })}>
              <ul className="m-0 flex flex-col gap-3 p-0">
                {resolved.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} canManage={canManage} onUpdateStatus={updateStatus} />
                ))}
              </ul>
            </Disclosure>
          ) : null}
        </>
      )}

      <Sheet open={canCreate && showForm} onClose={() => setShowForm(false)} title={t('issues.formHeading')} history name="issue-form">
        {projectId ? (
          <IssueForm projectId={projectId} onCancel={() => setShowForm(false)} onCreated={() => { setShowForm(false); reload() }} />
        ) : null}
      </Sheet>
    </section>
  )
}
