import { Link, Navigate, Outlet, useMatch, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../hooks/useProject'
import type { UserRole } from '../types'
import { AppHeader } from './AppHeader'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { Skeleton, Tabs, buttonClass } from './ui'
import type { TabItem } from './ui'

interface Tab {
  to: string
  labelKey: string
  end: boolean
}

const MANAGER_TABS: Tab[] = [
  { to: '', labelKey: 'nav.overview', end: true },
  { to: 'stages', labelKey: 'nav.stages', end: false },
  { to: 'photos', labelKey: 'nav.photos', end: false },
  { to: 'tasks', labelKey: 'nav.tasks', end: false },
  { to: 'issues', labelKey: 'nav.issues', end: false },
]

// «Люди» keeps the /settings route (brief §2.3 В2); gc only.
const PEOPLE_TAB: Tab = { to: 'settings', labelKey: 'nav.people', end: false }

// Workers get a short, action-first strip: their day, then where they report.
const WORKER_TABS: Tab[] = [
  { to: 'today', labelKey: 'nav.today', end: false },
  { to: 'stages', labelKey: 'nav.stages', end: false },
  { to: 'photos', labelKey: 'nav.photos', end: false },
  { to: 'issues', labelKey: 'nav.issues', end: false },
]

function tabsFor(role: UserRole | undefined): Tab[] {
  if (role === 'worker') return WORKER_TABS
  if (role === 'gc') return [...MANAGER_TABS, PEOPLE_TAB]
  return MANAGER_TABS
}

/**
 * 03 §2.2 `shell-project`: header, project name + status chip (if not active),
 * address, tabs by role. Tabs show while the project loads.
 */
export function ProjectLayout() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { project, loading, error } = useProject(id)
  const { t } = useTranslation()
  const onPeople = useMatch('/project/:id/settings') !== null

  const role = profile?.role
  // Only the owner ever reaches «Люди» (03 §1): a direct visit goes to the overview.
  if (onPeople && profile && role !== 'gc') return <Navigate to={`/project/${id}`} replace />

  const isWorker = role === 'worker'
  const items: TabItem[] = tabsFor(role).map((tab) => ({
    key: tab.to || 'overview',
    label: t(tab.labelKey),
    to: tab.to ? `/project/${id}/${tab.to}` : `/project/${id}`,
    end: tab.end,
  }))

  return (
    <div className="min-h-screen bg-page text-fg">
      <AppHeader>
        <div className="mx-auto flex max-w-[1120px] flex-col gap-1 px-4 pt-2 pb-3">
          {project ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="m-0 min-w-0 text-h1 font-semibold [overflow-wrap:anywhere]">{project.name}</h1>
                {project.status !== 'active' ? <ProjectStatusBadge status={project.status} /> : null}
              </div>
              {project.address ? <p className="m-0 text-body [overflow-wrap:anywhere]">{project.address}</p> : null}
            </>
          ) : loading ? (
            <Skeleton variant="header" />
          ) : null}
        </div>
        <div className="mx-auto max-w-[1120px] px-2">
          <Tabs items={items} label={project?.name ?? t('nav.overview')} variant={isWorker ? 'worker' : 'owner'} className="border-b-0" />
        </div>
      </AppHeader>
      <main className="mx-auto max-w-[1120px] px-4 py-6">
        {!loading && error ? (
          <section role="alert" className="flex flex-col items-start gap-3 rounded-card border-2 border-stale bg-page p-5">
            <p className="m-0 text-field font-medium">{t('overview.loadFailed')}</p>
            <Link to="/dashboard" className={buttonClass({ variant: 'secondary' })}>{t('tariff.toProjects')}</Link>
          </section>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}
