import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../hooks/useProject'
import { ROLE_LABELS } from '../types'
import type { UserRole } from '../types'
import { Button } from './Button'
import { ProjectStatusBadge } from './ProjectStatusBadge'

interface Tab {
  to: string
  label: string
  end: boolean
}

const MANAGER_TABS: Tab[] = [
  { to: '', label: 'Обзор', end: true },
  { to: 'stages', label: 'Этапы', end: false },
  { to: 'photos', label: 'Фото', end: false },
  { to: 'tasks', label: 'Задачи', end: false },
  { to: 'issues', label: 'Проблемы', end: false },
]

const SETTINGS_TAB: Tab = { to: 'settings', label: 'Настройки', end: false }

// Workers get a short, action-first strip: their day, then where they report.
const WORKER_TABS: Tab[] = [
  { to: 'today', label: 'Сегодня', end: false },
  { to: 'stages', label: 'Этапы', end: false },
  { to: 'photos', label: 'Фото', end: false },
  { to: 'issues', label: 'Проблемы', end: false },
]

function tabsFor(role: UserRole | undefined): Tab[] {
  if (role === 'worker') return WORKER_TABS
  if (role === 'gc') return [...MANAGER_TABS, SETTINGS_TAB]
  return MANAGER_TABS
}

/**
 * Chrome shared by every /project/:id/* screen: top bar + a horizontally
 * scrollable tab strip (foremen and workers open these on a phone).
 */
export function ProjectLayout() {
  const { id } = useParams<{ id: string }>()
  const { profile, user, signOut } = useAuth()
  const { project } = useProject(id)

  const isWorker = profile?.role === 'worker'
  const tabs = tabsFor(profile?.role)

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/dashboard" className="text-sm font-semibold text-slate-900">
            BuildProof
          </NavLink>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              {profile?.full_name ?? user?.email}
              {profile ? ` · ${ROLE_LABELS[profile.role]}` : ''}
            </span>
            <Button variant="ghost" onClick={() => void signOut()}>
              Выйти
            </Button>
          </div>
        </div>
        {project ? (
          <div className="mx-auto max-w-5xl px-4 pb-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-lg font-semibold text-slate-900">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            {project.address ? (
              <p className="text-sm text-slate-500">{project.address}</p>
            ) : null}
          </div>
        ) : null}
        <nav className="mx-auto max-w-5xl overflow-x-auto px-2">
          <ul className={`flex gap-1 pb-px ${isWorker ? '' : 'min-w-max'}`}>
            {tabs.map((tab) => (
              <li key={tab.to || 'overview'} className={isWorker ? 'flex-1' : undefined}>
                <NavLink
                  to={tab.to ? `/project/${id}/${tab.to}` : `/project/${id}`}
                  end={tab.end}
                  className={({ isActive }) =>
                    `whitespace-nowrap border-b-2 px-3 ${
                      isWorker ? 'block py-3 text-center text-base' : 'inline-block py-2 text-sm'
                    } ${
                      isActive
                        ? 'border-sky-600 font-medium text-sky-700'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
