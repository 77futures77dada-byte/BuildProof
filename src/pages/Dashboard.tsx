import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProjects } from '../hooks/useProjects'
import { PROJECT_STATUS_LABELS, ROLE_LABELS } from '../types'
import type { Project } from '../types'
import { formatDate } from '../lib/format'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { FullPageSpinner, Spinner } from '../components/Spinner'
import { CreateProjectForm } from '../components/CreateProjectForm'

export function Dashboard() {
  const { profile, user, loading: authLoading, signOut } = useAuth()
  const { projects, loading, error, reload } = useProjects()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  if (authLoading) return <FullPageSpinner />

  // A signed-in user with no profile row yet — can't route by role.
  if (!profile) {
    return (
      <CenteredCard>
        <ErrorMessage message="Профиль не найден. Обратитесь к администратору вашей компании." />
        <Button variant="secondary" onClick={() => void signOut()}>
          Выйти
        </Button>
      </CenteredCard>
    )
  }

  const isGc = profile.role === 'gc'

  // Non-GC roles with exactly one accessible project go straight to it.
  if (!isGc && !loading && !error && projects.length === 1) {
    return <Navigate to={`/project/${projects[0].id}`} replace />
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-semibold text-slate-900">BuildProof</span>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              {profile.full_name ?? user?.email} · {ROLE_LABELS[profile.role]}
            </span>
            <Button variant="ghost" onClick={() => void signOut()}>
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Объекты</h1>
          {isGc && !creating ? (
            <Button onClick={() => setCreating(true)}>Создать объект</Button>
          ) : null}
        </div>

        {isGc && creating ? (
          <CreateProjectForm
            companyId={profile.company_id ?? ''}
            onCancel={() => setCreating(false)}
            onCreated={(project: Project) => {
              setCreating(false)
              navigate(`/project/${project.id}`)
            }}
          />
        ) : null}

        <ErrorMessage message={error} onRetry={reload} />

        {loading ? (
          <Spinner label="Загрузка объектов…" />
        ) : projects.length === 0 && !error ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            {isGc
              ? 'Пока нет ни одного объекта. Создайте первый.'
              : 'Вам ещё не выдан доступ ни к одному объекту.'}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/project/${project.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-900">{project.name}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{project.address ?? 'Адрес не указан'}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Дедлайн: {formatDate(project.deadline)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {children}
      </div>
    </div>
  )
}
