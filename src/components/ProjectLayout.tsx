import { NavLink, Outlet, useMatch, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../hooks/useProject'
import type { UserRole } from '../types'
import { Button } from './Button'
import { ProjectStatusBadge } from './ProjectStatusBadge'

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

const SETTINGS_TAB: Tab = { to: 'settings', labelKey: 'nav.settings', end: false }

// Workers get a short, action-first strip: their day, then where they report.
const WORKER_TABS: Tab[] = [
  { to: 'today', labelKey: 'nav.today', end: false },
  { to: 'stages', labelKey: 'nav.stages', end: false },
  { to: 'photos', labelKey: 'nav.photos', end: false },
  { to: 'issues', labelKey: 'nav.issues', end: false },
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
  const { t } = useTranslation()

  const isWorker = profile?.role === 'worker'
  const tabs = tabsFor(profile?.role)
  // The landing skin's dark theme is switched on only for the overview tab;
  // the other tabs are not redrawn yet and stay light (see app-skin.css).
  const onOverview = useMatch('/project/:id') !== null

  return (
    <div className="bp" data-skin-dark={onOverview ? '' : undefined}>
      <header className="bp-nav">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <NavLink to="/dashboard" className="bp-logo">
            BuildProof
          </NavLink>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-slate-500 lg:inline">
              {profile?.full_name ?? user?.email}
              {profile ? ` · ${t(`roles.${profile.role}`)}` : ''}
            </span>
            <LanguageSwitcher className="bp-lang" />
            <Button variant="ghost" onClick={() => void signOut()} className="px-2">
              {t('common.signOut')}
            </Button>
          </div>
        </div>
        {project ? (
          <div className="mx-auto max-w-5xl px-4 pb-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="bp-title text-slate-900">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            {project.address ? (
              <p className="text-sm text-slate-500">{project.address}</p>
            ) : null}
          </div>
        ) : null}
        <nav className="bp-tabs mx-auto max-w-5xl overflow-x-auto px-2">
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
                  {t(tab.labelKey)}
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
