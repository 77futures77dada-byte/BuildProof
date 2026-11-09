import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useAuth } from '../hooks/useAuth'
import { useProjects } from '../hooks/useProjects'
import { isProfileConfigured } from '../lib/profile'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { FullPageSpinner, Spinner } from '../components/Spinner'
import { CreateProjectForm } from '../components/CreateProjectForm'
import { ProjectListCard } from '../components/ProjectListCard'
import { WorkerProjectCard } from '../components/WorkerProjectCard'
import { ProfileNotConfigured } from './ProfileNotConfigured'

export function Dashboard() {
  const { profile, user, loading: authLoading, signOut } = useAuth()
  const { t } = useTranslation()
  const { projects, loading, error, reload } = useProjects()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  if (authLoading) return <FullPageSpinner />

  // ProtectedRoute already enforces this; the guard keeps `profile` narrowed
  // and stays correct if the page is ever rendered outside that gate.
  if (!isProfileConfigured(profile)) return <ProfileNotConfigured />

  const isGc = profile.role === 'gc'
  const isWorker = profile.role === 'worker'

  // Non-GC roles with exactly one accessible project go straight to it —
  // workers to their "Today" screen, so the app opens where they act.
  if (!isGc && !loading && !error && projects.length === 1) {
    const target = `/project/${projects[0].id}${isWorker ? '/today' : ''}`
    return <Navigate to={target} replace />
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-semibold text-slate-900">BuildProof</span>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              {profile.full_name ?? user?.email} · {t(`roles.${profile.role}`)}
            </span>
            {isGc ? (
              <Link to="/tariff" className="text-sm font-medium text-sky-700 underline underline-offset-2">
                {t('tariff.link')}
              </Link>
            ) : null}
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => void signOut()}>
              {t('common.signOut')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">
            {isWorker ? t('dashboard.pickProject') : t('dashboard.title')}
          </h1>
          {isGc && !creating ? (
            <Button onClick={() => setCreating(true)}>{t('dashboard.createProject')}</Button>
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
          <Spinner label={t('dashboard.loading')} />
        ) : projects.length === 0 && !error ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            {isGc
              ? t('dashboard.emptyGc')
              : t('dashboard.emptyOther')}
          </p>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li key={project.id}>
                {isWorker ? (
                  <WorkerProjectCard project={project} />
                ) : (
                  <ProjectListCard project={project} />
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

