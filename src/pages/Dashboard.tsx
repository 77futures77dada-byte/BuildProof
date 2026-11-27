import { useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useProjects } from '../hooks/useProjects'
import type { DashboardProject } from '../hooks/useProjects'
import { isProfileConfigured } from '../lib/profile'
import { isGateOpen, staleness } from '../lib/freshness'
import { AppHeader } from '../components/AppHeader'
import { Button, EmptyState, Skeleton } from '../components/ui'
import { ErrorMessage } from '../components/ErrorMessage'
import { FullPageSpinner } from '../components/Spinner'
import { CreateProjectForm } from '../components/CreateProjectForm'
import { ProjectListCard } from '../components/ProjectListCard'
import { WorkerProjectCard } from '../components/WorkerProjectCard'
import { ProfileNotConfigured } from './ProfileNotConfigured'

/** Active first, worst freshness on top (7+ → 3–6 → 1–2 → today), then paused, then completed (03 §4.1). */
function groupProjects(projects: DashboardProject[]) {
  const byName = (a: DashboardProject, b: DashboardProject) => a.name.localeCompare(b.name)
  const active = projects
    .filter((p) => p.status === 'active')
    .map((p) => ({ p, s: staleness(p) }))
    .sort((a, b) => b.s - a.s || byName(a.p, b.p))
    .map((x) => x.p)
  return {
    active,
    paused: projects.filter((p) => p.status === 'paused').sort(byName),
    completed: projects.filter((p) => p.status === 'completed').sort(byName),
  }
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-h2 font-bold text-fg">{title}</h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">{children}</ul>
    </section>
  )
}

export function Dashboard() {
  const { profile, loading: authLoading, signOut } = useAuth()
  const { t } = useTranslation()
  const { projects, loading, error, reload } = useProjects()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  if (authLoading) return <FullPageSpinner />

  // ProtectedRoute already enforces this; the guard keeps `profile` narrowed
  // and stays correct if the page is ever rendered outside that gate.
  if (!isProfileConfigured(profile)) return <ProfileNotConfigured />

  const role = profile.role
  const isGc = role === 'gc'
  const isWorker = role === 'worker'

  // Non-GC roles with exactly one accessible project go straight to it —
  // workers to their "Today" screen, so the app opens where they act.
  if (!isGc && !loading && !error && projects.length === 1) {
    const target = `/project/${projects[0].id}${isWorker ? '/today' : ''}`
    return <Navigate to={target} replace />
  }

  const gateOpen = isGateOpen()
  const empty = !loading && !error && projects.length === 0
  const groups = groupProjects(projects)

  function emptyBlock() {
    if (isGc) {
      if (creating) return null
      return (
        <EmptyState
          title={t('dashboard.empty.title')}
          text={t('dashboard.empty.step1')}
          who={gateOpen ? t('dashboard.empty.step2Open') : t('dashboard.empty.step2')}
          action={<Button onClick={() => setCreating(true)}>{t('dashboard.empty.action')}</Button>}
        />
      )
    }
    const key = role === 'foreman' ? 'dashboard.emptyForeman' : isWorker ? 'dashboard.emptyWorker' : 'dashboard.emptyClient'
    return (
      <section className="flex flex-col items-start gap-3 rounded-card border-2 border-dashed border-line bg-page p-5">
        <p className="m-0 text-field font-semibold text-fg">{t(key)}</p>
        {role === 'client' ? null : (
          <Button variant="secondary" onClick={() => void signOut()}>{t('common.signOut')}</Button>
        )}
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-page text-fg">
      <AppHeader />
      <main className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 text-h1 font-bold text-fg">
            {isWorker ? t('dashboard.pickProject') : t('dashboard.title')}
          </h1>
          {isGc && !creating && !empty ? (
            <Button variant="secondary" onClick={() => setCreating(true)}>
              {t('dashboard.createProject')}
            </Button>
          ) : null}
        </div>

        {isGc && creating ? (
          <CreateProjectForm
            companyId={profile.company_id ?? ''}
            onCancel={() => setCreating(false)}
            onCreated={(projectId) => {
              setCreating(false)
              navigate(`/project/${projectId}`)
            }}
          />
        ) : null}

        <ErrorMessage message={error} onRetry={reload} />

        {loading ? (
          <div role="status" aria-label={t('dashboard.loading')} className="flex flex-col gap-3">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        ) : empty ? (
          emptyBlock()
        ) : isWorker ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {projects.map((project) => (
              <li key={project.id}><WorkerProjectCard project={project} /></li>
            ))}
          </ul>
        ) : (
          <>
            {groups.active.length ? (
              <Group title={t('dashboard.groupActive')}>
                {groups.active.map((p) => <li key={p.id}><ProjectListCard project={p} /></li>)}
              </Group>
            ) : null}
            {groups.paused.length ? (
              <Group title={t('dashboard.groupPaused')}>
                {groups.paused.map((p) => <li key={p.id}><ProjectListCard project={p} /></li>)}
              </Group>
            ) : null}
            {groups.completed.length ? (
              <Group title={t('dashboard.groupCompleted')}>
                {groups.completed.map((p) => <li key={p.id}><ProjectListCard project={p} /></li>)}
              </Group>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}
